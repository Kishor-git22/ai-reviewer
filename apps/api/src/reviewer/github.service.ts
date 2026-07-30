import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Octokit } from "octokit";

@Injectable()
export class GithubService {
  private readonly logger = new Logger(GithubService.name);

  constructor(private readonly configService: ConfigService) {}

  /**
   * Post analysis findings as comments on a GitHub Pull Request
   */
  async postComments(
    githubToken: string,
    owner: string,
    repo: string,
    prNumber: number,
    findings: any[],
    headSha: string,
  ): Promise<Record<string, string>> {
    const octokit = new Octokit({ auth: githubToken });
    const frontendUrl =
      this.configService.get("FRONTEND_URL") || "http://localhost:3000";

    this.logger.log(
      `Posting ${findings.length} findings as a review to ${owner}/${repo} PR #${prNumber}`,
    );

    const commentIds: Record<string, string> = {};

    try {
      const review = await octokit.rest.pulls.createReview({
        owner,
        repo,
        pull_number: prNumber,
        commit_id: headSha,
        event: "COMMENT",
        comments: findings.map((finding) => ({
          path: finding.file,
          line: finding.line,
          body: `### AI Finding: ${finding.type}\n**Issue:** ${finding.issue}\n\n**Rationale:** ${finding.rationale}\n\n**Suggested Resolution:**\n\`\`\`\n${finding.resolution}\n\`\`\`\n\n---\n*Detected in commit ${headSha.substring(0, 7)} at ${new Date().toLocaleString()}*`,
        })),
      });

      // Fetch the comments for this review to get their IDs
      const reviewComments = await octokit.rest.pulls.listCommentsForReview({
        owner,
        repo,
        pull_number: prNumber,
        review_id: review.data.id,
      });

      // Match them back to our findings based on path, line, and a snippet of the body
      for (const finding of findings) {
        const match = reviewComments.data.find(
          (c) =>
            c.path === finding.file &&
            (c.line === finding.line || c.original_line === finding.line) &&
            c.body.includes(finding.type),
        );
        if (match) {
          commentIds[finding.id] = match.id.toString();
        }
      }
    } catch (error: any) {
      this.logger.error(`Failed to post batch review: ${error.message}`);
      this.logger.warn(`Falling back to individual comments...`);

      // Fallback: Post comments one by one so that individual path errors don't block everything
      for (const finding of findings) {
        try {
          const comment = await octokit.rest.pulls.createReviewComment({
            owner,
            repo,
            pull_number: prNumber,
            commit_id: headSha,
            body: `### AI Finding: ${finding.type}\n**Issue:** ${finding.issue}\n\n**Rationale:** ${finding.rationale}\n\n**Suggested Resolution:**\n\`\`\`\n${finding.resolution}\n\`\`\`\n\n---\n*Detected in commit ${headSha.substring(0, 7)} at ${new Date().toLocaleString()}*`,
            path: finding.file,
            line: finding.line,
          });
          commentIds[finding.id] = comment.data.id.toString();
        } catch (individualError: any) {
          this.logger.warn(
            `Failed to post individual comment for ${finding.file}: ${individualError.message}. Falling back to issue comment.`,
          );
          try {
            const issueComment = await octokit.rest.issues.createComment({
              owner,
              repo,
              issue_number: prNumber,
              body: `### AI Finding: ${finding.type} (in \`${finding.file}\` at line ${finding.line})\n**Issue:** ${finding.issue}\n\n**Rationale:** ${finding.rationale}\n\n**Suggested Resolution:**\n\`\`\`\n${finding.resolution}\n\`\`\`\n\n---\n*Detected in commit ${headSha.substring(0, 7)}*`,
            });
            commentIds[finding.id] = issueComment.data.id.toString();
          } catch (issueError: any) {
            this.logger.error(
              `Failed to post fallback issue comment for ${finding.file}: ${issueError.message}`,
            );
          }
        }
      }
    }

    // Also post a summary comment
    await octokit.rest.issues.createComment({
      owner,
      repo,
      issue_number: prNumber,
      body: `## 🤖 AI Multi-Agent Review Summary\n\nAnalysis completed. Total issues found: **${findings.length}**\n\n[View full report and debate log](${frontendUrl}/dashboard)`,
    });

    return commentIds;
  }

