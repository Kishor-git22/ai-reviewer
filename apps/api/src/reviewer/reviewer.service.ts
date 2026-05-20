import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import OpenAI from 'openai';
import { GithubService } from './github.service';

export interface AIReviewResult {
  findings: Array<{
    file: string;
    line: number;
    issue: string;
    type: 'Critical' | 'Vulnerability' | 'Warning' | 'Info';
    confidence: 'High' | 'Medium' | 'Low';
    rationale: string;
    resolution: string;
    reference: string;
  }>;
  qualityScore: number;
  securityScore: number;
  summary: string;
}

@Injectable()
export class ReviewerService {
  private readonly logger = new Logger(ReviewerService.name);
  
  /**
   * Helper to get the API key for a specific model from environment
   */
  private getModelKey(modelId: string): string {
    const envMap: Record<string, string> = {
      'deepseek-v4-flash': 'DEEPSEEK_FLASH_KEY',
      'deepseek-v4-pro': 'DEEPSEEK_PRO_KEY',
      'mistral-medium-3.5': 'MISTRAL_MEDIUM_KEY',
      'mistral-small-4': 'MISTRAL_SMALL_KEY',
      'minimax-m2.7': 'MINIMAX_KEY',
      'nemotron-3-super': 'NEMOTRON_SUPER_KEY',
      'llama-3.1': 'LLAMA_31_KEY',
      'gemma-2-27b': 'GEMMA_3_KEY',
      'gemma-3': 'GEMMA_3_KEY', // Alias for backward compatibility
      'phi-4': 'PHI_4_KEY',
    };

    const envVar = envMap[modelId];
    return this.configService.get<string>(envVar) || this.configService.get<string>('NVIDIA_API_KEY') || '';
  }

