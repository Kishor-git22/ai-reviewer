import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ReviewerService } from '../reviewer/reviewer.service';
import { Octokit } from 'octokit';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class WebhooksService {
  private readonly logger = new Logger(WebhooksService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly reviewerService: ReviewerService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Register a webhook on a GitHub repository
   */
  async registerWebhook(userId: string, owner: string, repo: string, githubToken: string) {
    const octokit = new Octokit({ auth: githubToken });
    const webhookUrl = `${this.configService.get('APP_URL')}/webhooks/github`;

    this.logger.log(`Registering webhook for ${owner}/${repo} at ${webhookUrl}`);

    try {
      const response = await octokit.rest.repos.createWebhook({
        owner,
        repo,
        config: {
          url: webhookUrl,
          content_type: 'json',
          // secret: 'your-webhook-secret', // Should be in env
        },
        events: ['pull_request'],
        active: true,
      });

      // Track in database
      await this.prisma.repository.upsert({
        where: { githubId: response.data.id.toString() },
        create: {
          githubId: response.data.id.toString(),
          userId,
          name: repo,
          owner,
          isActive: true,
          webhookId: response.data.id.toString(),
        },
        update: {
          isActive: true,
          webhookId: response.data.id.toString(),
        },
      });

      return response.data;
    } catch (error) {
      // If hook already exists, we consider it a success and just sync our DB
      if (error.message?.includes('Hook already exists')) {
        this.logger.log(`Webhook already exists for ${owner}/${repo}, syncing database...`);
        
        // We still need to track it in our database
        // Since we don't have the ID from the failed create call, 
        // we'll try to find the existing hook ID or use a placeholder if needed.
        // For simplicity, we'll just upsert without the response ID if it's already there.
        await this.prisma.repository.upsert({
          where: { githubId: `${owner}/${repo}` }, // Using full name as unique if ID unknown
          create: {
            githubId: `${owner}/${repo}`,
            userId,
            name: repo,
            owner,
            isActive: true,
          },
          update: {
            isActive: true,
          },
        });
        return { message: 'Webhook already active' };
      }

      this.logger.error(`Failed to register webhook: ${error.message}`);
      throw error;
    }
  }

  /**
   * Handle incoming GitHub webhooks
   */
  async handleGithubWebhook(payload: any) {
    const event = payload.action;
    const pr = payload.pull_request;
    const repo = payload.repository;

    if (!pr || !repo) return;

    // Handle PR closed event to stop active reviews
    if (event === 'closed') {
      this.logger.log(`PR closed for ${repo.full_name} PR #${pr.number}. Stopping any active analysis.`);
      
      const updated = await this.prisma.analysis.updateMany({
        where: {
          repoName: repo.name,
          prNumber: pr.number,
          status: { in: ['pending', 'in_progress'] }
        },
        data: {
          status: 'stopped',
          summary: 'The AI analysis has been stopped because the pull request has been closed.'
        }
      });
      
      this.logger.log(`Stopped ${updated.count} active analyses for PR #${pr.number}`);
      
      // Update GitHub commit status to indicate the analysis was stopped
      try {
        const repoRecord = await this.prisma.repository.findFirst({
          where: { name: repo.name, owner: repo.owner.login },
        });
        if (repoRecord) {
          const githubToken = await this.getUserGithubToken(repoRecord.userId);
          await this.reviewerService.updateCommitStatus(
            githubToken,
            repo.owner.login,
            repo.name,
            pr.head.sha,
            'failure',
            'AI Analysis stopped - Pull request closed.',
          );
        }
      } catch (err: any) {
        this.logger.error(`Failed to update commit status on PR close: ${err.message}`);
      }
      
      return { status: 'stopped' };
    }

    // We only care about opened, synchronized, or reopened PRs for reviews
    if (event !== 'opened' && event !== 'synchronize' && event !== 'reopened') {
      this.logger.log(`Ignoring PR event: ${event}`);
      return;
    }

    this.logger.log(`Processing automatic review for ${repo.full_name} PR #${pr.number}`);

    // 1. Find the user who owns this repository connection
    const repoRecord = await this.prisma.repository.findFirst({
      where: { 
        name: repo.name,
        owner: repo.owner.login,
        isActive: true
      },
      include: { user: true }
    });

    if (!repoRecord) {
      this.logger.warn(`No active repository record found for ${repo.full_name}`);
      return;
    }

    // 2. Fetch the diff from GitHub
    const githubToken = await this.getUserGithubToken(repoRecord.userId);

    // Return immediately to satisfy GitHub's 10s timeout
    // and run the analysis in the background
    this.processBackgroundAnalysis(repo, pr, repoRecord, githubToken, event, payload).catch(err => {
      this.logger.error(`Background analysis failed: ${err.message}`);
    });

    return { status: 'processing' };
  }

  /**
   * Run analysis in the background to avoid blocking webhooks
   */
  private async processBackgroundAnalysis(repo: any, pr: any, repoRecord: any, githubToken: string, event: string, payload: any) {
    try {
      const octokit = new Octokit({ auth: githubToken });
      let diff = '';

      if (event === 'synchronize' && payload.before && payload.after) {
        this.logger.log(`Fetching incremental diff between ${payload.before} and ${payload.after}`);
        const { data: comparison } = await octokit.rest.repos.compareCommits({
          owner: repo.owner.login,
          repo: repo.name,
          base: payload.before,
          head: payload.after,
          headers: {
            accept: 'application/vnd.github.v3.diff',
          },
        });
        diff = comparison as any;
      } else {
        const { data: fullDiff } = await octokit.rest.pulls.get({
          owner: repo.owner.login,
          repo: repo.name,
          pull_number: pr.number,
          headers: {
            accept: 'application/vnd.github.v3.diff',
          },
        });
        diff = fullDiff as any;
      }

      // 3. Trigger the analysis debate
      await this.reviewerService.performDebateReview(
        repoRecord.userId,
        repo.name,
        pr.number,
        pr.title,
        diff,
        githubToken,
        repo.owner.login,
        pr.head.sha,
        repoRecord.user.selectedModels || undefined,
      );
    } catch (error) {
      this.logger.error(`Automatic analysis failed for ${repo.full_name} PR #${pr.number}: ${error.message}`);
    }
  }

  /**
   * Fetch user's GitHub token from database
   */
  private async getUserGithubToken(userId: string): Promise<string> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { githubToken: true }
    });
    
    if (!user?.githubToken) {
      throw new Error(`No GitHub token found for user ${userId}`);
    }
    
    return user.githubToken;
  }
}