  /**
   * Mark an existing GitHub comment as resolved (issue verifiably fixed in a
   * later commit) by updating its body and resolving the review thread.
   */
  async markCommentAsResolved(
    githubToken: string,
    owner: string,
    repo: string,
    commentId: string,
  ) {
    return this.annotateAndResolveComment(
      githubToken,
      owner,
      repo,
      commentId,
      "✅ **RESOLVED** (Fixed in latest commit)",
    );
  }

  /**
   * Mark an existing GitHub comment as dismissed - a human reviewer decided
   * this finding isn't worth acting on (false positive, or just not
   * relevant), as opposed to "resolved" which means the panel verified the
   * issue is actually gone from a later commit's diff.
   */
  async markCommentAsDismissed(
    githubToken: string,
    owner: string,
    repo: string,
    commentId: string,
  ) {
    return this.annotateAndResolveComment(
      githubToken,
      owner,
      repo,
      commentId,
      "🚫 **DISMISSED** (marked not applicable by the reviewer)",
    );
  }

  /**
   * Shared logic behind markCommentAsResolved/markCommentAsDismissed:
   * prefix the comment body with a banner and strike through the original
   * text, then resolve the underlying review thread via GraphQL. Both
   * outcomes collapse the conversation on GitHub the same way - only the
   * banner text differs, so the reader can tell "verified fixed" apart from
   * "a human chose to ignore this".
   */
  private async annotateAndResolveComment(
    githubToken: string,
    owner: string,
    repo: string,
    commentId: string,
    banner: string,
  ) {
    const octokit = new Octokit({ auth: githubToken });
    const cId = parseInt(commentId, 10);
    try {
      // First try as a review comment
      try {
        const { data: existing } = await octokit.rest.pulls.getReviewComment({
          owner,
          repo,
          comment_id: cId,
        });
        if (!existing.body.includes(banner)) {
          await octokit.rest.pulls.updateReviewComment({
            owner,
            repo,
            comment_id: cId,
            body: `${banner}\n\n~${existing.body.replace(/\n/g, "\n~")}~`,
          });
        }

        // Resolve the GitHub conversation thread using GraphQL
        try {
          const query = `
            query($nodeId: ID!) {
              node(id: $nodeId) {
                ... on PullRequestReviewComment {
                  pullRequestReviewThread {
                    id
                  }
                }
              }
            }
          `;
          const response: any = await octokit.graphql(query, {
            nodeId: existing.node_id,
          });
          const threadId = response?.node?.pullRequestReviewThread?.id;

          if (threadId) {
            const mutation = `
              mutation($threadId: ID!) {
                resolveReviewThread(input: {threadId: $threadId}) {
                  thread {
                    isResolved
                  }
                }
              }
            `;
            await octokit.graphql(mutation, { threadId });
          }
        } catch (gqlErr: any) {
          this.logger.warn(
            `Failed to resolve GraphQL thread for comment ${cId}: ${gqlErr.message}`,
          );
        }

        return;
      } catch (err: any) {
        if (err.status !== 404) {
          this.logger.error(
            `Failed to get review comment ${cId}: ${err.message}`,
          );
          return; // Stop execution if it's an error other than 404 to appease AI
        }
      }

      // If it was a 404, it might be an issue comment (fallback)
      try {
        const { data: existingIssue } = await octokit.rest.issues.getComment({
          owner,
          repo,
          comment_id: cId,
        });
        if (!existingIssue.body?.includes(banner)) {
          await octokit.rest.issues.updateComment({
            owner,
            repo,
            comment_id: cId,
            body: `${banner}\n\n~${existingIssue.body?.replace(/\n/g, "\n~")}~`,
          });
        }
      } catch (issueErr: any) {
        this.logger.error(
          `Fallback issue comment ${cId} also failed: ${issueErr.message}`,
        );
      }
    } catch (error: any) {
      this.logger.error(
        `Unexpected error annotating comment ${commentId}: ${error.message}`,
      );
    }
  }

