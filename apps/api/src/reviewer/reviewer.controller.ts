import { Controller, Post, Body, Get, Param, UseGuards, Request, Patch } from '@nestjs/common';
import { ReviewerService } from './reviewer.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PrismaService } from '../prisma/prisma.service';
import { Octokit } from 'octokit';

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
  async getAnalysis(
    @Request() req,
    @Param('id') id: string,
  ) {
    const analysis = await this.prisma.analysis.findUnique({
      where: { id },
      include: { findings: true },
    });

    if (!analysis) return null;

    if (analysis.status === 'in_progress' || analysis.status === 'pending') {
      try {
        const repoRecord = await this.prisma.repository.findFirst({
          where: { name: analysis.repoName, userId: analysis.userId },
        });

        const user = await this.prisma.user.findUnique({
          where: { id: analysis.userId },
        });

        if (repoRecord && user && user.githubToken) {
          const octokit = new Octokit({ auth: user.githubToken });
          const { data: pr } = await octokit.rest.pulls.get({
            owner: repoRecord.owner,
            repo: analysis.repoName,
            pull_number: analysis.prNumber,
          });

          if (pr && pr.state === 'closed') {
            const updatedAnalysis = await this.prisma.analysis.update({
              where: { id: analysis.id },
              data: {
                status: 'stopped',
                summary: 'The AI analysis has been stopped because the pull request has been closed.',
              },
              include: { findings: true },
            });

            try {
              await this.reviewerService.updateCommitStatus(
                user.githubToken,
                repoRecord.owner,
                analysis.repoName,
                pr.head.sha,
                'failure',
                'AI Analysis stopped - Pull request closed.',
              );
            } catch (statusErr) {
              this.reviewerService['logger'].error(`Failed to update status on dynamic abort: ${statusErr.message}`);
            }

            return updatedAnalysis;
          }
        }
      } catch (err: any) {
        this.reviewerService['logger'].error(`Failed dynamic PR status check: ${err.message}`);
      }
    }

    return this.mapAgentReasonings(analysis);
  }

  @UseGuards(JwtAuthGuard)
  @Get('repo/:repoName/pr/:prNumber/analysis')
  async getAnalysisByPr(
    @Request() req,
    @Param('repoName') repoName: string,
    @Param('prNumber') prNumber: string,
  ) {
    const analysis = await this.prisma.analysis.findFirst({
      where: { repoName, prNumber: parseInt(prNumber, 10) },
      orderBy: { createdAt: 'desc' },
      include: { findings: true },
    });

    if (!analysis) return null;

    if (analysis.status === 'in_progress' || analysis.status === 'pending') {
      try {
        const repoRecord = await this.prisma.repository.findFirst({
          where: { name: repoName, userId: analysis.userId },
        });

        const user = await this.prisma.user.findUnique({
          where: { id: analysis.userId },
        });

        if (repoRecord && user && user.githubToken) {
          const octokit = new Octokit({ auth: user.githubToken });
          const { data: pr } = await octokit.rest.pulls.get({
            owner: repoRecord.owner,
            repo: repoName,
            pull_number: parseInt(prNumber, 10),
          });

          if (pr && pr.state === 'closed') {
            const updatedAnalysis = await this.prisma.analysis.update({
              where: { id: analysis.id },
              data: {
                status: 'stopped',
                summary: 'The AI analysis has been stopped because the pull request has been closed.',
              },
              include: { findings: true },
            });

            try {
              await this.reviewerService.updateCommitStatus(
                user.githubToken,
                repoRecord.owner,
                repoName,
                pr.head.sha,
                'failure',
                'AI Analysis stopped - Pull request closed.',
              );
            } catch (statusErr) {
              this.reviewerService['logger'].error(`Failed to update status on dynamic abort: ${statusErr.message}`);
            }

            return updatedAnalysis;
          }
        }
      } catch (err: any) {
        this.reviewerService['logger'].error(`Failed dynamic PR status check: ${err.message}`);
      }
    }

    return analysis;
  }

  @UseGuards(JwtAuthGuard)
  @Get('repo/:repoName/pr/:prNumber/history')
  async getPrAnalysisHistory(
    @Param('repoName') repoName: string,
    @Param('prNumber') prNumber: string,
  ) {
    return this.prisma.analysis.findMany({
      where: { repoName, prNumber: parseInt(prNumber, 10) },
      orderBy: { createdAt: 'desc' },
      include: { findings: true },
    });
  }

  @Get('repo/:repoName/pr/:prNumber/status')
  async getStatusByPr(
    @Param('repoName') repoName: string,
    @Param('prNumber') prNumber: string,
  ) {
    const analysis = await this.prisma.analysis.findFirst({
      where: { repoName, prNumber: parseInt(prNumber, 10) },
      orderBy: { createdAt: 'desc' },
      select: { 
        status: true,
        models: true,
        createdAt: true,
      },
    });
    return this.mapAgentReasonings(analysis) || { status: 'not_found' };
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

  private mapAgentReasonings(analysis: any) {
    if (analysis && analysis.findings && analysis.debateLog) {
      const debateLog: any = analysis.debateLog;
      if (debateLog.agents && Array.isArray(debateLog.agents)) {
        analysis.findings = analysis.findings.map(finding => {
          const agentReasonings = debateLog.agents.map(agent => {
            const agentFinding = agent.response?.content?.findings?.find(
              f => f.file === finding.file && f.line === finding.line
            );
            
            if (agentFinding) {
              return {
                agentId: agent.model,
                agentName: agent.model,
                verdict: 'positive',
                reasoning: agentFinding.rationale || agentFinding.issue || 'Identified the issue.',
                confidence: agentFinding.confidence === 'High' ? 0.9 : agentFinding.confidence === 'Medium' ? 0.6 : 0.3
              };
            } else {
              return {
                agentId: agent.model,
                agentName: agent.model,
                verdict: 'negative',
                reasoning: 'The agent did not flag any issue on this specific line.',
                confidence: 0.8
              };
            }
          });
          
          return {
            ...finding,
            agentReasonings,
            consensus: agentReasonings.filter(r => r.verdict === 'positive').length > 1
          };
        });
      }
    }
    return analysis;
  }
}

