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
    'deepseek-v4-flash': 'deepseek-ai/deepseek-v2-chat', // Placeholder or real ID
    'deepseek-v4-pro': 'deepseek-ai/deepseek-v2-chat',
    'mistral-medium-3.5': 'mistralai/mixtral-8x22b-instruct-v0.1',
    'mistral-small-4': 'mistralai/mistral-7b-instruct-v0.3',
    'minimax-m2.7': 'nvidia/nemotron-4-340b-instruct',
    'nemotron-3-super': 'nvidia/nemotron-4-340b-instruct',
    'llama-3.1': 'meta/llama-3.1-405b-instruct',
    'gemma-3': 'google/gemma-2-27b-it',
    'phi-4': 'microsoft/phi-3-medium-128k-instruct',
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
      'meta/llama-3.1-405b-instruct',
      'nvidia/nemotron-4-340b-instruct',
      'meta/llama-3.1-70b-instruct',
    ],
  ) {
    this.logger.log(`Starting debate review for ${repoName} PR #${prNumber} with models: ${selectedModels.join(', ')}`);

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
      // 2. Run analysis in parallel across 3 agents
      const agentPrompts = selectedModels.map((model) => 
        this.getAgentReview(model, diff)
      );

      const agentResponses = await Promise.all(agentPrompts);

      // 3. Perform Consensus synthesis (Agent Debate)
      // We use the most powerful model (usually the first one or Llama 3.1 405B) to synthesize the results
      const synthesis = await this.synthesizeConsensus(selectedModels[0], agentResponses, diff);

      // 4. Store findings and update analysis
      await this.prisma.$transaction([
        ...synthesis.findings.map((f) => 
          this.prisma.finding.create({
            data: {
              analysisId: analysis.id,
              ...f,
              consensus: true, // In this simplified version, synthesized findings are consensus
              models: selectedModels, // For now, we attribute to all
            },
          })
        ),
        this.prisma.analysis.update({
          where: { id: analysis.id },
          data: {
            status: 'completed',
            qualityScore: synthesis.qualityScore,
            securityScore: synthesis.securityScore,
            summary: synthesis.summary,
            debateLog: { agents: agentResponses } as any,
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
      );

      // 6. Update Check Run
      await this.githubService.createCheckRun(
        githubToken,
        owner,
        repoName,
        headSha,
        analysis.id,
      );

      return analysis.id;
    } catch (error) {
      this.logger.error(`Analysis failed for PR #${prNumber}: ${error.message}`);
      await this.prisma.analysis.update({
        where: { id: analysis.id },
        data: { status: 'failed', summary: error.message },
      });
      throw error;
    }
  }

  private async getAgentReview(modelId: string, diff: string) {
    const client = this.getClient(modelId);
    const model = this.MODEL_MAPPING[modelId] || modelId;

    const prompt = `You are a Senior Security and Code Quality Engineer. 
Review the following code diff and identify critical issues, vulnerabilities, and quality improvements.
Focus on:
1. OWASP Top 10 vulnerabilities.
2. Performance bottlenecks.
3. Clean code and architectural patterns.

CODE DIFF:
${diff}

Return your response in strict JSON format:
{
  "findings": [
    { "file": "string", "line": number, "issue": "string", "type": "Critical|Vulnerability|Warning|Info", "confidence": "High|Medium|Low", "rationale": "string", "resolution": "string" }
  ],
  "qualityScore": number (0-100),
  "securityScore": number (0-100),
  "summary": "string"
}`;

    const completion = await client.chat.completions.create({
      model,
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
    });

    return {
      model: modelId,
      content: JSON.parse(completion.choices[0].message.content),
    };
  }

  private async synthesizeConsensus(modelId: string, agentResponses: any[], diff: string): Promise<AIReviewResult> {
    const client = this.getClient(modelId);
    const model = this.MODEL_MAPPING[modelId] || modelId;

    const prompt = `You are the Lead Consensus Architect. 
You have 3 independent AI agent reviews of a code change. 
Your task is to debate their findings, resolve conflicts, and synthesize the final "Truth" (Consensus).

AGENT REVIEWS:
${JSON.stringify(agentResponses, null, 2)}

ORIGINAL DIFF:
${diff}

Instructions:
1. Only include findings where at least 2 agents agree, or 1 agent provides an extremely compelling security critical case.
2. Deduplicate similar findings.
3. Calculate the final Quality and Security scores.
4. Provide a high-level summary of the "Debate" and final verdict.

Return your response in strict JSON format:
{
  "findings": [...],
  "qualityScore": number,
  "securityScore": number,
  "summary": "string"
}`;

    const completion = await client.chat.completions.create({
      model,
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
    });

    return JSON.parse(completion.choices[0].message.content) as AIReviewResult;
  }
}
