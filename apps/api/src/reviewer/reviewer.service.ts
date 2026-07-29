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

  // Actual NVIDIA NIM model IDs for mapping.
  //
  // NOTE: as of 2026-07-29, verified against https://integrate.api.nvidia.com/v1
  // with this account's keys, several of the originally intended models are
  // dead: three have been retired by NVIDIA (410 Gone), and three more are
  // simply not entitled on this account (they hang indefinitely rather than
  // erroring, regardless of which key is used — confirmed by swapping keys).
  // Each broken slot below is substituted with a model that IS entitled and
  // responds reliably in under ~1.5s, so every configured key stays usable.
  private readonly MODEL_MAPPING: Record<string, string> = {
    "deepseek-v4-flash": "deepseek-ai/deepseek-v4-flash",
    "deepseek-v4-pro": "nvidia/nemotron-3-nano-30b-a3b",
    "mistral-medium-3.5": "mistralai/mistral-nemotron",
    // nemotron-mini-4b-instruct (4B) was tried here first but is too weak
    // for this task: it repeatedly hallucinated placeholder content
    // ("path/to/file.ts", fabricated URLs, wrong file paths) instead of
    // analyzing the actual diff, which silently broke consensus — its
    // findings could never fuzzy-match a genuine finding from another
    // agent since it never reported the real file. Swapped for a larger
    // model that's still fast but noticeably more reliable.
    "mistral-small-4": "nvidia/nemotron-nano-12b-v2-vl",
    "minimax-m2.7": "meta/llama-3.2-11b-vision-instruct",
    "nemotron-3-super": "nvidia/nemotron-3-super-120b-a12b",
    "llama-3.1": "meta/llama-3.1-70b-instruct",
    "gemma-2-27b": "nvidia/nvidia-nemotron-nano-9b-v2",
    "gemma-3": "nvidia/nvidia-nemotron-nano-9b-v2",
    "phi-4": "meta/llama-3.2-3b-instruct",
  };

  /**
   * Priority-ordered pool of internal model keys used to backfill a file's
   * review when fewer than MIN_SUCCESSES_PER_FILE agents succeed on it.
   * Ordered fastest-verified-first.
   */
  private readonly FALLBACK_PRIORITY: string[] = [
    "mistral-small-4",
    "gemma-2-27b",
    "phi-4",
    "deepseek-v4-pro",
    "minimax-m2.7",
    "mistral-medium-3.5",
    "nemotron-3-super",
    "deepseek-v4-flash",
    "llama-3.1",
  ];

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
      timeout: 30000, // verified models reply in under ~1.5s; 30s is generous, not a stall
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
      "nemotron-3-super",
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
      //    Rate-limit guard: batch in groups of concurrent requests
      const CONCURRENCY_LIMIT = 10;
      // Hard ceiling on how long the whole agent-calling phase (initial +
      // fallback batches) is allowed to run. Without this, a large PR or a
      // sustained rate-limit storm has no upper bound — each task can take
      // up to ~65s (30s timeout + 1 retry), so a handful of unlucky batches
      // could otherwise stretch a review to many minutes. Once the deadline
      // passes, remaining batches are skipped and the review proceeds with
      // whatever was gathered so far rather than keep waiting.
      const analysisStartedAt = Date.now();
      const AGENT_PHASE_DEADLINE_MS = 90_000;
      const deadlineExceeded = () =>
        Date.now() - analysisStartedAt > AGENT_PHASE_DEADLINE_MS;
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
                const response = await this.getAgentReview(
                  model,
                  chunk,
                  filename,
                );
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
        if (deadlineExceeded()) {
          this.logger.warn(
            `Agent phase deadline (${AGENT_PHASE_DEADLINE_MS}ms) reached; skipping remaining ${allTasks.length - i} initial task(s) to keep the review fast.`,
          );
          break;
        }
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

      // 3b. Guarantee coverage: if a model fails (bad key, retired model,
      // rate limit, etc.), a file can be left with 0 or 1 successful
      // reviews — which also means it can never clear buildConsensus()'s
      // >=2-vote threshold below. Backfill any under-covered file with
      // untried models from FALLBACK_PRIORITY so consensus stays possible.
      const MIN_SUCCESSES_PER_FILE = 2;
      const MAX_FALLBACK_ATTEMPTS_PER_FILE = 2;

      const attemptedByFile = new Map<string, Set<string>>();
      const successesByFile = new Map<string, number>();
      for (const { file, model, result } of allResults) {
        if (!attemptedByFile.has(file)) attemptedByFile.set(file, new Set());
        attemptedByFile.get(file)!.add(model);
        if (result.status === "success") {
          successesByFile.set(file, (successesByFile.get(file) || 0) + 1);
        }
      }

      const fallbackTasks: typeof allTasks = [];
      for (const [filename, chunk] of reviewableFiles) {
        if ((successesByFile.get(filename) || 0) >= MIN_SUCCESSES_PER_FILE) {
          continue;
        }
        const attempted = attemptedByFile.get(filename) || new Set<string>();
        let added = 0;
        for (const candidateModel of this.FALLBACK_PRIORITY) {
          if (added >= MAX_FALLBACK_ATTEMPTS_PER_FILE) break;
          if (attempted.has(candidateModel)) continue;
          attempted.add(candidateModel);
          added++;
          fallbackTasks.push({
            file: filename,
            model: candidateModel,
            promise: async () => {
              try {
                const response = await this.getAgentReview(
                  candidateModel,
                  chunk,
                  filename,
                );
                return { model: candidateModel, status: "success", response };
              } catch (e: any) {
                this.logger.error(
                  `Fallback agent ${candidateModel} failed on ${filename}: ${e.message}`,
                );
                return {
                  model: candidateModel,
                  status: "failed",
                  error: e.message,
                };
              }
            },
          });
        }
      }

      if (fallbackTasks.length > 0 && deadlineExceeded()) {
        this.logger.warn(
          `Agent phase deadline already reached; skipping ${fallbackTasks.length} fallback task(s) to keep the review fast.`,
        );
      } else if (fallbackTasks.length > 0) {
        this.logger.log(
          `${fallbackTasks.length} file(s) had fewer than ${MIN_SUCCESSES_PER_FILE} successful reviews; running fallback agents to guarantee coverage...`,
        );
        for (let i = 0; i < fallbackTasks.length; i += CONCURRENCY_LIMIT) {
          if (deadlineExceeded()) {
            this.logger.warn(
              `Agent phase deadline reached; skipping remaining ${fallbackTasks.length - i} fallback task(s).`,
            );
            break;
          }
          const batch = fallbackTasks.slice(i, i + CONCURRENCY_LIMIT);
          const batchResults = await Promise.all(
            batch.map(async (task) => ({
              file: task.file,
              model: task.model,
              result: await task.promise(),
            })),
          );
          allResults.push(...batchResults);
        }
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

      // Build flat agentResults array for debateLog. Keeps `file` alongside
      // each result so the UI can tell which agents actually reviewed a
      // given finding's file, instead of treating every agent that ran
      // anywhere in the PR as having an opinion on every finding.
      const agentResults = allResults.map((r) => ({
        file: r.file,
        ...r.result,
      }));
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

      // 4. Deterministic pre-filter: vote across agents per file (fast, no LLM call)
      const pooledCandidate = this.buildConsensus(resultsByFile);

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
        "Cross-checking findings across agents... 85%",
      );

      // 4b. Cross-model communication: have a judge model read every agent's
      // findings side by side (who flagged what, and why) and produce the
      // final, reconciled verdict — dropping false positives, merging
      // duplicates the fuzzy-match missed, and calling out where the models
      // agreed or disagreed. One extra call total, not per file, so it stays
      // fast; falls back to the deterministic result if the judge call fails.
      const synthesis = await this.synthesizeFindings(
        pooledCandidate,
        resultsByFile,
      );

      await this.githubService.updateCommitStatus(
        githubToken,
        owner,
        repoName,
        headSha,
        "pending",
        "Finalizing the review report... 90%",
      );

      // 5. Store findings and update analysis
      //
      // Don't create a new row (and thus a new duplicate comment) for a
      // finding that's already tracked as open from a previous commit on
      // this PR — the same unresolved issue would otherwise get a fresh
      // comment on every push. Only genuinely new findings get new rows;
      // still-open ones keep their original comment/thread.
      const openFindings = await this.prisma.finding.findMany({
        where: {
          analysis: { repoName, prNumber },
          status: { not: "resolved" },
        },
      });

      const newFindings = synthesis.findings.filter(
        (f) => !this.findMatchingFinding(f, openFindings),
      );

      if (newFindings.length < synthesis.findings.length) {
        this.logger.log(
          `${synthesis.findings.length - newFindings.length} finding(s) already tracked as open from a previous commit — skipping duplicate comments.`,
        );
      }

      const createdFindings = await this.prisma.finding.createManyAndReturn({
        data: newFindings.map((f) => ({
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
          debateLog: {
            agents: agentResults,
            judgeModel: this.JUDGE_MODEL,
            judgeApplied: synthesis.judgeApplied,
          } as any,
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
        // Distinguish *why* there's nothing to post inline — these read
        // very differently to a user: "nothing wrong" vs "already flagged
        // last commit" vs "the model hallucinated a file that isn't in
        // this diff" are not the same situation and shouldn't share one
        // generic message.
        const reason: "none" | "already-tracked" | "invalid-paths" =
          synthesis.findings.length === 0
            ? "none"
            : createdFindings.length === 0
              ? "already-tracked"
              : "invalid-paths";

        this.logger.log(
          {
            none: "No issues found. Posting summary only.",
            "already-tracked":
              "All findings this round are already tracked as open from a previous commit — no new comments to post. Posting summary only.",
            "invalid-paths":
              "New findings referenced files outside the current diff — withholding inline comments. Posting summary only.",
          }[reason],
        );

        await this.githubService.postSummaryOnly(
          githubToken,
          owner,
          repoName,
          prNumber,
          synthesis.findings.length,
          synthesis.qualityScore,
          synthesis.securityScore,
          reason,
        );
      }

      // 7. Cross-commit comparison for resolved issues. Compare against
      // synthesis.findings (the full current judgment: new + still-open),
      // not createdFindings (only the newly-inserted rows) — otherwise a
      // still-open, deduped-away finding would look "missing" this round
      // and get wrongly marked resolved.
      const reviewedFiles = new Set(
        reviewableFiles.map(([filename]) => filename),
      );
      await this.resolveOldFindings(
        owner,
        repoName,
        prNumber,
        synthesis.findings,
        reviewedFiles,
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

  private async getAgentReview(
    modelId: string,
    diff: string,
    filename: string,
  ) {
    const client = this.getClient(modelId);
    const model = this.MODEL_MAPPING[modelId] || modelId;
    const apiKey = this.getModelKey(modelId);

    this.logger.debug(
      `AI Request: model=${model} key=${apiKey.substring(0, 10)}... URL=https://integrate.api.nvidia.com/v1`,
    );

    // Truncate per-file chunk to keep prompts small and fast
    const MAX_CHUNK_CHARS = 15000;
    const safeDiff =
      diff.length > MAX_CHUNK_CHARS
        ? diff.substring(0, MAX_CHUNK_CHARS) +
          "\n\n...[FILE DIFF TRUNCATED — showing first 15K chars]..."
        : diff;

    const prompt = `You are a strict, robotic Code Review Agent.
Analyze the following CODE DIFF and report every issue you find in these categories:
- Security vulnerabilities (injection, auth/authz bypass, exposed secrets or credentials, unsafe deserialization, SSRF, path traversal, insecure defaults, etc.)
- Bugs (logic errors, incorrect conditionals, off-by-one errors, race conditions, unhandled edge cases, null/undefined handling, resource leaks)
- Performance bottlenecks (unnecessary loops/re-renders, N+1 queries, blocking calls, unbounded memory/growth)
- Code quality and maintainability issues (dead code, duplicated logic, unclear naming, missing error handling, violations of the language/framework's conventions)

Classify each finding's "type" using this scale, and hold every finding to it consistently:
- "Critical": would break functionality, crash, corrupt data, or cause a severe outage if merged as-is.
- "Vulnerability": a real, exploitable security weakness (this is specifically for security issues, not general bugs).
- "Warning": a genuine bug, performance problem, or quality issue that should be fixed but isn't immediately breaking.
- "Info": a minor suggestion, style nit, or informational observation with no functional impact.

CODE DIFF:
${safeDiff}

IMPORTANT JSON INSTRUCTIONS:
1. You MUST output ONLY valid JSON.
2. You MUST NOT wrap the JSON in markdown blocks like \`\`\`json.
3. You MUST use exactly the schema provided below. Do not add keys like "critical_issues".
4. The "reference" must be a real, valid URL.

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
    // One retry only: with a 30s client timeout, a model that's genuinely
    // unreachable (not entitled, retired) will just time out again on
    // retry. Cross-model fallback (see FALLBACK_PRIORITY) is what actually
    // recovers from a dead model — this retry is only for transient blips.
    let retries = 1;

    while (retries >= 0) {
      try {
        completion = await client.chat.completions.create({
          model,
          messages: [
            {
              role: "system",
              content:
                "You are an AI code reviewer that outputs ONLY raw JSON. You must strictly follow the requested JSON schema. Never include markdown code blocks. Never include explanations. Use double quotes for all JSON properties.",
            },
            { role: "user", content: prompt },
          ],
          max_tokens: 2000,
          temperature: 0.1,
        });
        break;
      } catch (error: any) {
        const isRateLimited = error.status === 429 || error.status === 503;
        const isRetryable =
          isRateLimited ||
          error.message?.toLowerCase().includes("connection") ||
          error.message?.toLowerCase().includes("timeout") ||
          error.status === 504 ||
          error.status === 502;

        if (isRetryable && retries > 0) {
          // Rate limits (NVIDIA's shared endpoint enforces a per-account
          // request quota — e.g. "Worker local total request limit
          // reached") need a longer backoff than a plain connection blip.
          const backoffMs = isRateLimited ? 4000 : 1000;
          this.logger.warn(
            `Agent review for ${modelId} failed (${error.message}), retrying in ${backoffMs}ms... (${retries} left)`,
          );
          retries--;
          await new Promise((resolve) => setTimeout(resolve, backoffMs));
          continue;
        }
        throw error;
      }
    }

    const content = completion.choices[0].message.content || "{}";
    const cleanContent = this.extractJsonBlock(content);
    const parsed = this.safeJsonParse(cleanContent);

    // A model can return a technically-successful HTTP response with an
    // empty completion (content: "" -> defaults to "{}" above), which
    // parses fine but carries no real signal — no findings array, no
    // scores. Treating that as a genuine "success" would silently drag
    // down averaged scores (0 gets substituted for a missing score) and
    // count as a real vote of confidence it never actually gave. Throwing
    // here makes the caller correctly record it as a failure, which is
    // what triggers seeking a real replacement opinion via fallback.
    const hasFindings = Array.isArray(parsed?.findings);
    const hasScores =
      typeof parsed?.qualityScore === "number" ||
      typeof parsed?.securityScore === "number";
    if (!hasFindings && !hasScores) {
      throw new Error(
        `Model ${modelId} returned an empty or unusable response`,
      );
    }

    // Each call only ever sees one file's diff chunk, so there's no
    // ambiguity about which file a finding belongs to — never trust the
    // model's self-reported "file" field. Weaker models routinely
    // hallucinate it (wrong path, a literal "path/to/file.ts" placeholder,
    // or text copied from elsewhere in the diff), which silently breaks
    // consensus: a finding that never reports the real file can never be
    // fuzzy-matched against another agent's genuine finding on that file.
    if (hasFindings) {
      for (const finding of parsed.findings) {
        finding.file = filename;
      }
    }

    return {
      model: modelId,
      content: parsed,
    };
  }

  /**
   * Splits a unified diff into per-file chunks.
   * Returns a Map of filename → diff content for that file.
   */
  private splitDiffByFile(diff: string): Map<string, string> {
    const files = new Map<string, string>();
    const filePattern = /^diff --git a\/\S+ b\/(\S+)$/gm;
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
    let qualityCount = 0;
    let securityTotal = 0;
    let securityCount = 0;
    let agentCount = 0;

    for (const [, agentResults] of resultsByFile) {
      for (const agent of agentResults) {
        if (agent.status !== "success" || !agent.response?.content) continue;
        const content = agent.response.content;

        // Only average over agents that actually reported a score — a
        // missing score should never silently count as a 0 and drag the
        // average down.
        if (typeof content.qualityScore === "number") {
          qualityTotal += content.qualityScore;
          qualityCount++;
        }
        if (typeof content.securityScore === "number") {
          securityTotal += content.securityScore;
          securityCount++;
        }
        agentCount++;

        for (const f of content.findings || []) {
          // Fuzzy key: same file + nearby line (±5). Deliberately NOT
          // keyed on type — models routinely agree on *where* an issue is
          // while disagreeing on its severity label (one says "Info",
          // another says "Warning" for the identical line). Requiring an
          // exact type match would treat that as two unrelated
          // single-vote findings instead of one 2-vote confirmed one.
          const lineGroup = Math.round((f.line || 0) / 5) * 5;
          const key = `${f.file}:${lineGroup}`;
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
      qualityScore: Math.round(qualityTotal / (qualityCount || 1)),
      securityScore: Math.round(securityTotal / (securityCount || 1)),
      summary: `Consensus from ${agentCount} agent reviews across ${fileCount} files. ${findings.length} issues confirmed by multi-agent agreement.`,
    };
  }

  /** Model used to synthesize the final verdict from all agents' findings. */
  private readonly JUDGE_MODEL = "nemotron-3-super";

  /**
   * Cross-model communication step: shows a judge model every candidate
   * finding side by side with which agent(s) raised it, and asks it to
   * reconcile them into one final verdict — dropping false positives,
   * merging duplicates the deterministic fuzzy-match missed, and explaining
   * where the agents agreed or disagreed. This is the one place agents'
   * outputs actually inform each other, rather than being pooled by a
   * fixed vote-count rule.
   *
   * Always falls back to the deterministic `candidate` result on any
   * failure (bad JSON, timeout, judge model down) so a flaky judge call
   * never breaks or blocks the review.
   */
  private async synthesizeFindings(
    candidate: AIReviewResult,
    resultsByFile: Map<
      string,
      Array<{ model: string; status: string; response?: any; error?: string }>
    >,
  ): Promise<AIReviewResult & { judgeApplied: boolean }> {
    if (candidate.findings.length === 0) {
      // Nothing to reconcile — skip the extra call entirely to stay fast.
      return { ...candidate, judgeApplied: false };
    }

    const digest = candidate.findings
      .map((f, i) => {
        const voters = new Set<string>();
        for (const [, agentResults] of resultsByFile) {
          for (const agent of agentResults) {
            if (agent.status !== "success" || !agent.response?.content) {
              continue;
            }
            // Same file+line-bucket match as buildConsensus() — not keyed
            // on type, so a model that agreed on the location but called
            // it a different severity still shows up as a voter.
            const lineGroup = Math.round((f.line || 0) / 5) * 5;
            const matched = (agent.response.content.findings || []).some(
              (cf: any) =>
                cf.file === f.file &&
                Math.round((cf.line || 0) / 5) * 5 === lineGroup,
            );
            if (matched) voters.add(agent.model);
          }
        }
        return (
          `${i + 1}. [${f.file}:${f.line}] ${f.type} (flagged by: ${Array.from(voters).join(", ") || "unknown"})\n` +
          `   Issue: ${f.issue}\n` +
          `   Rationale: ${(f.rationale || "").substring(0, 300)}`
        );
      })
      .join("\n\n");

    const prompt = `You are the final judge on a multi-agent AI code review panel. Several independent reviewer models analyzed a pull request and produced the candidate findings below, each annotated with which model(s) raised it.

Cross-check these findings against each other. Drop anything that looks like a false positive, a near-duplicate, or is too speculative to act on. Where reviewers disagree, or one model caught something the others missed, briefly say so in the summary.

CANDIDATE FINDINGS:
${digest}

IMPORTANT JSON INSTRUCTIONS:
1. Output ONLY valid JSON, no markdown code blocks.
2. Use exactly the schema below.
3. "reference" must be a real, valid URL.

{
  "findings": [
    { "file": "string", "line": number, "issue": "string", "type": "Critical|Vulnerability|Warning|Info", "confidence": "High|Medium|Low", "rationale": "string", "resolution": "string", "reference": "URL" }
  ],
  "qualityScore": number (0-100),
  "securityScore": number (0-100),
  "summary": "string — mention where the reviewer models agreed or disagreed"
}`;

    try {
      const client = this.getClient(this.JUDGE_MODEL);
      const model = this.MODEL_MAPPING[this.JUDGE_MODEL] || this.JUDGE_MODEL;

      const completion = await client.chat.completions.create({
        model,
        messages: [
          {
            role: "system",
            content:
              "You are an AI judge that outputs ONLY raw JSON, reconciling multiple code reviewers' findings into one final verdict. Never include markdown or explanations outside the JSON.",
          },
          { role: "user", content: prompt },
        ],
        max_tokens: 3000,
        temperature: 0.1,
      });

      const content = completion.choices[0].message.content || "{}";
      const parsed = this.safeJsonParse(this.extractJsonBlock(content));

      if (!Array.isArray(parsed.findings)) {
        throw new Error("Judge response was missing a findings array");
      }

      return {
        findings: parsed.findings,
        qualityScore:
          typeof parsed.qualityScore === "number"
            ? parsed.qualityScore
            : candidate.qualityScore,
        securityScore:
          typeof parsed.securityScore === "number"
            ? parsed.securityScore
            : candidate.securityScore,
        summary: parsed.summary || candidate.summary,
        judgeApplied: true,
      };
    } catch (e: any) {
      this.logger.warn(
        `Judge synthesis failed (${e.message}), falling back to deterministic consensus.`,
      );
      return { ...candidate, judgeApplied: false };
    }
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
   * Fuzzy match used to tell whether two findings represent the same
   * underlying issue (same file, line within 5 — matches the tolerance
   * buildConsensus() uses, since a fix or unrelated edit can shift line
   * numbers slightly without changing the issue). Deliberately not keyed
   * on type: independent AI judgments of the same issue's severity can
   * drift between "Info" and "Warning" across models or even across
   * commits, and that shouldn't cause a duplicate comment or a missed
   * resolution.
   */
  private findMatchingFinding(
    candidate: { file: string; line: number },
    pool: Array<{ file: string; line: number }>,
  ) {
    return pool.find(
      (f) =>
        f.file === candidate.file &&
        Math.abs((f.line || 0) - (candidate.line || 0)) <= 5,
    );
  }

  /**
   * Compares this commit's full judgment (new + still-open findings)
   * against every currently-open finding tracked for this PR. An open
   * finding only gets marked resolved if its file was actually reviewed
   * this round and the issue no longer shows up — an untouched file's old
   * findings are left alone, since silence there means "not reviewed
   * this time," not "fixed."
   */
  private async resolveOldFindings(
    owner: string,
    repoName: string,
    prNumber: number,
    currentFindings: any[],
    reviewedFiles: Set<string>,
    githubToken: string,
  ) {
    const openFindings = await this.prisma.finding.findMany({
      where: {
        analysis: { repoName, prNumber },
        status: { not: "resolved" },
      },
    });

    for (const oldFinding of openFindings) {
      if (!reviewedFiles.has(oldFinding.file)) continue; // not reviewed this round — leave as-is

      const isStillPresent = this.findMatchingFinding(
        oldFinding,
        currentFindings,
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
