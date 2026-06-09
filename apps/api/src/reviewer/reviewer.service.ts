import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PrismaService } from "../prisma/prisma.service";
import OpenAI from "openai";
import { GithubService } from "./github.service";

export interface AIReviewResult {
  findings: Array<{
    file: string;
    line: number;
    issue: string;
    type: "Critical" | "Vulnerability" | "Warning" | "Info";
    confidence: "High" | "Medium" | "Low";
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

  /** File patterns to skip during analysis (binary, lock, generated files) */
  private readonly SKIP_PATTERNS = [
    /package-lock\.json$/,
    /yarn\.lock$/,
    /pnpm-lock\.yaml$/,
    /\.min\.(js|css)$/,
    /\.map$/,
    /\.svg$/,
    /\.png$/,
    /\.jpg$/,
    /\.jpeg$/,
    /\.gif$/,
    /\.ico$/,
    /\.woff2?$/,
    /\.ttf$/,
    /\.eot$/,
    /dist\//,
    /\.d\.ts$/,
    /\.snap$/,
    /\.lock$/,
  ];

  /**
   * Helper to get the API key for a specific model from environment
   */
  private getModelKey(modelId: string): string {
    const envMap: Record<string, string> = {
      "deepseek-v4-flash": "DEEPSEEK_FLASH_KEY",
      "deepseek-v4-pro": "DEEPSEEK_PRO_KEY",
      "mistral-medium-3.5": "MISTRAL_MEDIUM_KEY",
      "mistral-small-4": "MISTRAL_SMALL_KEY",
      "minimax-m2.7": "MINIMAX_KEY",
      "nemotron-3-super": "NEMOTRON_SUPER_KEY",
      "llama-3.1": "LLAMA_31_KEY",
      "gemma-2-27b": "GEMMA_3_KEY",
      "gemma-3": "GEMMA_3_KEY", // Alias for backward compatibility
      "phi-4": "PHI_4_KEY",
    };

    const envVar = envMap[modelId];
    return (
      this.configService.get<string>(envVar) ||
      this.configService.get<string>("NVIDIA_API_KEY") ||
      ""
    );
  }

  // Actual NVIDIA NIM model IDs for mapping
  private readonly MODEL_MAPPING: Record<string, string> = {
    "deepseek-v4-flash": "deepseek-ai/deepseek-v4-flash",
    "deepseek-v4-pro": "deepseek-ai/deepseek-v4-pro",
    "mistral-medium-3.5": "mistralai/mistral-medium-3.5-128b",
    "mistral-small-4": "mistralai/mistral-small-4-119b-2603",
    "minimax-m2.7": "minimaxai/minimax-m2.7",
    "nemotron-3-super": "nvidia/nemotron-3-super-120b-a12b",
    "llama-3.1": "meta/llama-3.1-70b-instruct",
    "gemma-2-27b": "meta/llama-3.3-70b-instruct",
    "gemma-3": "meta/llama-3.3-70b-instruct", // Alias
    "phi-4": "microsoft/phi-4-mini-instruct",
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
      baseURL: "https://integrate.api.nvidia.com/v1",
      apiKey,
      timeout: 120000, // 2 minutes (per-file chunks are small)
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
      "llama-3.1",
      "deepseek-v4-flash",
      "mistral-small-4",
    ],
  ) {
    // 0. Check if an analysis is already in progress for this PR
    const existingAnalysis = await this.prisma.analysis.findFirst({
      where: {
        repoName,
        prNumber,
        status: "in_progress",
      },
    });

    if (existingAnalysis) {
      this.logger.log(
        `Analysis for ${repoName} PR #${prNumber} already in progress. Mark as cancelled and starting fresh.`,
      );
      await this.prisma.analysis.update({
        where: { id: existingAnalysis.id },
        data: { status: "failed" },
      });
    }

    this.logger.log(
      `Starting debate review for ${repoName} PR #${prNumber} with models: ${selectedModels.join(", ")}`,
    );
    this.logger.log(`Diff size: ${diff.length} characters`);

    // 1. Create initial analysis record
    const analysis = await this.prisma.analysis.create({
      data: {
        userId,
        repoName,
        prNumber,
        title,
        status: "in_progress",
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
        "pending",
        "AI Agents are analyzing the code... 15%",
      );

      // 2. Split diff by file and filter out non-reviewable files
      const fileChunks = this.splitDiffByFile(diff);
      const reviewableFiles = Array.from(fileChunks.entries()).filter(
        ([filename]) => !this.shouldSkipFile(filename),
      );

      this.logger.log(
        `Split diff into ${fileChunks.size} files, ${reviewableFiles.length} reviewable (skipped ${fileChunks.size - reviewableFiles.length} binary/lock/generated files)`,
      );

      if (reviewableFiles.length === 0) {
        this.logger.warn("No reviewable files in this diff.");
        await this.prisma.analysis.update({
          where: { id: analysis.id },
          data: {
            status: "completed",
            qualityScore: 100,
            securityScore: 100,
            summary:
              "No reviewable source files found in this PR (only lock/binary/generated files).",
          },
        });
        await this.githubService.updateCommitStatus(
          githubToken,
          owner,
          repoName,
          headSha,
          "success",
          "No reviewable source files found.",
        );
        return analysis.id;
      }

      // 3. Run all agents across all file chunks in parallel
      //    Concurrency: (reviewableFiles × models) requests fire simultaneously
      //    Rate-limit guard: batch in groups of 10 concurrent requests
      const CONCURRENCY_LIMIT = 10;
      const allTasks: Array<{
        file: string;
        model: string;
        promise: () => Promise<{
          model: string;
          status: string;
          response?: any;
          error?: string;
        }>;
      }> = [];

      for (const [filename, chunk] of reviewableFiles) {
        for (const model of selectedModels) {
          allTasks.push({
            file: filename,
            model,
            promise: async () => {
              try {
                const response = await this.getAgentReview(model, chunk);
                return { model, status: "success", response };
              } catch (e: any) {
                this.logger.error(
                  `Agent ${model} failed on ${filename}: ${e.message}`,
                );
                return { model, status: "failed", error: e.message };
              }
            },
          });
        }
      }

      // Execute in batches to respect rate limits
      const allResults: Array<{
        file: string;
        model: string;
        result: {
          model: string;
          status: string;
          response?: any;
          error?: string;
        };
      }> = [];

      for (let i = 0; i < allTasks.length; i += CONCURRENCY_LIMIT) {
        const batch = allTasks.slice(i, i + CONCURRENCY_LIMIT);
        const batchResults = await Promise.all(
          batch.map(async (task) => ({
            file: task.file,
            model: task.model,
            result: await task.promise(),
          })),
        );
        allResults.push(...batchResults);
      }

      // Group results by file for consensus
      const resultsByFile = new Map<
        string,
        Array<{ model: string; status: string; response?: any; error?: string }>
      >();
      for (const { file, result } of allResults) {
        if (!resultsByFile.has(file)) resultsByFile.set(file, []);
        resultsByFile.get(file)!.push(result);
      }

      // Build flat agentResults array for debateLog (backward compatibility)
      const agentResults = allResults.map((r) => r.result);
      const successCount = agentResults.filter(
        (r) => r.status === "success",
      ).length;

      if (successCount === 0) {
        throw new Error(
          "All AI agents failed to respond. Please check your API keys or try again later.",
        );
      }

      // Check if stopped before building consensus
      let checkAnalysis = await this.prisma.analysis.findUnique({
        where: { id: analysis.id },
        select: { status: true },
      });
      if (checkAnalysis?.status === "stopped") {
        this.logger.log(
          `Analysis ${analysis.id} was stopped. Aborting debate review.`,
        );
        return analysis.id;
      }

      await this.githubService.updateCommitStatus(
        githubToken,
        owner,
        repoName,
        headSha,
        "pending",
        `Building consensus (${successCount} successful reviews)... 75%`,
      );

      // 4. Deterministic consensus: vote across agents per file (no LLM call!)
      const synthesis = this.buildConsensus(resultsByFile);

      // Check if stopped before updating database
      checkAnalysis = await this.prisma.analysis.findUnique({
        where: { id: analysis.id },
        select: { status: true },
      });
      if (checkAnalysis?.status === "stopped") {
        this.logger.log(
          `Analysis ${analysis.id} was stopped. Aborting final updates.`,
        );
        return analysis.id;
      }

      await this.githubService.updateCommitStatus(
        githubToken,
        owner,
        repoName,
        headSha,
        "pending",
        "Finalizing the review report... 90%",
      );

      // 5. Store findings and update analysis
      const createdFindings = await this.prisma.finding.createManyAndReturn({
        data: synthesis.findings.map((f) => ({
          analysisId: analysis.id,
          file: f.file,
          line: f.line,
          issue: f.issue,
          type: f.type,
          confidence: f.confidence,
          rationale: f.rationale,
          resolution: f.resolution,
          reference: f.reference,
          commitSha: headSha,
          models: selectedModels,
        })),
      });

      await this.prisma.analysis.update({
        where: { id: analysis.id },
        data: {
          status: "completed",
          qualityScore: synthesis.qualityScore,
          securityScore: synthesis.securityScore,
          summary: synthesis.summary,
          debateLog: { agents: agentResults } as any,
        },
      });

      // 6. Extract valid paths from diff to prevent GitHub 422 errors
      const validPaths = new Set(
        Array.from(diff.matchAll(/^(?:\+\+\+|---) [ab]\/([^ \t\r\n]+)/gm))
          .map((m) => m[1])
          .filter(Boolean),
      );

      // Filter findings to only those that apply to valid paths in the diff
      const validFindings = createdFindings.filter((f) =>
        validPaths.has(f.file),
      );

      if (validFindings.length > 0) {
        this.logger.log(
          `Posting ${validFindings.length} valid inline review comments...`,
        );
        const commentIds = await this.githubService.postComments(
          githubToken,
          owner,
          repoName,
          prNumber,
          validFindings,
          headSha,
        );

        // Batch DB writes with $transaction instead of sequential updates
        const commentEntries = Object.entries(commentIds);
        if (commentEntries.length > 0) {
          await this.prisma.$transaction(
            commentEntries.map(([findingId, commentId]) =>
              this.prisma.finding.update({
                where: { id: findingId },
                data: { githubCommentId: commentId },
              }),
            ),
          );
        }
      } else {
        this.logger.log(
          "No inline findings match the PR diff files. Posting summary only.",
        );
        await this.githubService.postSummaryOnly(
          githubToken,
          owner,
          repoName,
          prNumber,
          synthesis.findings.length,
          synthesis.qualityScore,
          synthesis.securityScore,
        );
      }

      // 7. Cross-commit comparison for resolved issues
      await this.resolveOldFindings(
        owner,
        repoName,
        prNumber,
        createdFindings,
        githubToken,
      );

      // 8. Update Status to Success
      await this.githubService.updateCommitStatus(
        githubToken,
        owner,
        repoName,
        headSha,
        "success",
        `Analysis complete: found ${validFindings.length} issues.`,
      );

      return analysis.id;
    } catch (error) {
      this.logger.error(
        `Analysis failed for PR #${prNumber}: ${error.message}`,
      );

      const checkAnalysis = await this.prisma.analysis
        .findUnique({
          where: { id: analysis.id },
          select: { status: true },
        })
        .catch(() => null);

      if (checkAnalysis?.status === "stopped") {
        this.logger.log(
          `Analysis ${analysis.id} was stopped. Ignoring failure status update.`,
        );
        return analysis.id;
      }

      await this.prisma.analysis.update({
        where: { id: analysis.id },
        data: { status: "failed" },
      });

      // Update GitHub with error status
      await this.githubService.updateCommitStatus(
        githubToken,
        owner,
        repoName,
        headSha,
        "error",
        `Analysis failed: ${error.message.substring(0, 50)}...`,
      );

      throw error;
    }
  }

  private async getAgentReview(modelId: string, diff: string) {
    const client = this.getClient(modelId);
    const model = this.MODEL_MAPPING[modelId] || modelId;
    const apiKey = this.getModelKey(modelId);

    this.logger.debug(
      `AI Request: model=${model} key=${apiKey.substring(0, 10)}... URL=https://integrate.api.nvidia.com/v1`,
    );

    // Truncate diff to prevent exceeding the model's context window (max ~130k tokens)
    const MAX_CHARS = 200000;
    const safeDiff =
      diff.length > MAX_CHARS
        ? diff.substring(0, MAX_CHARS) +
          "\n\n...[DIFF TRUNCATED DUE TO LENGTH]..."
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
7. CRITICAL: The "reference" MUST be a highly reputable, real, and valid URL (e.g., OWASP, MDN, official language documentation). DO NOT hallucinate highly specific URLs that result in 404 Not Found. If you are unsure of a specific URL, provide a link to the top-level documentation or a well-known resource that contains details related to the vulnerability, fix, or code updates.

Return your response in strict JSON format:
{
  "findings": [
    { "file": "string", "line": number, "issue": "string", "type": "Critical|Vulnerability|Warning|Info", "confidence": "High|Medium|Low", "rationale": "string", "resolution": "string", "reference": "URL (MUST be a real, valid link)" }
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
            {
              role: "system",
              content:
                "You are a Senior Engineer. Output ONLY valid JSON. No markdown, no code blocks, no explanation. IMPORTANT: Escape all backslashes as \\\\ and ensure all newlines inside strings are escaped as \\n. The response MUST be a single parseable JSON object.",
            },
            { role: "user", content: prompt },
          ],
          max_tokens: 2000,
          temperature: 0.1,
        });
        break;
      } catch (error: any) {
        const isConnectionError =
          error.message?.toLowerCase().includes("connection") ||
          error.message?.toLowerCase().includes("timeout") ||
          error.status === 504 ||
          error.status === 502;

        if (isConnectionError && retries > 0) {
          this.logger.warn(
            `Agent review for ${modelId} failed (${error.message}), retrying... (${retries} left)`,
          );
          retries--;
          await new Promise((resolve) => setTimeout(resolve, 2000));
          continue;
        }
        throw error;
      }
    }

    const content = completion.choices[0].message.content || "{}";
    const cleanContent = this.extractJsonBlock(content);

    return {
      model: modelId,
      content: this.safeJsonParse(cleanContent),
    };
  }

  /**
   * Splits a unified diff into per-file chunks.
   * Returns a Map of filename → diff content for that file.
   */
  private splitDiffByFile(diff: string): Map<string, string> {
    const files = new Map<string, string>();
    const filePattern = /^diff --git a\/.+? b\/(.+?)$/gm;
    let match: RegExpExecArray | null;
    const positions: Array<{ file: string; start: number }> = [];

    while ((match = filePattern.exec(diff)) !== null) {
      positions.push({ file: match[1], start: match.index });
    }

    // If no diff headers found, treat the whole diff as a single chunk
    if (positions.length === 0) {
      files.set("unknown", diff);
      return files;
    }

    for (let i = 0; i < positions.length; i++) {
      const end =
        i + 1 < positions.length ? positions[i + 1].start : diff.length;
      files.set(positions[i].file, diff.substring(positions[i].start, end));
    }

    return files;
  }

  /**
   * Returns true if a file should be skipped (binary, lock, generated, etc.)
   */
  private shouldSkipFile(filename: string): boolean {
    return this.SKIP_PATTERNS.some((p) => p.test(filename));
  }

  /**
   * Deterministic consensus builder. Replaces the expensive LLM synthesis call.
   * Votes across agents: only includes findings confirmed by ≥2 agents.
   * Uses fuzzy matching (same file + nearby line ±5 + same type) for dedup.
   */
  private buildConsensus(
    resultsByFile: Map<
      string,
      Array<{ model: string; status: string; response?: any; error?: string }>
    >,
  ): AIReviewResult {
    const findingMap = new Map<string, { finding: any; votes: number }>();
    let qualityTotal = 0;
    let securityTotal = 0;
    let agentCount = 0;

    for (const [, agentResults] of resultsByFile) {
      for (const agent of agentResults) {
        if (agent.status !== "success" || !agent.response?.content) continue;
        const content = agent.response.content;

        qualityTotal += content.qualityScore || 0;
        securityTotal += content.securityScore || 0;
        agentCount++;

        for (const f of content.findings || []) {
          // Fuzzy key: same file + nearby line (±5) + same type
          const lineGroup = Math.round((f.line || 0) / 5) * 5;
          const key = `${f.file}:${lineGroup}:${f.type}`;
          const existing = findingMap.get(key);
          if (existing) {
            existing.votes++;
            // Keep the finding with the longest rationale (most detailed)
            if (
              f.rationale &&
              f.rationale.length > (existing.finding.rationale?.length || 0)
            ) {
              existing.finding = f;
            }
          } else {
            findingMap.set(key, { finding: f, votes: 1 });
          }
        }
      }
    }

    // Only include findings with ≥2 agent agreement
    const findings = Array.from(findingMap.values())
      .filter((entry) => entry.votes >= 2)
      .map((entry) => entry.finding);

    const fileCount = resultsByFile.size;

    return {
      findings,
      qualityScore: Math.round(qualityTotal / (agentCount || 1)),
      securityScore: Math.round(securityTotal / (agentCount || 1)),
      summary: `Consensus from ${agentCount} agent reviews across ${fileCount} files. ${findings.length} issues confirmed by multi-agent agreement.`,
    };
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
      const potentialStart = content.lastIndexOf("{", match.index);
      if (potentialStart !== -1) {
        // Find the matching } by looking for the last one in the file
        const lastEnd = content.lastIndexOf("}");
        if (lastEnd > potentialStart) {
          return content.substring(potentialStart, lastEnd + 1);
        }
      }
    }

    // Fallback: Just try to find the largest block between { and }
    const firstStart = content.indexOf("{");
    const lastEnd = content.lastIndexOf("}");
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
    } catch {
      this.logger.warn(`JSON parse failed, attempting recovery...`);
      this.logger.debug(
        `Malformed JSON snippet: ${content.substring(0, 100)}...`,
      );

      let fixed = content.trim();

      // 1. Remove non-printable control characters
      fixed = fixed.replace(/[\x00-\x1F\x7F-\x9F]/g, (char) => {
        if (char === "\n" || char === "\r" || char === "\t") return char;
        return "";
      });

      // 2. Remove markdown code blocks
      fixed = fixed.replace(/^```json\s*/, "").replace(/```$/, "");

      // 3. Fix unescaped quotes inside string values
      // This looks for "key": "value "with" quotes"
      // We look for quotes that are NOT followed by , } ] or : and are NOT preceded by \
      fixed = fixed.replace(
        /:(?:\s*)"(.*?)",?(\s*[}\]])/gs,
        (match, p1, p2) => {
          const sanitized = p1.replace(/(?<!\\)"/g, '\\"');
          return `: "${sanitized}"${p2}`;
        },
      );

      // 4. Handle unquoted or single-quoted keys/values
      fixed = fixed.replace(/'([^']+)':/g, '"$1":');
      fixed = fixed.replace(/:\s*'([^']*)'/g, ': "$1"');
      fixed = fixed.replace(/([{,]\s*)([a-zA-Z0-9_]+)\s*:/g, '$1"$2":');

      // 5. Fix common backslash errors
      fixed = fixed.replace(/\\(?![nr"t\\\/])/g, "\\\\");

      // 6. Handle literal newlines
      fixed = fixed.replace(/(".*?")/gs, (match) => {
        return match.replace(/\n/g, "\\n").replace(/\r/g, "\\r");
      });

      // 7. Clean up commas
      // 7. Clean up commas
      fixed = fixed.replace(/,(\s*[\]}])/g, "$1");
      fixed = fixed.replace(/\}\s*\{/g, "},{");
      fixed = fixed.replace(/\]\s*\{/g, "],{");
      fixed = fixed.replace(/"\s*"/g, '","');

      // 8. Fix premature object closure: }, "findings": -> , "findings":
      fixed = fixed.replace(
        /\}\s*,\s*"(findings|qualityScore|securityScore|summary)"\s*:/g,
        ', "$1":',
      );

      // 9. Fix literal newlines inside strings (very common failure)
      // This regex looks for content between quotes and replaces actual newlines with \n
      fixed = fixed.replace(/"([^"\\]*(\\.[^"\\]*)*)"/g, (match) => {
        return match.replace(/\n/g, "\\n").replace(/\r/g, "\\r");
      });

      // 10. Fix backslashes escaping the closing quote: \" -> \\"
      // Often models do "file\": \"name.ts\" which breaks the string
      fixed = fixed.replace(/\\"/g, '\\\\"').replace(/\\\\\\\\"/g, '\\\\"'); // Normalize to \\"
      fixed = fixed.replace(/([^\\@])\\"/g, '$1\\\\"'); // Ensure quote is escaped with double backslash if not already

      // 11. Discard trailing "babble" (text after the last root brace)

      // 9. Discard trailing "babble" (text after the last root brace)
      const rootOpenIndex = fixed.indexOf("{");
      if (rootOpenIndex !== -1) {
        let depth = 0;
        let lastMatch = -1;
        for (let i = rootOpenIndex; i < fixed.length; i++) {
          if (fixed[i] === "{") depth++;
          if (fixed[i] === "}") depth--;
          if (depth === 0) {
            lastMatch = i;
            break;
          }
        }
        if (lastMatch !== -1) {
          fixed = fixed.substring(0, lastMatch + 1);
        }
      }

      // 8. JSON Balancer: Auto-close truncated objects/arrays
      let braceCount = 0;
      let bracketCount = 0;
      let inString = false;
      for (let i = 0; i < fixed.length; i++) {
        if (fixed[i] === '"' && fixed[i - 1] !== "\\") inString = !inString;
        if (!inString) {
          if (fixed[i] === "{") braceCount++;
          if (fixed[i] === "}") braceCount--;
          if (fixed[i] === "[") bracketCount++;
          if (fixed[i] === "]") bracketCount--;
        }
      }

      while (bracketCount > 0) {
        fixed += "]";
        bracketCount--;
      }
      while (braceCount > 0) {
        fixed += "}";
        braceCount--;
      }

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
          summary: summaryMatch
            ? summaryMatch[1]
            : "Critical: AI generated invalid JSON. Please check logs.",
        };
      }
    }
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

      qTotal += content.qualityScore || 0;
      sTotal += content.securityScore || 0;
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
    state: "pending" | "success" | "failure" | "error",
    description: string,
  ) {
    return this.githubService.updateCommitStatus(
      githubToken,
      owner,
      repoName,
      headSha,
      state,
      description,
    );
  }

  /**
   * Compares the current findings with findings from the previous analysis
   * on the same PR. If an old finding is no longer present, mark it resolved.
   */
  private async resolveOldFindings(
    owner: string,
    repoName: string,
    prNumber: number,
    currentFindings: any[],
    githubToken: string,
  ) {
    // 1. Fetch previous analysis for this PR
    const analyses = await this.prisma.analysis.findMany({
      where: { repoName, prNumber },
      orderBy: { createdAt: "desc" },
      take: 2, // We want the one right before the current one
      include: { findings: true },
    });

    if (analyses.length < 2) return; // No previous analysis to compare with

    const previousAnalysis = analyses[1];

    for (const oldFinding of previousAnalysis.findings) {
      if (oldFinding.status === "resolved") continue;

      // Check if it exists in the current findings (match by file and similar issue type/rationale snippet)
      // Since line numbers can shift when code is added/removed above, matching by line exactly is brittle.
      // We will match by file and issue type.
      const isStillPresent = currentFindings.some(
        (newFinding) =>
          newFinding.file === oldFinding.file &&
          newFinding.type === oldFinding.type,
      );

      if (!isStillPresent) {
        // Mark as resolved in database
        await this.prisma.finding.update({
          where: { id: oldFinding.id },
          data: { status: "resolved" },
        });

        this.logger.log(
          `Marking previous finding as resolved: ${oldFinding.id} (Comment: ${oldFinding.githubCommentId})`,
        );

        // Mark as resolved on GitHub
        if (oldFinding.githubCommentId) {
          await this.githubService.markCommentAsResolved(
            githubToken,
            owner,
            repoName,
            oldFinding.githubCommentId,
          );
        }
      }
    }
  }
}
