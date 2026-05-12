import { Injectable, UnauthorizedException } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { ConfigService } from '@nestjs/config'
import axios from 'axios'
import { UsersService } from '@/users/users.service'
import { User } from '@prisma/client'

interface GitHubUser {
  id: number
  login: string
  avatar_url: string
  email: string | null
}

interface GitHubSyncResponse {
  user: User
  accessToken: string
}

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService
  ) {}

  /**
   * Sync GitHub user with our database
   * 1. Fetch user profile from GitHub API using access token
   * 2. Upsert user in database (create if not exists, update if exists)
   * 3. Generate and return JWT token
   */
  async syncGitHubUser(accessToken: string): Promise<GitHubSyncResponse> {
    // Fetch GitHub user profile
    const githubUser = await this.fetchGitHubUser(accessToken)

    if (!githubUser) {
      throw new UnauthorizedException('Invalid GitHub access token')
    }

    // Upsert user in database
    const user = await this.usersService.upsertByGithubId(
      githubUser.id.toString(),
      {
        githubId: githubUser.id.toString(),
        username: githubUser.login,
        avatarUrl: githubUser.avatar_url,
        email: githubUser.email || undefined,
      }
    )

    // Generate JWT token
    const token = this.generateJwtToken(user)

    return {
      user,
      accessToken: token,
    }
  }

  /**
   * Fetch GitHub user profile using access token
   */
  private async fetchGitHubUser(accessToken: string): Promise<GitHubUser | null> {
    try {
      const response = await axios.get<GitHubUser>('https://api.github.com/user', {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: 'application/vnd.github.v3+json',
        },
      })

      return response.data
    } catch (error) {
      console.error('Failed to fetch GitHub user:', error.message)
      return null
    }
  }

  /**
   * Generate JWT token for user
   */
  private generateJwtToken(user: User): string {
    const payload = {
      sub: user.id,
      githubId: user.githubId,
      username: user.username,
    }

    return this.jwtService.sign(payload)
  }

  /**
   * Validate JWT payload and return user
   */
  async validateJwtPayload(payload: {
    sub: string
    githubId: string
    username: string
  }): Promise<User | null> {
    return this.usersService.findById(payload.sub)
  }
}