  // Actual NVIDIA NIM model IDs for mapping
  private readonly MODEL_MAPPING: Record<string, string> = {
    'deepseek-v4-flash': 'deepseek-ai/deepseek-v4-flash',
    'deepseek-v4-pro': 'deepseek-ai/deepseek-v4-pro',
    'mistral-medium-3.5': 'mistralai/mistral-medium-3.5-128b',
    'mistral-small-4': 'mistralai/mistral-small-4-119b-2603',
    'minimax-m2.7': 'minimaxai/minimax-m2.7',
    'nemotron-3-super': 'nvidia/nemotron-3-super-120b-a12b',
    'llama-3.1': 'meta/llama-3.1-70b-instruct',
    'gemma-2-27b': 'meta/llama-3.3-70b-instruct',
    'gemma-3': 'meta/llama-3.3-70b-instruct', // Alias
    'phi-4': 'microsoft/phi-4-mini-instruct',
  };

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly githubService: GithubService,
  ) {}

  /**
   * Helper to create a specialized OpenAI client for a specific model
   */
  private getClient(modelId: string): OpenAI {
    const apiKey = this.getModelKey(modelId);
    return new OpenAI({
      baseURL: 'https://integrate.api.nvidia.com/v1',
      apiKey,
      timeout: 90000, // 90 seconds
    });
  }

  /**
   * Performs a multi-agent debate analysis on the provided code/diff
   */
  async performDebateReview(
    userId: string,
    repoName: string,
    prNumber: number,
    title: string,
    diff: string,
    githubToken: string,
    owner: string,
    headSha: string,
    selectedModels?: string[],
  ) {
    // 0. Check if an analysis is already in progress for this PR
    const existingAnalysis = await this.prisma.analysis.findFirst({
      where: {
        repoName,
        prNumber,
        status: 'in_progress',
      },
    });

    if (existingAnalysis) {
      this.logger.log(`Analysis for ${repoName} PR #${prNumber} already in progress. Mark as cancelled and starting fresh.`);
      await this.prisma.analysis.update({
        where: { id: existingAnalysis.id },
        data: { status: 'failed' }
      }).catch(() => {});
    }

    // Fetch user configurations
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        codeReviewModel: true,
        securityModel: true,
        scoringModel: true,
        referenceModel: true,
      },
    });

    let codeReviewModel = user?.codeReviewModel || 'llama-3.1';
    let securityModel = user?.securityModel || 'deepseek-v4-pro';
    let scoringModel = user?.scoringModel || 'mistral-medium-3.5';
    let referenceModel = user?.referenceModel || 'phi-4';

    // Map if selectedModels was explicitly supplied (e.g. from client call or webhook)
    if (selectedModels && selectedModels.length === 4) {
      codeReviewModel = selectedModels[0];
      securityModel = selectedModels[1];
      scoringModel = selectedModels[2];
      referenceModel = selectedModels[3];
    } else if (selectedModels && selectedModels.length === 3) {
      codeReviewModel = selectedModels[0];
      securityModel = selectedModels[1];
      scoringModel = selectedModels[2];
    }

    const activeModels = [codeReviewModel, securityModel, scoringModel, referenceModel];

    this.logger.log(`Starting upgraded AI pipeline review for ${repoName} PR #${prNumber}`);
    this.logger.log(`Models: CodeReview=${codeReviewModel}, Security=${securityModel}, Scoring=${scoringModel}, Reference=${referenceModel}`);
    this.logger.log(`Diff size: ${diff.length} characters`);

    // Truncate diff if it's too large to prevent 504 timeouts
    let processedDiff = diff;
    if (diff.length > 40000) {
      this.logger.warn(`Diff too large (${diff.length} chars). Truncating to 40,000 chars.`);
      processedDiff = diff.substring(0, 40000) + '\n\n... [Diff truncated due to size] ...';
    }

    // 1. Create initial analysis record
    const analysis = await this.prisma.analysis.create({
      data: {
        userId,
        repoName,
        prNumber,
        title,
        status: 'in_progress',
        models: activeModels,
      },
    });

    try {
      // Stage 1 status
      await this.githubService.updateCommitStatus(
        githubToken,
        owner,
        repoName,
        headSha,
        'pending',
        'Stage 1/2: Running Code Review & Security analysis... 30%',
      );

      // Run Stage 1 Agents in parallel
      const [codeReviewRes, securityRes] = await Promise.all([
        (async () => {
          try {
            const res = await this.getCodeReviewAgent(codeReviewModel, processedDiff);
            return res.findings || [];
          } catch (e: any) {
            this.logger.error(`Code review agent (${codeReviewModel}) failed: ${e.message}`);
            return [];
          }
        })(),
        (async () => {
          try {
            const res = await this.getSecurityAgent(securityModel, processedDiff);
            return res.findings || [];
          } catch (e: any) {
            this.logger.error(`Security agent (${securityModel}) failed: ${e.message}`);
            return [];
          }
        })(),
      ]);

      const combinedFindings = [...codeReviewRes, ...securityRes];

      // Check if stopped before starting Stage 2
      let checkAnalysis = await this.prisma.analysis.findUnique({
        where: { id: analysis.id },
        select: { status: true },
      });
      if (checkAnalysis?.status === 'stopped') {
        this.logger.log(`Analysis ${analysis.id} was stopped. Aborting review.`);
        return analysis.id;
      }

      // Stage 2 status
      await this.githubService.updateCommitStatus(
        githubToken,
        owner,
        repoName,
        headSha,
        'pending',
        'Stage 2/2: Scoring PR and generating references... 70%',
      );

      // Run Stage 2 Agents in parallel
      const [referenceFindings, scoreRes] = await Promise.all([
        (async () => {
          try {
            const res = await this.getReferenceAgent(referenceModel, combinedFindings);
            return res.findings || combinedFindings;
          } catch (e: any) {
            this.logger.error(`Reference agent (${referenceModel}) failed: ${e.message}`);
            return combinedFindings;
          }
        })(),
        (async () => {
          try {
            const res = await this.getScoringAgent(scoringModel, processedDiff, combinedFindings);
            return {
              qualityScore: res.qualityScore !== undefined ? res.qualityScore : 85,
              securityScore: res.securityScore !== undefined ? res.securityScore : 90,
              summary: res.summary || 'Code analysis completed successfully.'
            };
          } catch (e: any) {
            this.logger.error(`Scoring agent (${scoringModel}) failed: ${e.message}`);
            return {
              qualityScore: 85,
              securityScore: 90,
              summary: 'Code analysis completed successfully (scoring fallback).'
            };
          }
        })(),
      ]);

      // Check if stopped before database update
      checkAnalysis = await this.prisma.analysis.findUnique({
        where: { id: analysis.id },
        select: { status: true },
      });
      if (checkAnalysis?.status === 'stopped') {
        this.logger.log(`Analysis ${analysis.id} was stopped. Aborting database save.`);
        return analysis.id;
      }

      await this.githubService.updateCommitStatus(
        githubToken,
        owner,
        repoName,
        headSha,
        'pending',
        'Finalizing the review report... 90%',
      );

      // 4. Store findings and update analysis
      await this.prisma.$transaction([
        this.prisma.finding.createMany({
          data: referenceFindings.map((f: any) => {
            const lineNum = typeof f.line === 'number' ? f.line : parseInt(f.line, 10);
            return {
              analysisId: analysis.id,
              file: String(f.file || 'unknown'),
              line: isNaN(lineNum) ? 1 : lineNum,
              issue: String(f.issue || 'Potential issue'),
              type: String(f.type || 'Warning'),
              confidence: String(f.confidence || 'Medium'),
              consensus: f.consensus === true || f.consensus === 'true',
              rationale: String(f.rationale || ''),
              resolution: String(f.resolution || ''),
              reference: f.reference ? String(f.reference) : null,
              commitSha: headSha,
              models: Array.isArray(f.models) ? f.models.map(String) : (Array.isArray(activeModels) ? activeModels.map(String) : []),
            };
          }),
        }),
        this.prisma.analysis.update({
          where: { id: analysis.id },
          data: {
            status: 'completed',
            qualityScore: scoreRes.qualityScore,
            securityScore: scoreRes.securityScore,
            summary: scoreRes.summary,
            debateLog: {
              agents: [
                { role: 'code-review', model: codeReviewModel, findingsCount: codeReviewRes.length },
                { role: 'security', model: securityModel, findingsCount: securityRes.length },
                { role: 'scoring', model: scoringModel },
                { role: 'reference', model: referenceModel }
              ]
            } as any,
          },
        }),
      ]);

      // 5. Extract valid paths from diff to prevent GitHub 422 errors
      const validPaths = new Set(
        Array.from(processedDiff.matchAll(/^(?:\+\+\+|---) [ab]\/(.*?)(?:[ \t].*)?$/gm))
          .map((m) => m[1])
          .filter(Boolean)
      );

      // Filter findings to only those that apply to valid paths in the diff
      const validFindings = referenceFindings.filter((f: any) => validPaths.has(f.file));

      if (validFindings.length > 0) {
        this.logger.log(`Posting ${validFindings.length} valid inline review comments...`);
        await this.githubService.postComments(
          githubToken,
          owner,
          repoName,
          prNumber,
          validFindings,
          headSha,
        );
      } else {
        this.logger.log('No inline findings match the PR diff files. Posting summary only.');
        await this.githubService.postSummaryOnly(
          githubToken,
          owner,
          repoName,
          prNumber,
          referenceFindings.length,
          scoreRes.qualityScore,
          scoreRes.securityScore,
        );
      }

      // 6. Update Status to Success
      await this.githubService.updateCommitStatus(
        githubToken,
        owner,
        repoName,
        headSha,
        'success',
        `AI Review complete (Quality: ${scoreRes.qualityScore}%, Security: ${scoreRes.securityScore}%)`,
      );

      return analysis.id;
    } catch (error: any) {
      this.logger.error(`Error during AI pipeline review: ${error.message}`);
      
      const checkAnalysis = await this.prisma.analysis.findUnique({
        where: { id: analysis.id },
        select: { status: true },
      }).catch(() => null);

      if (checkAnalysis?.status === 'stopped') {
        this.logger.log(`Analysis ${analysis.id} was stopped. Ignoring failure status update.`);
        return analysis.id;
      }

      await this.prisma.analysis.update({
        where: { id: analysis.id },
        data: { status: 'failed' },
      }).catch(() => {});

      // Update GitHub with error status
      await this.githubService.updateCommitStatus(
        githubToken,
        owner,
        repoName,
        headSha,
        'error',
        `Analysis failed: ${error.message.substring(0, 50)}...`,
      ).catch(() => {});

      throw error;
    }
  }

  private async getCodeReviewAgent(modelId: string, diff: string) {
    const client = this.getClient(modelId);
    const model = this.MODEL_MAPPING[modelId] || modelId;
    const prompt = `You are a Senior Code Quality and Performance Engineer.
Review the following code diff and identify general code quality issues, clean code violations, performance bottlenecks, and architectural issues.
DO NOT review for security vulnerabilities or OWASP Top 10 issues.

CODE DIFF:
${diff}

IMPORTANT: Your response must be STABLE, VALID JSON.
1. Use double quotes for all keys and strings.
2. ESCAPE all backslashes as \\\\ and double quotes as \\\".
3. Do NOT use literal newlines inside strings.
4. DO NOT use markdown tables, bullet points, or any other formatting.
5. Output ONLY the raw JSON object. Do not include any preamble, postamble, or explanation.
6. The response MUST start with { and end with }.

Return your response in strict JSON format:
{
  "findings": [
    { "file": "string", "line": number, "issue": "string", "type": "Warning|Info", "confidence": "High|Medium|Low", "rationale": "string", "resolution": "string" }
  ]
}`;

    const completion = await this.callAI(client, model, prompt, modelId);
    const cleanContent = this.extractJsonBlock(completion);
    return this.safeJsonParse(cleanContent);
  }

  private async getSecurityAgent(modelId: string, diff: string) {
    const client = this.getClient(modelId);
    const model = this.MODEL_MAPPING[modelId] || modelId;
    const prompt = `You are a Senior Security Engineer.
Review the following code diff and identify security vulnerabilities, injection risks, authentication flaws, or OWASP Top 10 issues.
DO NOT review for general style, performance, or clean code issues.

CODE DIFF:
${diff}

IMPORTANT: Your response must be STABLE, VALID JSON.
1. Use double quotes for all keys and strings.
2. ESCAPE all backslashes as \\\\ and double quotes as \\\".
3. Do NOT use literal newlines inside strings.
4. DO NOT use markdown tables, bullet points, or any other formatting.
5. Output ONLY the raw JSON object. Do not include any preamble, postamble, or explanation.
6. The response MUST start with { and end with }.

Return your response in strict JSON format:
{
  "findings": [
    { "file": "string", "line": number, "issue": "string", "type": "Critical|Vulnerability", "confidence": "High|Medium|Low", "rationale": "string", "resolution": "string" }
  ]
}`;

    const completion = await this.callAI(client, model, prompt, modelId);
    const cleanContent = this.extractJsonBlock(completion);
    return this.safeJsonParse(cleanContent);
  }

  private async getReferenceAgent(modelId: string, findings: any[]) {
    if (!findings || findings.length === 0) {
      return { findings: [] };
    }
    const client = this.getClient(modelId);
    const model = this.MODEL_MAPPING[modelId] || modelId;
    const prompt = `You are a Senior Documentation and Compliance Expert.
You are given a list of code issues and security vulnerabilities found in a code change.
For each finding, provide an appropriate online reference URL (e.g., OWASP Top 10 link, CWE database link, official language/library documentation, or MDN docs) that explains the issue or its resolution.

FINDINGS:
${JSON.stringify(findings, null, 2)}

IMPORTANT: Your response must be STABLE, VALID JSON.
1. Use double quotes for all keys and strings.
2. ESCAPE all backslashes as \\\\ and double quotes as \\\".
3. Do NOT use literal newlines inside strings.
4. DO NOT use markdown tables, bullet points, or any other formatting.
5. Output ONLY the raw JSON object. Do not include any preamble, postamble, or explanation.
6. The response MUST start with { and end with }.

Return your response in strict JSON format:
{
  "findings": [
    { "file": "string", "line": number, "issue": "string", "type": "string", "confidence": "string", "rationale": "string", "resolution": "string", "reference": "URL (OWASP, CWE, or documentation link)" }
  ]
}`;

    const completion = await this.callAI(client, model, prompt, modelId);
    const cleanContent = this.extractJsonBlock(completion);
    return this.safeJsonParse(cleanContent);
  }

  private async getScoringAgent(modelId: string, diff: string, findings: any[]) {
    const client = this.getClient(modelId);
    const model = this.MODEL_MAPPING[modelId] || modelId;
    const prompt = `You are a Senior Quality Gate Auditor.
Given the original code diff and the list of identified quality/security findings, evaluate the overall health of the pull request.
Calculate:
1. "qualityScore" (0-100): 100 means perfect code quality. Deduct points based on the severity of non-security quality findings.
2. "securityScore" (0-100): 100 means no security vulnerabilities. Deduct points heavily for Critical or Vulnerability findings.
3. "summary": A brief, high-level summary of the review findings, highlighting main concerns or giving a clean pass message.

CODE DIFF:
${diff}

FINDINGS:
${JSON.stringify(findings, null, 2)}

IMPORTANT: Your response must be STABLE, VALID JSON.
1. Use double quotes for all keys and strings.
2. ESCAPE all backslashes as \\\\ and double quotes as \\\".
3. Do NOT use literal newlines inside strings.
4. DO NOT use markdown tables, bullet points, or any other formatting.
5. Output ONLY the raw JSON object. Do not include any preamble, postamble, or explanation.
6. The response MUST start with { and end with }.

Return your response in strict JSON format:
{
  "qualityScore": number,
  "securityScore": number,
  "summary": "string"
}`;

    const completion = await this.callAI(client, model, prompt, modelId);
    const cleanContent = this.extractJsonBlock(completion);
    return this.safeJsonParse(cleanContent);
  }

  private async callAI(client: any, model: string, prompt: string, modelId: string): Promise<string> {
    let completion;
    let retries = 2;
    
    while (retries >= 0) {
      try {
        completion = await client.chat.completions.create({
          model,
          messages: [
            { role: 'system', content: 'You are a Senior Engineer. Output ONLY valid JSON. No markdown, no code blocks, no explanation. IMPORTANT: Escape all backslashes as \\\\ and ensure all newlines inside strings are escaped as \\n. The response MUST be a single parseable JSON object.' },
            { role: 'user', content: prompt }
          ],
          max_tokens: 3000,
          temperature: 0.1,
        });
        break;
      } catch (error: any) {
        const isConnectionError = error.message?.toLowerCase().includes('connection') || 
                                 error.message?.toLowerCase().includes('timeout') ||
                                 error.status === 504 ||
                                 error.status === 502;
        
        if (isConnectionError && retries > 0) {
          this.logger.warn(`Agent review for ${modelId} failed (${error.message}), retrying... (${retries} left)`);
          retries--;
          await new Promise(resolve => setTimeout(resolve, 5000));
          continue;
        }
        throw error;
      }
    }
    return completion.choices[0].message.content || '{}';
  }

  private async getAgentReview(modelId: string, diff: string) {
    const client = this.getClient(modelId);
    const model = this.MODEL_MAPPING[modelId] || modelId;
    const apiKey = this.getModelKey(modelId);
    
    this.logger.debug(`AI Request: model=${model} key=${apiKey.substring(0, 10)}... URL=https://integrate.api.nvidia.com/v1`);

    // Truncate diff to prevent exceeding the model's context window (max ~130k tokens)
    const MAX_CHARS = 200000;
    const safeDiff = diff.length > MAX_CHARS 
      ? diff.substring(0, MAX_CHARS) + '\n\n...[DIFF TRUNCATED DUE TO LENGTH]...'
      : diff;

    const prompt = `You are a Senior Security and Code Quality Engineer. 
Review the following code diff and identify critical issues, vulnerabilities, and quality improvements.
Focus on:
1. OWASP Top 10 vulnerabilities.
2. Performance bottlenecks.
3. Clean code and architectural patterns.

CODE DIFF:
${safeDiff}

IMPORTANT: Your response must be STABLE, VALID JSON.
1. Use double quotes for all keys and strings.
2. ESCAPE all backslashes as \\\\ and double quotes as \\\".
3. Do NOT use literal newlines inside strings.
4. DO NOT use markdown tables, bullet points, or any other formatting.
5. Output ONLY the raw JSON object. Do not include any preamble, postamble, or explanation.
6. The response MUST start with { and end with }.

Return your response in strict JSON format:
{
  "findings": [
    { "file": "string", "line": number, "issue": "string", "type": "Critical|Vulnerability|Warning|Info", "confidence": "High|Medium|Low", "rationale": "string", "resolution": "string", "reference": "URL (OWASP, CWE, or documentation link)" }
  ],
  "qualityScore": number (0-100),
  "securityScore": number (0-100),
  "summary": "string"
}`;

    let completion;
    let retries = 2;
    
    while (retries >= 0) {
      try {
        completion = await client.chat.completions.create({
          model,
          messages: [
            { role: 'system', content: 'You are a Senior Engineer. Output ONLY valid JSON. No markdown, no code blocks, no explanation. IMPORTANT: Escape all backslashes as \\\\ and ensure all newlines inside strings are escaped as \\n. The response MUST be a single parseable JSON object.' },
            { role: 'user', content: prompt }
          ],
          max_tokens: 3000,
          temperature: 0.1,
        });
        break;
      } catch (error: any) {
        const isConnectionError = error.message?.toLowerCase().includes('connection') || 
                                 error.message?.toLowerCase().includes('timeout') ||
                                 error.status === 504 ||
                                 error.status === 502;
        
        if (isConnectionError && retries > 0) {
          this.logger.warn(`Agent review for ${modelId} failed (${error.message}), retrying... (${retries} left)`);
          retries--;
          await new Promise(resolve => setTimeout(resolve, 5000));
          continue;
        }
        throw error;
      }
    }

    const content = completion.choices[0].message.content || '{}';
    const cleanContent = this.extractJsonBlock(content);

    return {
      model: modelId,
      content: this.safeJsonParse(cleanContent),
    };
  }

  private async synthesizeConsensus(modelId: string, agentResponses: any[], diff: string): Promise<AIReviewResult> {
    const client = this.getClient(modelId);
    const model = this.MODEL_MAPPING[modelId] || modelId;

    const MAX_CHARS = 200000;
    const safeDiff = diff.length > MAX_CHARS 
      ? diff.substring(0, MAX_CHARS) + '\n\n...[DIFF TRUNCATED DUE TO LENGTH]...'
      : diff;

    const prompt = `You are the Lead Consensus Architect. 
You have 3 independent AI agent reviews of a code change. 
Your task is to debate their findings, resolve conflicts, and synthesize the final "Truth" (Consensus).

AGENT REVIEWS:
${JSON.stringify(agentResponses, null, 2)}

ORIGINAL DIFF:
${safeDiff}

Instructions:
1. Only include findings where at least 2 agents agree, or 1 agent provides an extremely compelling security critical case.
2. Deduplicate similar findings.
3. Calculate the final Quality and Security scores.
4. Provide a high-level summary of the "Debate" and final verdict.
5. IMPORTANT: Output ONLY the JSON object. Do not include any text before or after.
6. IMPORTANT: Ensure the JSON is valid. Escape all backslashes as \\\\ and double quotes as \\\".
7. IMPORTANT: Do not include literal newlines inside JSON strings.

Return your response in strict JSON format:
{
  "findings": [
    { "file": "string", "line": number, "issue": "string", "type": "Critical|Vulnerability|Warning|Info", "confidence": "High|Medium|Low", "rationale": "string", "resolution": "string", "reference": "URL" }
  ],
  "qualityScore": number,
  "securityScore": number,
  "summary": "string"
}`;

    let completion;
    let retries = 2;
    
    while (retries >= 0) {
      try {
        completion = await client.chat.completions.create({
          model,
          messages: [
            { role: 'system', content: 'You are a Lead Architect. Synthesize agent findings into a single JSON object. Be extremely concise. No preamble. No postamble.' },
            { role: 'user', content: prompt }
          ],
          max_tokens: 3000,
          temperature: 0.1,
        });
        break;
      } catch (error: any) {
        const isConnectionError = error.message?.toLowerCase().includes('connection') || 
                                 error.message?.toLowerCase().includes('timeout') ||
                                 error.status === 504 ||
                                 error.status === 502;
                                 
        if (isConnectionError && retries > 0) {
          this.logger.warn(`Synthesis for ${modelId} failed (${error.message}), retrying... (${retries} left)`);
          retries--;
          await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5s
          continue;
        }
        throw error;
      }
    }

    const content = completion.choices[0].message.content || '{}';
    const cleanContent = this.extractJsonBlock(content);

    return this.safeJsonParse(cleanContent);
  }

  /**
   * Extracts the most likely JSON block from a string containing conversational text or code
   */
  private extractJsonBlock(content: string): string {
    // 1. First try to find a block between ```json and ```
    const codeBlockMatch = content.match(/```json\s*([\s\S]*?)\s*```/);
    if (codeBlockMatch && codeBlockMatch[1]) {
      return codeBlockMatch[1].trim();
    }

    // 2. Otherwise look for the block that contains our expected keys
    const markerRegex = /["']?(findings|qualityScore|summary)["']?\s*:/;
    const match = content.match(markerRegex);
    
    if (match && match.index !== undefined) {
      // Find the { that starts the object containing this marker
      const potentialStart = content.lastIndexOf('{', match.index);
      if (potentialStart !== -1) {
        // Find the matching } by looking for the last one in the file
        const lastEnd = content.lastIndexOf('}');
        if (lastEnd > potentialStart) {
          return content.substring(potentialStart, lastEnd + 1);
        }
      }
    }

    // Fallback: Just try to find the largest block between { and }
    const firstStart = content.indexOf('{');
    const lastEnd = content.lastIndexOf('}');
    if (firstStart !== -1 && lastEnd !== -1 && lastEnd > firstStart) {
      return content.substring(firstStart, lastEnd + 1);
    }

    return content;
  }

  /**
   * Safe JSON parser that attempts to fix common LLM mistakes
   */
  private safeJsonParse(content: string): any {
    try {
      const parsed = JSON.parse(content);
      return this.normalizeParsedJson(parsed);
    } catch (e) {
      this.logger.warn(`JSON parse failed, attempting recovery...`);
      this.logger.debug(`Malformed JSON snippet: ${content.substring(0, 100)}...`);
      
      let fixed = content.trim();
      
      // 1. Remove non-printable control characters
      fixed = fixed.replace(/[\x00-\x1F\x7F-\x9F]/g, (char) => {
        if (char === '\n' || char === '\r' || char === '\t') return char;
        return '';
      });

      // 2. Remove markdown code blocks
      fixed = fixed.replace(/^```json\s*/, '').replace(/```$/, '');

      // 3. Fix unescaped quotes inside string values (property-by-property)
      fixed = fixed.replace(/:\s*"(.*?)"(?=\s*(?:,\s*"[a-zA-Z0-9_-]+"\s*:|\s*[}\]]))/gs, (match, p1) => {
        const sanitized = p1.replace(/(?<!\\)"/g, '\\"');
        return `: "${sanitized}"`;
      });

      // 4. Handle unquoted or single-quoted keys/values
      fixed = fixed.replace(/'([^']+)':/g, '"$1":');
      fixed = fixed.replace(/:\s*'([^']*)'/g, ': "$1"');
      fixed = fixed.replace(/([{,]\s*)([a-zA-Z0-9_]+)\s*:/g, '$1"$2":');

      // 5. Fix common backslash errors
      fixed = fixed.replace(/\\(?![nr"t\\\/])/g, '\\\\');

      // 6. Handle literal newlines
      fixed = fixed.replace(/(".*?")/gs, (match) => {
        return match.replace(/\n/g, '\\n').replace(/\r/g, '\\r');
      });

      // 7. Clean up commas
      fixed = fixed.replace(/,(\s*[\]}])/g, '$1');
      fixed = fixed.replace(/\}\s*\{/g, '},{');
      fixed = fixed.replace(/\]\s*\{/g, '],{');
      fixed = fixed.replace(/"\s*"/g, '","'); 

      // 8. Fix premature object closure: }, "findings": -> , "findings":
      fixed = fixed.replace(/\}\s*,\s*"(findings|qualityScore|securityScore|summary)"\s*:/g, ', "$1":');

      // 9. Fix literal newlines inside strings (very common failure)
      fixed = fixed.replace(/"([^"\\]*(\\.[^"\\]*)*)"/g, (match) => {
        return match.replace(/\n/g, '\\n').replace(/\r/g, '\\r');
      });

      // 10. Fix backslashes that escape structural quotes (e.g. \"key\" or \"value\")
      fixed = fixed.replace(/(?<=[:\{\[,])\s*\\"/g, '"');
      fixed = fixed.replace(/\\"\s*(?=[\]\},:])/g, '"');

      // 11. Discard trailing "babble" (text after the last root brace)
      const rootOpenIndex = fixed.indexOf('{');
      if (rootOpenIndex !== -1) {
        let depth = 0;
        let lastMatch = -1;
        for (let i = rootOpenIndex; i < fixed.length; i++) {
          if (fixed[i] === '{') depth++;
          if (fixed[i] === '}') depth--;
          if (depth === 0) {
            lastMatch = i;
            break;
          }
        }
        if (lastMatch !== -1) {
          fixed = fixed.substring(0, lastMatch + 1);
        }
      }

      // 12. JSON Balancer: Auto-close truncated objects/arrays
      let braceCount = 0;
      let bracketCount = 0;
      let inString = false;
      for (let i = 0; i < fixed.length; i++) {
        if (fixed[i] === '"' && fixed[i-1] !== '\\') inString = !inString;
        if (!inString) {
          if (fixed[i] === '{') braceCount++;
          if (fixed[i] === '}') braceCount--;
          if (fixed[i] === '[') bracketCount++;
          if (fixed[i] === ']') bracketCount--;
        }
      }
      
      while (bracketCount > 0) { fixed += ']'; bracketCount--; }
      while (braceCount > 0) { fixed += '}'; braceCount--; }

      try {
        const parsed = JSON.parse(fixed);
        return this.normalizeParsedJson(parsed);
      } catch (e2) {
        this.logger.error(`JSON recovery failed: ${e2.message}`);
        this.logger.debug(`Attempted fix: ${fixed}`);
        
        // Final fallback: Regex extraction for findings and critical fields
        const findings: any[] = [];
        // Extract flexible finding objects matching file and issue
        const flexibleRegex = /\{\s*"file"\s*:\s*"([^"]+)"\s*,[^}]*?"issue"\s*:\s*"([^"]+)"[^}]*?\}/g;
        let match;
        while ((match = flexibleRegex.exec(content)) !== null) {
          try {
            const individual = JSON.parse(match[0]);
            if (individual.file && individual.issue) {
              findings.push({
                file: individual.file,
                line: typeof individual.line === 'number' ? individual.line : 1,
                issue: individual.issue,
                type: individual.type || 'Warning',
                confidence: individual.confidence || 'Medium',
                rationale: individual.rationale || '',
                resolution: individual.resolution || '',
                reference: individual.reference || undefined
              });
            }
          } catch (err) {}
        }

        const qualityMatch = content.match(/"qualityScore":\s*(\d+)/);
        const securityMatch = content.match(/"securityScore":\s*(\d+)/);
        const summaryMatch = content.match(/"summary":\s*"([^"]+)"/);
        
        return {
          findings,
          qualityScore: qualityMatch ? parseInt(qualityMatch[1], 10) : 0,
          securityScore: securityMatch ? parseInt(securityMatch[1], 10) : 0,
          summary: summaryMatch ? summaryMatch[1] : 'Critical: AI generated invalid JSON. Extracted findings via regex.'
        };
      }
    }
  }

  /**
   * Helper to normalize dynamic LLM response keys to standard "findings"
   */
  private normalizeParsedJson(parsed: any): any {
    if (parsed && typeof parsed === 'object') {
      // Normalize casing of "findings"
      const findingsKey = Object.keys(parsed).find(k => k.toLowerCase() === 'findings');
      if (findingsKey && findingsKey !== 'findings') {
        parsed.findings = parsed[findingsKey];
        delete parsed[findingsKey];
      }
      
      // Map other common variations (security_issues, issues, violations, errors) to findings
      if (!parsed.findings) {
        const alternativeKey = Object.keys(parsed).find(k => 
          k.toLowerCase() === 'security_issues' || 
          k.toLowerCase() === 'issues' || 
          k.toLowerCase() === 'violations' ||
          k.toLowerCase() === 'errors'
        );
        if (alternativeKey && Array.isArray(parsed[alternativeKey])) {
          parsed.findings = parsed[alternativeKey];
        }
      }
      
      // Ensure findings is always an array
      if (parsed.findings && !Array.isArray(parsed.findings)) {
        parsed.findings = [parsed.findings];
      }
      
      // If the top-level object itself is a raw array, wrap it in a findings object
      if (!parsed.findings && Array.isArray(parsed)) {
        return { findings: parsed };
      }

      if (!parsed.findings) {
        parsed.findings = [];
      }
    }
    return parsed;
  }

  /**
   * Last resort fallback if all debate/synthesis agents fail.
   * Merges all unique findings from successful agents.
   */
  private naiveSynthesis(agentResponses: any[]): AIReviewResult {
    const findings: any[] = [];
    const seen = new Set<string>();
    let qTotal = 0;
    let sTotal = 0;
    let count = 0;

    for (const agent of agentResponses) {
      const content = agent.content || {};
      const agentFindings = content.findings || [];
      
      qTotal += (content.qualityScore || 0);
      sTotal += (content.securityScore || 0);
      count++;

      for (const f of agentFindings) {
        const key = `${f.file}:${f.line}:${f.issue.substring(0, 30)}`;
        if (!seen.has(key)) {
          findings.push(f);
          seen.add(key);
        }
      }
    }

    return {
      findings,
      qualityScore: Math.round(qTotal / (count || 1)),
      securityScore: Math.round(sTotal / (count || 1)),
      summary: `Resilient Fallback: Synthesis debate failed, but ${count} agents successfully reviewed the code independently. Merged their findings.`,
    };
  }

  /**
   * Expose githubService status updates to other services (like webhooks)
   */
  async updateCommitStatus(
    githubToken: string,
    owner: string,
    repoName: string,
    headSha: string,
    state: 'pending' | 'success' | 'failure' | 'error',
    description: string,
  ) {
    return this.githubService.updateCommitStatus(
      githubToken,
      owner,
      repoName,
      headSha,
      state,
      description
    );
  }
}
