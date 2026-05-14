import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '@/prisma/prisma.service';
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
      'gemma-3': 'GEMMA_3_KEY',
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
    'gemma-3': 'google/gemma-3-27b-it',
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
      timeout: 900000, // 15 minutes
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
    selectedModels: string[] = [
      'llama-3.1',
      'deepseek-v4-pro',
      'mistral-medium-3.5',
    ],
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
      });
    }

    this.logger.log(`Starting debate review for ${repoName} PR #${prNumber} with models: ${selectedModels.join(', ')}`);
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
        models: selectedModels,
      },
    });

    try {
      // Set initial progress
      await this.githubService.updateCommitStatus(
        githubToken,
        owner,
        repoName,
        headSha,
        'pending',
        'AI Agents are analyzing the code... 15%',
      );

      // 2. Run analysis across 3 agents with independent error handling
      const agentResults = await Promise.all(
        selectedModels.map(async (model) => {
          try {
            const response = await this.getAgentReview(model, processedDiff);
            return { model, status: 'success', response };
          } catch (e: any) {
            this.logger.error(`Agent review for ${model} failed: ${e.message}`);
            return { model, status: 'failed', error: e.message };
          }
        })
      );

      const successfulResponses = agentResults
        .filter(r => r.status === 'success')
        .map(r => r.response);

      if (successfulResponses.length === 0) {
        throw new Error('All AI agents failed to respond. Please check your API keys or try again later.');
      }

      await this.githubService.updateCommitStatus(
        githubToken,
        owner,
        repoName,
        headSha,
        'pending',
        `Agents are debating consensus (${successfulResponses.length}/3)... 65%`,
      );

      // 3. Perform Consensus synthesis (Agent Debate) using the first successful model as lead
      const leadModel = agentResults.find(r => r.status === 'success')?.model || selectedModels[0];
      const synthesis = await this.synthesizeConsensus(leadModel, successfulResponses, processedDiff);

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
          data: synthesis.findings.map((f) => ({
            analysisId: analysis.id,
            ...f,
            consensus: true,
            models: selectedModels,
          })),
        }),
        this.prisma.analysis.update({
          where: { id: analysis.id },
          data: {
            status: 'completed',
            qualityScore: synthesis.qualityScore,
            securityScore: synthesis.securityScore,
            summary: synthesis.summary,
            debateLog: { agents: agentResults } as any,
          },
        }),
      ]);

      // 5. Post comments back to GitHub
      await this.githubService.postComments(
        githubToken,
        owner,
        repoName,
        prNumber,
        synthesis.findings,
        headSha,
      );

      // 6. Update Status to Success
      await this.githubService.updateCommitStatus(
        githubToken,
        owner,
        repoName,
        headSha,
        'success',
        'AI Analysis Complete! 100% Done.',
      );

      return analysis.id;
    } catch (error) {
      this.logger.error(`Analysis failed for PR #${prNumber}: ${error.message}`);
      
      await this.prisma.analysis.update({
        where: { id: analysis.id },
        data: { status: 'failed' },
      });

      // Update GitHub with error status
      await this.githubService.updateCommitStatus(
        githubToken,
        owner,
        repoName,
        headSha,
        'error',
        `Analysis failed: ${error.message.substring(0, 50)}...`,
      );

      throw error;
    }
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
            { role: 'system', content: 'You are a strict JSON generator. You MUST output ONLY raw JSON. No preamble, no postamble, no code blocks, no explanation. Your entire response must be a single JSON object. Double-escape all backslashes and escape all internal double quotes.' },
            { role: 'user', content: prompt }
          ],
          max_tokens: 4096,
        });
        break;
      } catch (error: any) {
        if (error.status === 504 && retries > 0) {
          this.logger.warn(`Agent review for ${modelId} failed with 504, retrying... (${retries} left)`);
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
            { role: 'system', content: 'You are a strict JSON generator. You MUST output ONLY raw JSON. No preamble, no postamble, no code blocks, no explanation. Your entire response must be a single JSON object. Double-escape all backslashes and escape all internal double quotes.' },
            { role: 'user', content: prompt }
          ],
          max_tokens: 4096,
        });
        break;
      } catch (error) {
        if (error.status === 504 && retries > 0) {
          this.logger.warn(`Synthesis failed with 504, retrying... (${retries} left)`);
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
      return JSON.parse(content);
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

      // 3. Fix unescaped quotes inside string values
      // This looks for "key": "value "with" quotes"
      // We look for quotes that are NOT followed by , } ] or : and are NOT preceded by \
      fixed = fixed.replace(/:(?:\s*)"(.*?)",?(\s*[}\]])/gs, (match, p1, p2) => {
        const sanitized = p1.replace(/(?<!\\)"/g, '\\"');
        return `: "${sanitized}"${p2}`;
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
      // 7. Clean up commas
      fixed = fixed.replace(/,(\s*[\]}])/g, '$1');
      fixed = fixed.replace(/\}\s*\{/g, '},{');
      fixed = fixed.replace(/\]\s*\{/g, '],{');
      fixed = fixed.replace(/"\s*"/g, '","'); 

      // 8. Fix premature object closure: }, "findings": -> , "findings":
      fixed = fixed.replace(/\}\s*,\s*"(findings|qualityScore|securityScore|summary)"\s*:/g, ', "$1":');

      // 8. JSON Balancer: Auto-close truncated objects/arrays
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
        return JSON.parse(fixed);
      } catch (e2) {
        this.logger.error(`JSON recovery failed: ${e2.message}`);
        this.logger.debug(`Attempted fix: ${fixed}`);
        
        // Final fallback: Regex extraction for critical fields
        const qualityMatch = content.match(/"qualityScore":\s*(\d+)/);
        const securityMatch = content.match(/"securityScore":\s*(\d+)/);
        const summaryMatch = content.match(/"summary":\s*"([^"]+)"/);
        
        return {
          findings: [],
          qualityScore: qualityMatch ? parseInt(qualityMatch[1], 10) : 0,
          securityScore: securityMatch ? parseInt(securityMatch[1], 10) : 0,
          summary: summaryMatch ? summaryMatch[1] : 'Critical: AI generated invalid JSON. Please check logs.'
        };
      }
    }
  }
}
