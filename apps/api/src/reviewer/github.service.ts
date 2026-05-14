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
          body: `### AI Finding: ${finding.type}\n**Issue:** ${finding.issue}\n\n**Rationale:** ${finding.rationale}\n\n**Suggested Resolution:**\n\`\`\`\n${finding.resolution}\n\`\`\``,
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
            body: `### AI Finding: ${finding.type}\n**Issue:** ${finding.issue}\n\n**Rationale:** ${finding.rationale}\n\n**Suggested Resolution:**\n\`\`\`\n${finding.resolution}\n\`\`\``,
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

  /**
   * Update GitHub Commit Status with progress
   */
  async updateCommitStatus(
    githubToken: string,
    owner: string,
    repo: string,
    headSha: string,
    state: 'pending' | 'success' | 'failure' | 'error',
    description: string,
  ) {
    const octokit = new Octokit({ auth: githubToken });
    const frontendUrl = this.configService.get('FRONTEND_URL') || 'http://localhost:3001';

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
  }
}