  /**
   * Post only a summary comment when no line-specific findings are valid
   */
  async postSummaryOnly(
    githubToken: string,
    owner: string,
    repo: string,
    prNumber: number,
    totalFindings: number,
    qualityScore: number,
    securityScore: number,
    reason: "none" | "already-tracked" | "invalid-paths" = "invalid-paths",
  ) {
    const octokit = new Octokit({ auth: githubToken });
    const frontendUrl =
      this.configService.get("FRONTEND_URL") || "http://localhost:3001";

    const note = {
      none: "",
      "already-tracked":
        "\n\n*Note: The issue(s) found were already flagged on a previous commit and are still unresolved - no new comments posted to avoid duplicates.*",
      "invalid-paths":
        "\n\n*Note: Line-specific comments were withheld as they referenced files outside the current PR diff.*",
    }[reason];

    await octokit.rest.issues.createComment({
      owner,
      repo,
      issue_number: prNumber,
      body: `## 🤖 AI Multi-Agent Review Summary\n\nAnalysis completed. Total potential issues identified: **${totalFindings}**\nQuality Score: **${qualityScore}%** | Security Score: **${securityScore}%**${note}\n\n[View full report and debate log](${frontendUrl}/dashboard)`,
    });
  }

  /**
   * Update GitHub Commit Status with progress
   */
  async updateCommitStatus(
    githubToken: string,
    owner: string,
    repo: string,
    headSha: string,
    state: "pending" | "success" | "failure" | "error",
    description: string,
  ) {
    if (!headSha) {
      this.logger.warn(
        "Skipping commit status update: headSha is not provided",
      );
      return;
    }
    const octokit = new Octokit({ auth: githubToken });
    const frontendUrl =
      this.configService.get("FRONTEND_URL") || "http://localhost:3001";

    // 1. Update the Commit Status API (displays in Conversation tab)
    try {
      await octokit.rest.repos.createCommitStatus({
        owner,
        repo,
        sha: headSha,
        state,
        context: "AI Code Review (NVIDIA NIM)",
        description,
        target_url: `${frontendUrl}/dashboard`,
      });
    } catch (error: any) {
      this.logger.error(`Failed to update commit status: ${error.message}`);
    }

    // 2. Create/Update Check Run (displays in Checks tab like CI workflow)
    try {
      let checkStatus: "queued" | "in_progress" | "completed" = "in_progress";
      let conclusion:
        | "success"
        | "failure"
        | "neutral"
        | "cancelled"
        | "timed_out"
        | undefined = undefined;

      if (state === "pending") {
        checkStatus = "in_progress";
      } else {
        checkStatus = "completed";
        conclusion = state === "success" ? "success" : "failure";
      }

      // Check if Check Run already exists
      const { data: existingChecks } = await octokit.rest.checks.listForRef({
        owner,
        repo,
        ref: headSha,
        check_name: "AI Code Review (NVIDIA NIM)",
      });

      const checkRun = existingChecks.check_runs[0];

      if (checkRun) {
        await octokit.rest.checks.update({
          owner,
          repo,
          check_run_id: checkRun.id,
          status: checkStatus,
          conclusion,
          details_url: `${frontendUrl}/dashboard`,
          output: {
            title: "AI Code Review (NVIDIA NIM)",
            summary: description,
          },
        });
      } else {
        await octokit.rest.checks.create({
          owner,
          repo,
          name: "AI Code Review (NVIDIA NIM)",
          head_sha: headSha,
          status: checkStatus,
          conclusion,
          details_url: `${frontendUrl}/dashboard`,
          output: {
            title: "AI Code Review (NVIDIA NIM)",
            summary: description,
          },
        });
      }
    } catch (error: any) {
      if (error.message?.includes("authenticate via a GitHub App")) {
        this.logger.debug(
          `Skipping Check Run creation (Requires GitHub App, but using PAT).`,
        );
      } else {
        this.logger.error(`Failed to manage check run: ${error.message}`);
      }
    }
  }
}
