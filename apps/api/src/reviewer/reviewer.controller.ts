import {
  Controller,
  Post,
  Body,
  Get,
  Param,
  UseGuards,
  Request,
  Patch,
} from "@nestjs/common";
import { ReviewerService } from "./reviewer.service";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { PrismaService } from "../prisma/prisma.service";
import { Octokit } from "octokit";

@Controller("reviewer")
export class ReviewerController {
  constructor(
    private readonly reviewerService: ReviewerService,
    private readonly prisma: PrismaService,
  ) {}

  @UseGuards(JwtAuthGuard)
  @Post("analyze")
  async analyzePR(
    @Request() req,
    @Body()
    body: {
      repoName: string;
      prNumber: number;
      title: string;
      diff: string;
      models?: string[];
      githubToken: string;
      owner: string;
      headSha: string;
    },
  ) {
    return this.reviewerService.performDebateReview(
      req.user.id,
      body.repoName,
      body.prNumber,
      body.title,
      body.diff,
      body.githubToken,
      body.owner,
      body.headSha,
      body.models,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Get("analysis/:id")
  async getAnalysis(@Request() req, @Param("id") id: string) {
    const analysis = await this.prisma.analysis.findUnique({
      where: { id },
      include: { findings: true },
    });

    if (!analysis) return null;

    if (analysis.status === "in_progress" || analysis.status === "pending") {
      try {
        const repoRecord = await this.prisma.repository.findFirst({
          where: { name: analysis.repoName, userId: analysis.userId },
        });

        const user = await this.prisma.user.findUnique({
          where: { id: analysis.userId },
        });

        if (repoRecord && user && user.githubToken) {
          const octokit = new Octokit({ auth: user.githubToken });
          const { data: pr } = await octokit.rest.pulls.get({
            owner: repoRecord.owner,
            repo: analysis.repoName,
            pull_number: analysis.prNumber,
          });

          if (pr && pr.state === "closed") {
            const updatedAnalysis = await this.prisma.analysis.update({
              where: { id: analysis.id },
              data: {
                status: "stopped",
                summary:
                  "The AI analysis has been stopped because the pull request has been closed.",
              },
              include: { findings: true },
            });

            try {
              await this.reviewerService.updateCommitStatus(
                user.githubToken,
                repoRecord.owner,
                analysis.repoName,
                pr.head.sha,
                "failure",
                "AI Analysis stopped - Pull request closed.",
              );
            } catch (statusErr) {
              this.reviewerService["logger"].error(
                `Failed to update status on dynamic abort: ${statusErr.message}`,
              );
            }

            return updatedAnalysis;
          }
        }
      } catch (err: any) {
        this.reviewerService["logger"].error(
          `Failed dynamic PR status check: ${err.message}`,
        );
      }
    }

    return this.mapAgentReasonings(analysis);
  }

  @UseGuards(JwtAuthGuard)
  @Get("repo/:repoName/pr/:prNumber/analysis")
  async getAnalysisByPr(
    @Request() req,
    @Param("repoName") repoName: string,
    @Param("prNumber") prNumber: string,
  ) {
    const analysis = await this.prisma.analysis.findFirst({
      where: { repoName, prNumber: parseInt(prNumber, 10) },
      orderBy: { createdAt: "desc" },
      include: { findings: true },
    });

    if (!analysis) return null;

    if (analysis.status === "in_progress" || analysis.status === "pending") {
      try {
        const repoRecord = await this.prisma.repository.findFirst({
          where: { name: repoName, userId: analysis.userId },
        });

        const user = await this.prisma.user.findUnique({
          where: { id: analysis.userId },
        });

        if (repoRecord && user && user.githubToken) {
          const octokit = new Octokit({ auth: user.githubToken });
          const { data: pr } = await octokit.rest.pulls.get({
            owner: repoRecord.owner,
            repo: repoName,
            pull_number: parseInt(prNumber, 10),
          });

          if (pr && pr.state === "closed") {
            const updatedAnalysis = await this.prisma.analysis.update({
              where: { id: analysis.id },
              data: {
                status: "stopped",
                summary:
                  "The AI analysis has been stopped because the pull request has been closed.",
              },
              include: { findings: true },
            });

            try {
              await this.reviewerService.updateCommitStatus(
                user.githubToken,
                repoRecord.owner,
                repoName,
                pr.head.sha,
                "failure",
                "AI Analysis stopped - Pull request closed.",
              );
            } catch (statusErr) {
              this.reviewerService["logger"].error(
                `Failed to update status on dynamic abort: ${statusErr.message}`,
              );
            }

            return this.mapAgentReasonings(updatedAnalysis);
          }
        }
      } catch (err: any) {
        this.reviewerService["logger"].error(
          `Failed dynamic PR status check: ${err.message}`,
        );
      }
    }

    return this.mapAgentReasonings(analysis);
  }

  @UseGuards(JwtAuthGuard)
  @Get("repo/:repoName/pr/:prNumber/history")
  async getPrAnalysisHistory(
    @Param("repoName") repoName: string,
    @Param("prNumber") prNumber: string,
  ) {
    const analyses = await this.prisma.analysis.findMany({
      where: { repoName, prNumber: parseInt(prNumber, 10) },
      orderBy: { createdAt: "desc" },
      include: { findings: true },
    });
    return analyses.map((a) => this.mapAgentReasonings(a));
  }

  @Get("repo/:repoName/pr/:prNumber/status")
  async getStatusByPr(
    @Param("repoName") repoName: string,
    @Param("prNumber") prNumber: string,
  ) {
    const analysis = await this.prisma.analysis.findFirst({
      where: { repoName, prNumber: parseInt(prNumber, 10) },
      orderBy: { createdAt: "desc" },
      select: {
        status: true,
        models: true,
        createdAt: true,
      },
    });
    return this.mapAgentReasonings(analysis) || { status: "not_found" };
  }

  @UseGuards(JwtAuthGuard)
  @Get("settings")
  async getSettings(@Request() req) {
    const user = await this.prisma.user.findUnique({
      where: { id: req.user.id },
      select: { selectedModels: true },
    });
    return user;
  }

  @UseGuards(JwtAuthGuard)
  @Patch("settings")
  async updateSettings(
    @Request() req,
    @Body() body: { selectedModels: string[] },
  ) {
    return this.prisma.user.update({
      where: { id: req.user.id },
      data: { selectedModels: body.selectedModels },
    });
  }

  @UseGuards(JwtAuthGuard)
  @Get("active-repos")
  async getActiveRepos(@Request() req) {
    return this.prisma.repository.findMany({
      where: {
        userId: req.user.id,
        isActive: true,
      },
    });
  }
  @UseGuards(JwtAuthGuard)
  @Get("repo/:repoName/prs/status")
  async getRepoPrsStatus(@Param("repoName") repoName: string) {
    const analyses = await this.prisma.analysis.findMany({
      where: { repoName },
      orderBy: { createdAt: "desc" },
      include: { findings: true },
    });

    const latestByPr = {};
    for (const analysis of analyses) {
      if (!latestByPr[analysis.prNumber]) {
        latestByPr[analysis.prNumber] = {
          status: analysis.status,
          qualityScore: analysis.qualityScore,
          vuls: analysis.findings.filter(
            (f) => f.type === "Vulnerability" || f.type === "Critical",
          ).length,
          recs: analysis.findings.length,
        };
      }
    }
    return latestByPr;
  }
  @Get("history")
  async getHistory(@Request() req) {
    return this.prisma.analysis.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: "desc" },
    });
  }

  private mapAgentReasonings(analysis: any) {
    if (analysis && analysis.findings && analysis.debateLog) {
      const debateLog: any = analysis.debateLog;
      if (debateLog.agents && Array.isArray(debateLog.agents)) {
        analysis.findings = analysis.findings.map((finding) => {
          // Only consider agents that were actually attempted on this
          // finding's file (debateLog.agents has one entry per (file x
          // model) task run across the whole PR, so most entries are
          // irrelevant to any given finding). Failed attempts are kept —
          // a selected model that errored out (rate limit, timeout) should
          // show as "didn't respond", not silently disappear as if it was
          // never part of the review.
          const relevantAgents = debateLog.agents.filter(
            (agent) => agent.file === finding.file,
          );

          // The same model can still appear more than once for this file if
          // it was retried as its own fallback pick elsewhere; dedupe to one
          // reasoning per unique model, preferring a positive verdict.
          const byModel = new Map<string, any>();

          // Same fuzzy match buildConsensus() used to group votes at write
          // time (nearest-5 line bucket, not keyed on type) — an exact
          // line+type match here would miss agents whose reported line was
          // a few lines off, or who agreed on the location but called it a
          // different severity, making a genuinely multi-agent finding
          // look single-agent.
          const findingLineGroup = Math.round((finding.line || 0) / 5) * 5;

          for (const agent of relevantAgents) {
            const existing = byModel.get(agent.model);
            if (existing?.verdict === "positive") continue; // already confirmed positive

            if (agent.status !== "success") {
              // Never overwrite a real verdict from a different attempt of
              // the same model with a failure from another attempt.
              if (!existing) {
                byModel.set(agent.model, {
                  agentId: agent.model,
                  agentName: agent.model,
                  verdict: "neutral",
                  reasoning: agent.error
                    ? `This agent did not respond: ${agent.error}`
                    : "This agent did not respond.",
                  confidence: 0,
                });
              }
              continue;
            }

            // Not a missing check — type is excluded from this match
            // ON PURPOSE (see comment above). Do not add `f.type ===
            // finding.type` here; that was tried, and it broke consensus
            // detection for the exact reason explained above.
            const content = agent.response?.content;
            const agentFinding = content?.findings?.find(
              (f) =>
                f.file === finding.file &&
                Math.round((f.line || 0) / 5) * 5 === findingLineGroup,
            );

            if (agentFinding) {
              byModel.set(agent.model, {
                agentId: agent.model,
                agentName: agent.model,
                verdict: "positive",
                reasoning:
                  agentFinding.rationale ||
                  agentFinding.issue ||
                  "Identified the issue.",
                confidence:
                  agentFinding.confidence === "High"
                    ? 0.9
                    : agentFinding.confidence === "Medium"
                      ? 0.6
                      : 0.3,
              });
            } else if (!existing || existing.verdict === "neutral") {
              // No fabricated constant: use this agent's own reported scores
              // for the file as its "confidence nothing's wrong here" —
              // varies per model/file instead of a flat placeholder.
              const quality = content?.qualityScore;
              const security = content?.securityScore;
              const scores = [quality, security].filter(
                (s) => typeof s === "number",
              );
              const derivedConfidence =
                scores.length > 0
                  ? scores.reduce((a, b) => a + b, 0) / scores.length / 100
                  : 0.5;

              byModel.set(agent.model, {
                agentId: agent.model,
                agentName: agent.model,
                verdict: "negative",
                reasoning:
                  "The agent did not flag any issue on this specific line.",
                confidence: derivedConfidence,
              });
            }
          }

          const agentReasonings = Array.from(byModel.values());

          return {
            ...finding,
            agentReasonings,
            consensus:
              agentReasonings.filter((r) => r.verdict === "positive").length >
              1,
          };
        });

        // Only ever surface findings backed by 2+ agreeing agents. This
        // should already hold from buildConsensus()'s write-time vote
        // threshold, but the judge synthesis step (or the fuzzy-vs-exact
        // matching above) can still leave a straggler — never display a
        // single-agent finding as if it were reviewed by the panel.
        analysis.findings = analysis.findings.filter((f) => f.consensus);
      }
    }
    return analysis;
  }
}
