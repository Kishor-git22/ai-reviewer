import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Octokit } from 'octokit';

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
  ) {
    const octokit = new Octokit({ auth: githubToken });
    const frontendUrl = this.configService.get('FRONTEND_URL') || 'http://localhost:3000';

    this.logger.log(`Posting ${findings.length} findings as a review to ${owner}/${repo} PR #${prNumber}`);
    
    try {
      await octokit.rest.pulls.createReview({
        owner,
        repo,
        pull_number: prNumber,
        commit_id: headSha,
        event: 'COMMENT',
        comments: findings.map((finding) => ({
          path: finding.file,
          line: finding.line,
            body: `### AI Finding: ${finding.type}\n**Issue:** ${finding.issue}\n\n**Rationale:** ${finding.rationale}\n\n**Suggested Resolution:**\n\`\`\`\n${finding.resolution}\n\`\`\`\n\n---\n*Detected in commit ${headSha.substring(0, 7)} at ${new Date().toLocaleString()}*`,
        })),
      });
    } catch (error: any) {
      this.logger.error(`Failed to post batch review: ${error.message}`);
      this.logger.warn(`Falling back to individual comments...`);

      // Fallback: Post comments one by one so that individual path errors don't block everything
      for (const finding of findings) {
        try {
          await octokit.rest.pulls.createReviewComment({
            owner,
            repo,
            pull_number: prNumber,
            commit_id: headSha,
            body: `### AI Finding: ${finding.type}\n**Issue:** ${finding.issue}\n\n**Rationale:** ${finding.rationale}\n\n**Suggested Resolution:**\n\`\`\`\n${finding.resolution}\n\`\`\`\n\n---\n*Detected in commit ${headSha.substring(0, 7)} at ${new Date().toLocaleString()}*`,
            path: finding.file,
            line: finding.line,
          });
        } catch (individualError: any) {
          this.logger.warn(`Failed to post individual comment for ${finding.file}: ${individualError.message}`);
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
  ) {
    const octokit = new Octokit({ auth: githubToken });
    const frontendUrl = this.configService.get('FRONTEND_URL') || 'http://localhost:3001';

    await octokit.rest.issues.createComment({
      owner,
      repo,
      issue_number: prNumber,
      body: `## 🤖 AI Multi-Agent Review Summary\n\nAnalysis completed. Total potential issues identified: **${totalFindings}**\nQuality Score: **${qualityScore}%** | Security Score: **${securityScore}%**\n\n*Note: Line-specific comments were withheld as they referenced files outside the current PR diff.*\n\n[View full report and debate log](${frontendUrl}/dashboard)`,
    });
  }

  async updateCommitStatus(
    githubToken: string,
    owner: string,
    repo: string,
    headSha: string,
    state: 'pending' | 'success' | 'failure' | 'error',
    description: string,
  ) {
    if (!headSha) {
      this.logger.warn('Skipping commit status update: headSha is not provided');
      return;
    }
    const octokit = new Octokit({ auth: githubToken });
    const frontendUrl = this.configService.get('FRONTEND_URL') || 'http://localhost:3001';

    // 1. Update old-school Commit Status (shown on PR conversation page)
    try {
      await octokit.rest.repos.createCommitStatus({
        owner,
        repo,
        sha: headSha,
        state,
        context: 'AI Code Review (NVIDIA NIM)',
        description,
        target_url: `${frontendUrl}/dashboard`,
      });
    } catch (error) {
      this.logger.error(`Failed to update commit status: ${error.message}`);
    }

    // 2. Manage the GitHub Check Run (so it appears under the Checks tab)
    try {
      let checkRunId: number | null = null;
      
      const checkRuns = await octokit.rest.checks.listForRef({
        owner,
        repo,
        ref: headSha,
        check_name: 'AI Code Review (NVIDIA NIM)',
      });
      
      if (checkRuns.data.check_runs.length > 0) {
        checkRunId = checkRuns.data.check_runs[0].id;
      }

      const statusMap: Record<string, 'queued' | 'in_progress' | 'completed'> = {
        pending: 'in_progress',
        success: 'completed',
        failure: 'completed',
        error: 'completed',
      };

      const conclusionMap: Record<string, 'success' | 'failure' | undefined> = {
        pending: undefined,
        success: 'success',
        failure: 'failure',
        error: 'failure',
      };

      const status = statusMap[state] || 'in_progress';
      const conclusion = conclusionMap[state];

      if (checkRunId) {
        await octokit.rest.checks.update({
          owner,
          repo,
          check_run_id: checkRunId,
          status,
          conclusion: conclusion as any,
          completed_at: status === 'completed' ? new Date().toISOString() : undefined,
          output: {
            title: description,
            summary: `AI Multi-Agent Debate review is currently ${state}.\nDetails: ${description}`,
          },
        });
      } else {
        await octokit.rest.checks.create({
          owner,
          repo,
          name: 'AI Code Review (NVIDIA NIM)',
          head_sha: headSha,
          status,
          conclusion: conclusion as any,
          started_at: new Date().toISOString(),
          completed_at: status === 'completed' ? new Date().toISOString() : undefined,
          output: {
            title: description,
            summary: `AI Multi-Agent Debate review has started.\nDetails: ${description}`,
          },
          details_url: `${frontendUrl}/dashboard`,
        });
      }
    } catch (checkError: any) {
      this.logger.warn(`Failed to update Check Run under Checks tab: ${checkError.message}`);
    }
  }
}
