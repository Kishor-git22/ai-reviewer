import { Injectable } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { User } from '@prisma/client'

interface CreateUserInput {
  githubId: string
  username: string
  avatarUrl: string
  email?: string
  githubToken?: string
}

interface UpdateUserInput {
  username?: string
  avatarUrl?: string
  email?: string
  githubToken?: string
}

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { id },
    })
  }

  async findByGithubId(githubId: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { githubId },
    })
  }

  async create(data: CreateUserInput): Promise<User> {
    return this.prisma.user.create({
      data,
    })
  }

  async update(id: string, data: UpdateUserInput): Promise<User> {
    return this.prisma.user.update({
      where: { id },
      data,
    })
  }

  async upsertByGithubId(
    githubId: string,
    data: CreateUserInput
  ): Promise<User> {
    const existing = await this.findByGithubId(githubId)

    if (existing) {
      return this.update(existing.id, {
        username: data.username,
        avatarUrl: data.avatarUrl,
        email: data.email,
        githubToken: data.githubToken,
      })
    }

    return this.create(data)
  }
}
