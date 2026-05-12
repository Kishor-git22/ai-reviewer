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
  ) {
    const octokit = new Octokit({ auth: githubToken });
    const frontendUrl = this.configService.get('FRONTEND_URL') || 'http://localhost:3000';

    this.logger.log(`Posting ${findings.length} comments to ${owner}/${repo} PR #${prNumber}`);

    for (const finding of findings) {
      try {
        await octokit.rest.pulls.createReviewComment({
          owner,
          repo,
          pull_number: prNumber,
          body: `### AI Finding: ${finding.type}\n**Issue:** ${finding.issue}\n\n**Rationale:** ${finding.rationale}\n\n**Suggested Resolution:**\n\`\`\`\n${finding.resolution}\n\`\`\``,
          path: finding.file,
          line: finding.line,
          side: 'RIGHT',
        });
      } catch (error) {
        this.logger.warn(`Failed to post comment for ${finding.file}:${finding.line}: ${error.message}`);
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
   * Create a GitHub Check Run
   */
  async createCheckRun(
    githubToken: string,
    owner: string,
    repo: string,
    headSha: string,
    analysisId: string,
  ) {
    const octokit = new Octokit({ auth: githubToken });
    const frontendUrl = this.configService.get('FRONTEND_URL') || 'http://localhost:3000';

    try {
      await octokit.rest.checks.create({
        owner,
        repo,
        name: 'AI Code Review (NVIDIA NIM)',
        head_sha: headSha,
        status: 'completed',
        conclusion: 'success',
        details_url: `${frontendUrl}/dashboard`,
        output: {
          title: 'AI Analysis Complete',
          summary: 'The multi-agent AI debate has concluded. Click "More information" to see the full findings and rationale.',
        },
      });
    } catch (error) {
      this.logger.error(`Failed to create check run: ${error.message}`);
    }
  }
}
