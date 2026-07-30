'use client'

import {
  ChevronRight,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Info,
  Zap,
  FileCode2,
  Shield,
  Lightbulb,
  MessageSquare,
  Cpu,
  RefreshCw,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { AgentDebateLog } from './AgentDebateLog'
import { DebateArena } from './DebateArena'
import { Finding, PullRequest, FindingType, Analysis, BackendFinding } from '@/types'
import { getFindingTypeColor, getConfidenceColor, cn } from '@/lib/utils'

interface AnalysisViewProps {
  pr: PullRequest
  analysis: Analysis // The latest analysis (may be in_progress)
  history?: Analysis[] // All analyses for this PR
  onBack: () => void
}

function FindingCard({ finding }: { finding: BackendFinding }) {
  const isCritical = finding.type === 'Critical' || finding.type === 'Vulnerability'
  const isWarning = finding.type === 'Warning'

  const Icon = isCritical ? Shield : isWarning ? AlertCircle : Info
  const color = isCritical ? 'text-destructive' : isWarning ? 'text-warning' : 'text-agent-1'

  const isResolved = finding?.status === 'resolved'

  return (
    <Card
      className={cn(
        'overflow-hidden border-border/60 bg-card/40 transition-colors hover:border-primary/30',
        isResolved && 'opacity-60 grayscale-[0.4]'
      )}
    >
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <Badge
              className={cn(
                'text-[10px] font-semibold uppercase',
                getFindingTypeColor(finding.type)
              )}
            >
              {finding.type}
            </Badge>
            {isResolved && (
              <Badge
                variant="outline"
                className="border-success/30 bg-success/15 text-[10px] font-medium text-success"
              >
                Resolved
              </Badge>
            )}
            {finding.consensus ? (
              <Badge
                variant="outline"
                className="border-success/20 bg-success/10 text-[10px] text-success"
              >
                <Zap className="mr-1 h-3 w-3" />
                Panel agrees
              </Badge>
            ) : (
              <Badge
                variant="outline"
                className="border-warning/20 bg-warning/10 text-[10px] text-warning"
              >
                <Info className="mr-1 h-3 w-3" />
                Single agent
              </Badge>
            )}
            <Badge
              variant="outline"
              className={cn('text-[10px]', getConfidenceColor(finding.confidence))}
            >
              {finding.confidence} confidence
            </Badge>
          </div>
          <div className="flex items-center gap-1.5 font-mono text-xs text-muted-foreground">
            <FileCode2 className="h-3 w-3" />
            {finding.file}:{finding.line}
          </div>
        </div>
        <CardTitle
          className={cn(
            'mt-2 flex items-center gap-2 text-lg font-semibold tracking-tight text-foreground',
            isResolved && 'text-muted-foreground'
          )}
        >
          <Icon className={cn('h-4 w-4 shrink-0', color)} />
          {finding.issue}
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Analysis Rationale */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              <div
                className={cn(
                  'h-1.5 w-1.5 rounded-full',
                  isCritical ? 'bg-destructive' : 'bg-primary'
                )}
              />
              Why it matters
            </div>
            <p className="text-sm leading-relaxed text-foreground/80">{finding.rationale}</p>
          </div>

          {/* Resolution */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wider text-agent-1">
              <Lightbulb className="h-3 w-3" />
              Suggested fix
            </div>
            <div className="rounded-xl border border-agent-1/20 bg-agent-1/5 p-4">
              <p className="font-mono text-xs leading-relaxed text-foreground/80">
                {finding.resolution}
              </p>
            </div>
          </div>
        </div>

        {/* Footer info */}
        <div className="flex flex-col justify-between gap-4 border-t border-border/60 pt-4 sm:flex-row sm:items-center">
          <div className="flex items-center gap-3">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Reviewed by
            </span>
            <div className="flex flex-wrap gap-1.5">
              {finding.models.map((model) => (
                <span
                  key={model}
                  className="inline-block rounded-md border border-border/60 bg-accent/40 px-2.5 py-1 text-[9px] font-medium text-muted-foreground"
                >
                  {model}
                </span>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {finding.commitSha && (
              <span className="inline-flex items-center gap-1.5 rounded-md bg-agent-1/10 px-2.5 py-1 text-[9px] font-semibold uppercase tracking-wider text-agent-1">
                <Cpu className="h-2.5 w-2.5" />
                {finding.commitSha.substring(0, 7)}
              </span>
            )}
            {finding.createdAt && (
              <span className="text-[9px] font-medium text-muted-foreground/70">
                {new Date(finding.createdAt).toLocaleString()}
              </span>
            )}
            {finding.reference && (
              <a
                href={finding.reference}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-md bg-primary/10 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-primary transition-colors hover:bg-primary/20"
              >
                Reference
                <ExternalLink className="h-3 w-3" />
              </a>
            )}

            <AgentDebateLog finding={finding as any}>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 gap-1.5 rounded-md text-[10px] font-semibold uppercase tracking-wider hover:bg-accent"
              >
                <MessageSquare className="h-3 w-3" />
                Debate log
              </Button>
            </AgentDebateLog>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function CommitGroup({
  commitSha,
  findings,
  isLatest,
}: {
  commitSha: string
  findings: BackendFinding[]
  isLatest?: boolean
}) {
  const confirmed = findings.filter((f) => f.consensus)
  const single = findings.filter((f) => !f.consensus)

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-4">
        <div className="h-px flex-1 bg-border/60" />
        <div className="flex items-center gap-2 rounded-md border border-border/60 bg-accent/20 px-3 py-1.5">
          <Cpu className="h-3.5 w-3.5 text-primary" />
          <span className="text-[10px] font-semibold uppercase tracking-wider text-foreground">
            {isLatest ? 'Latest commit' : 'Previous commit'}: {commitSha.substring(0, 7)}
          </span>
        </div>
        <div className="h-px flex-1 bg-border/60" />
      </div>

      {confirmed.length > 0 && (
        <div className="space-y-4">
          <h2 className="flex items-center gap-2 font-display text-lg font-medium tracking-tight text-foreground">
            <CheckCircle2 className="h-5 w-5 text-success" />
            Confirmed findings
          </h2>
          <div className="grid grid-cols-1 gap-4">
            {confirmed.map((finding) => (
              <FindingCard key={finding.id} finding={finding} />
            ))}
          </div>
        </div>
      )}

      {single.length > 0 && (
        <div className="space-y-4">
          <h2 className="flex items-center gap-2 font-display text-lg font-medium tracking-tight text-foreground">
            <Info className="h-5 w-5 text-warning" />
            Single-agent findings
          </h2>
          <div className="grid grid-cols-1 gap-4">
            {single.map((finding) => (
              <FindingCard key={finding.id} finding={finding} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export function AnalysisView({ pr, analysis, history = [], onBack }: AnalysisViewProps) {
  const isProcessing = analysis.status === 'in_progress' || analysis.status === 'pending'

  // Combine all findings from history
  const allAnalyses = [...history]
  if (!allAnalyses.find((a) => a.id === analysis.id)) {
    allAnalyses.push(analysis)
  }

  const completedFindings = allAnalyses
    .filter((a) => a.status === 'completed')
    .flatMap((a) => a.findings || [])

  const findingsByCommit: Record<string, BackendFinding[]> = {}
  completedFindings.forEach((f) => {
    const sha = f.commitSha || 'unknown'
    if (!findingsByCommit[sha]) findingsByCommit[sha] = []
    findingsByCommit[sha].push(f)
  })

  // Sort commits by date (latest first)
  const sortedCommits = Object.keys(findingsByCommit).sort((a, b) => {
    const timeA = new Date(findingsByCommit[a][0].createdAt || 0).getTime()
    const timeB = new Date(findingsByCommit[b][0].createdAt || 0).getTime()
    return timeB - timeA
  })

  const totalFindingsCount = completedFindings.length
  const confirmedCount = completedFindings.filter((f) => f.consensus).length

  return (
    <div className="flex min-h-full flex-col">
      {/* Main Content Area */}
      <div className="mx-auto w-full max-w-7xl space-y-8 p-4 sm:p-8">
        {/* Header with Loader */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="flex items-center gap-3 font-display text-2xl font-medium tracking-tight text-foreground">
              Review
              {isProcessing && (
                <Badge className="animate-pulse border-primary/20 bg-primary/15 text-primary">
                  <RefreshCw className="mr-2 h-3 w-3 animate-spin" />
                  Analyzing new changes
                </Badge>
              )}
              {analysis.status === 'stopped' && (
                <Badge
                  variant="destructive"
                  className="border-destructive/20 bg-destructive/15 text-destructive"
                >
                  <AlertCircle className="mr-2 h-3 w-3" />
                  Stopped
                </Badge>
              )}
            </h1>
            <p className="mt-1 text-sm font-medium text-muted-foreground">
              {analysis.status === 'stopped'
                ? 'The review was stopped because this pull request has been closed.'
                : isProcessing
                  ? 'New commits were pushed  the panel is reviewing them now.'
                  : `Full analysis for PR #${(pr as any)?.number || ''}`}
            </p>
          </div>
        </div>

        {analysis.status === 'stopped' && (
          <div className="flex items-center gap-3 rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-destructive">
            <AlertCircle className="h-5 w-5 shrink-0" />
            <span className="text-sm font-medium">
              The review was stopped because this pull request has been closed.
            </span>
          </div>
        )}

        {/* Responsive Stats Grid */}
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
          <Card className="border-border/60 bg-accent/10">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-semibold text-agent-1 sm:text-3xl">
                {analysis.qualityScore || 0}%
              </div>
              <div className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">
                Quality
              </div>
            </CardContent>
          </Card>
          <Card className="border-border/60 bg-accent/10">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-semibold text-destructive sm:text-3xl">
                {analysis.securityScore || 0}%
              </div>
              <div className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">
                Security
              </div>
            </CardContent>
          </Card>
          <Card className="border-border/60 bg-accent/10">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-semibold text-agent-2 sm:text-3xl">
                {totalFindingsCount}
              </div>
              <div className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">
                Issues
              </div>
            </CardContent>
          </Card>
          <Card className="border-border/60 bg-accent/10">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-semibold text-success sm:text-3xl">
                {confirmedCount}
              </div>
              <div className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">
                Agreed
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Informational Card */}
        <Card className="overflow-hidden border-border/60 bg-accent/10">
          <CardContent className="p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                <Shield className="h-5 w-5 text-primary" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-semibold tracking-tight text-foreground">
                  Panel summary
                </h3>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {analysis.summary ||
                    'Consensus building complete. Review the confirmed findings below.'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Findings Grouped by Commit */}
        <div className="space-y-12">
          {sortedCommits.map((sha, index) => (
            <CommitGroup
              key={sha}
              commitSha={sha}
              findings={findingsByCommit[sha]}
              isLatest={index === 0}
            />
          ))}
        </div>

        {/* Empty State */}
        {!isProcessing && totalFindingsCount === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="mb-6 rounded-2xl bg-success/10 p-5">
              <CheckCircle2 className="h-10 w-10 text-success" />
            </div>
            <h3 className="font-display text-lg font-medium text-foreground">No issues found</h3>
            <p className="mx-auto max-w-sm text-sm text-muted-foreground">
              The panel found zero vulnerabilities or quality issues in this pull request.
            </p>
          </div>
        )}

        {isProcessing && totalFindingsCount === 0 && (
          <div className="flex flex-col items-center justify-center space-y-8 py-16 text-center">
            <div className="max-w-xs space-y-2">
              <h3 className="font-display text-lg font-medium text-foreground">
                Analyzing your changes
              </h3>
              <p className="text-sm text-muted-foreground">
                The panel is debating the new code. Findings will appear here as they agree.
              </p>
            </div>
            <DebateArena modelIds={analysis.models || []} prTitle={pr?.title} />
          </div>
        )}
      </div>
    </div>
  )
}

export default AnalysisView
