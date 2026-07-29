import {
  Controller,
  Post,
  Body,
  Headers,
  UseGuards,
  Request,
  Param,
} from "@nestjs/common";
import { WebhooksService } from "./webhooks.service";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";

@Controller("webhooks")
export class WebhooksController {
  constructor(private readonly webhooksService: WebhooksService) {}

  /**
   * Endpoint for GitHub to send webhooks to
   */
  @Post("github")
  async handleGithubWebhook(
    @Body() payload: any,
    @Headers("x-github-event") githubEvent: string,
  ) {
    return this.webhooksService.handleGithubWebhook(payload, githubEvent);
  }

  /**
   * Endpoint for the frontend to register a webhook for a repository
   */
  @UseGuards(JwtAuthGuard)
  @Post("register/:owner/:repo")
  async register(
    @Request() req,
    @Param("owner") owner: string,
    @Param("repo") repo: string,
    @Body() body: { githubToken: string },
  ) {
    return this.webhooksService.registerWebhook(
      req.user.id,
      owner,
      repo,
      body.githubToken,
    );
  }

  /**
   * Endpoint for the frontend to unregister a webhook for a repository
   */
  @UseGuards(JwtAuthGuard)
  @Post("unregister/:owner/:repo")
  async unregister(
    @Request() req,
    @Param("owner") owner: string,
    @Param("repo") repo: string,
    @Body() body: { githubToken: string },
  ) {
    return this.webhooksService.unregisterWebhook(
      req.user.id,
      owner,
      repo,
      body.githubToken,
    );
  }
}
