import { Controller, Post, Body, Get, Param, UseGuards, Request, Patch } from '@nestjs/common';
import { ReviewerService } from './reviewer.service';
import { JwtAuthGuard } from '@/auth/guards/jwt-auth.guard';
import { PrismaService } from '@/prisma/prisma.service';

@Controller('reviewer')
export class ReviewerController {
  constructor(
    private readonly reviewerService: ReviewerService,
    private readonly prisma: PrismaService,
  ) {}

  @UseGuards(JwtAuthGuard)
  @Post('analyze')
  async analyzePR(
    @Request() req,
    @Body() body: { 
      repoName: string; 
      prNumber: number; 
      title: string; 
      diff: string;
      models?: string[];
      githubToken: string;
      owner: string;
      headSha: string;
    }
  ) {
    return this.reviewerService.performDebateReview(
      req.user.id,
      body.repoName,
      body.prNumber,
      body.title,
      body.diff,
      body.githubToken,
      body.owner,
      body.headSha,
      body.models,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Get('analysis/:id')
  async getAnalysis(@Param('id') id: string) {
    return this.prisma.analysis.findUnique({
      where: { id },
      include: {
        findings: true,
      },
    });
  }

  @UseGuards(JwtAuthGuard)
  @Get('repo/:repoName/pr/:prNumber/analysis')
  async getAnalysisByPr(
    @Param('repoName') repoName: string,
    @Param('prNumber') prNumber: string,
  ) {
    return this.prisma.analysis.findFirst({
      where: { repoName, prNumber: parseInt(prNumber, 10) },
      orderBy: { createdAt: 'desc' },
      include: { findings: true },
    });
  }

  @UseGuards(JwtAuthGuard)
  @Get('settings')
  async getSettings(@Request() req) {
    const user = await this.prisma.user.findUnique({
      where: { id: req.user.id },
      select: { selectedModels: true },
    });
    return user;
  }

  @UseGuards(JwtAuthGuard)
  @Patch('settings')
  async updateSettings(@Request() req, @Body() body: { selectedModels: string[] }) {
    return this.prisma.user.update({
      where: { id: req.user.id },
      data: { selectedModels: body.selectedModels },
    });
  }

  @UseGuards(JwtAuthGuard)
  @Get('active-repos')
  async getActiveRepos(@Request() req) {
    return this.prisma.repository.findMany({
      where: { 
        userId: req.user.id,
        isActive: true
      },
    });
  }

  @Get('history')
  async getHistory(@Request() req) {
    return this.prisma.analysis.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: 'desc' },
    });
  }
}
