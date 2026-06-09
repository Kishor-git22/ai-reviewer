import { Controller, Get } from "@nestjs/common";
import { PrismaService } from "./prisma/prisma.service";

@Controller()
export class AppController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async getIndex() {
    let dbStatus = "disconnected";
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      dbStatus = "connected";
    } catch {
      dbStatus = "disconnected";
    }

    return {
      success: true,
      message: "AI Code Review Platform - Production Ready Backend",
      version: "1.0.0",
      environment: process.env.NODE_ENV || "development",
      database: {
        status: dbStatus,
        type: "postgresql",
      },
      timestamp: new Date().toISOString(),
      endpoints: {
        "GET /": "API welcome and status",
        "POST /auth/github/sync": "OAuth login and database sync (public)",
        "GET /reviewer/active-repos":
          "List active repositories (requires auth)",
        "GET /reviewer/settings": "Get user model settings (requires auth)",
        "PATCH /reviewer/settings":
          "Update user model settings (requires auth)",
        "GET /reviewer/analysis/:id":
          "Get review analysis results (requires auth)",
        "GET /reviewer/repo/:repo/pr/:pr/analysis":
          "Get analysis for a PR (requires auth)",
        "GET /reviewer/repo/:repo/pr/:pr/history":
          "Get analysis history for a PR (requires auth)",
        "POST /reviewer/analyze":
          "Trigger a new code review analysis (requires auth)",
        "POST /webhooks/github": "GitHub App incoming webhooks (public)",
        "POST /webhooks/register/:owner/:repo":
          "Register GitHub webhook manually (requires auth)",
      },
      authentication: {
        note: "Protected endpoints require JWT authentication",
        header: "Authorization: Bearer <token>",
      },
    };
  }
}
