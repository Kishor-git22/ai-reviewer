import { Controller, Post, Body, UseGuards, Request, Param } from '@nestjs/common';
import { WebhooksService } from './webhooks.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('webhooks')
export class WebhooksController {
  constructor(private readonly webhooksService: WebhooksService) {}

  /**
   * Endpoint for GitHub to send webhooks to
   */
  @Post('github')
  async handleGithubWebhook(@Body() payload: any) {
    return this.webhooksService.handleGithubWebhook(payload);
  }

  /**
   * Endpoint for the frontend to register a webhook for a repository
   */
  @UseGuards(JwtAuthGuard)
  @Post('register/:owner/:repo')
  async register(
    @Request() req,
    @Param('owner') owner: string,
    @Param('repo') repo: string,
    @Body() body: { githubToken: string }
  ) {
    return this.webhooksService.registerWebhook(
      req.user.id,
      owner,
      repo,
      body.githubToken
    );
  }
}
