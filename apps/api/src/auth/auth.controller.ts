import { Controller, Post, Get, Body, UseGuards } from "@nestjs/common";
import { AuthService } from "./auth.service";
import { GitHubSyncDto } from "./dto/github-sync.dto";
import { JwtAuthGuard } from "./guards/jwt-auth.guard";
import { GetUser } from "./decorators/get-user.decorator";
import { User } from "@prisma/client";

@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /**
   * POST /auth/github/sync
   * Accepts GitHub access token from frontend, syncs user with database,
   * and returns a backend JWT token
   */
  @Post("github/sync")
  async syncGitHubUser(@Body() dto: GitHubSyncDto) {
    const { user, accessToken } = await this.authService.syncGitHubUser(
      dto.accessToken,
    );

    return {
      success: true,
      data: {
        user: {
          id: user.id,
          githubId: user.githubId,
          username: user.username,
          avatarUrl: user.avatarUrl,
          email: user.email,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
        },
        accessToken,
      },
    };
  }

  /**
   * GET /auth/profile
   * Protected route that returns the current user's profile
   * Requires valid JWT token in Authorization header
   */
  @Get("profile")
  @UseGuards(JwtAuthGuard)
  async getProfile(@GetUser() user: User) {
    return {
      success: true,
      data: {
        user: {
          id: user.id,
          githubId: user.githubId,
          username: user.username,
          avatarUrl: user.avatarUrl,
          email: user.email,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
        },
      },
    };
  }
}
