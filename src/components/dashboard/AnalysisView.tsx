'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  ChevronRight,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Info,
  Zap,
  Github,
  ArrowLeft,
  FileCode2,
  Shield,
  Lightbulb,
  MessageSquare,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { AgentDebateLog } from './AgentDebateLog'
import { Finding, PullRequest, FindingType } from '@/types'
import { getFindingTypeColor, getConfidenceColor, cn } from '@/lib/utils'

interface AnalysisViewProps {
  pr: PullRequest
  findings: Finding[]
  onBack: () => void
}

function FindingCard({ finding }: { finding: Finding }) {
  return (
    <Card className="border-border bg-card">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <Badge
              className={cn('text-[10px] font-black uppercase', getFindingTypeColor(finding.type))}
            >
              {finding.type}
            </Badge>
            {finding.consensus ? (
              <Badge
                variant="outline"
                className="border-green-500/20 bg-green-500/10 text-[10px] text-green-400"
              >
                <Zap className="mr-1 h-3 w-3" />
                Confirmed Consensus
              </Badge>
            ) : (
              <Badge
                variant="outline"
                className="border-yellow-500/20 bg-yellow-500/10 text-[10px] text-yellow-400"
              >
                <Info className="mr-1 h-3 w-3" />
                Single Agent
              </Badge>
            )}
            <Badge
              variant="outline"
              className={cn('text-[10px]', getConfidenceColor(finding.confidence))}
            >
              {finding.confidence} Confidence
            </Badge>
          </div>
          <div className="font-mono text-xs text-muted-foreground">
            {finding.file}:{finding.line}
          </div>
        </div>
        <CardTitle className="mt-2 text-lg font-bold text-foreground">{finding.issue}</CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {/* Analysis Rationale */}
          <div className="space-y-2">
            <div className="flex items-center gap-1 text-[10px] font-black uppercase text-muted-foreground">
              <Info className="h-3 w-3" />
              Analysis Rationale
            </div>
            <p className="text-sm leading-relaxed text-foreground">{finding.rationale}</p>
          </div>

          {/* Resolution */}
          <div className="space-y-2">
            <div className="flex items-center gap-1 text-[10px] font-black uppercase text-blue-500">
              <Lightbulb className="h-3 w-3" />
              Recommended Resolution
            </div>
            <div className="rounded-lg border border-blue-500/20 bg-blue-500/5 p-3">
              <p className="font-mono text-sm leading-relaxed text-blue-300">
                {finding.resolution}
              </p>
            </div>
          </div>
        </div>

        {/* Reference & Models */}
        <div className="flex flex-col justify-between gap-4 border-t border-border pt-2 sm:flex-row sm:items-center">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black uppercase text-muted-foreground">
              Detected by:
            </span>
            <div className="flex flex-wrap gap-1">
              {finding.models.map((model) => (
                <span
                  key={model}
                  className="inline-block rounded border border-border bg-muted px-2 py-0.5 text-[10px] text-muted-foreground"
                >
                  {model}
                </span>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <a
              href={finding.reference}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs text-blue-400 hover:underline"
            >
              Documentation
              <ExternalLink className="h-3 w-3" />
            </a>

            <AgentDebateLog finding={finding}>
              <Button variant="outline" size="sm" className="gap-1 text-xs">
                <MessageSquare className="h-3 w-3" />
                View Debate
              </Button>
            </AgentDebateLog>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export function AnalysisView({ pr, findings, onBack }: AnalysisViewProps) {
  // Separate findings by consensus status
  const confirmedFindings = findings.filter((f) => f.consensus)
  const singleAgentFindings = findings.filter((f) => !f.consensus)

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center gap-4 border-b border-border px-6 py-4">
        <Button variant="ghost" size="sm" onClick={onBack} className="gap-1">
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex items-center gap-2 font-mono text-xs text-blue-400">
            <Github className="h-3 w-3" />
            {pr.repo}
          </div>
          <h1 className="truncate text-xl font-bold text-foreground">{pr.title}</h1>
        </div>
      </div>

      {/* Content */}
      <ScrollArea className="flex-1">
        <div className="space-y-6 p-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <Card className="border-border">
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-black text-blue-400">{pr.quality}%</div>
                <div className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">
                  Quality Score
                </div>
              </CardContent>
            </Card>
            <Card className="border-border">
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-black text-purple-400">{pr.recs}</div>
                <div className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">
                  Recommendations
                </div>
              </CardContent>
            </Card>
            <Card className="border-border">
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-black text-red-400">{pr.vuls}</div>
                <div className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">
                  Vulnerabilities
                </div>
              </CardContent>
            </Card>
            <Card className="border-border">
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-black text-green-400">{confirmedFindings.length}</div>
                <div className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">
                  Confirmed Issues
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Refracted Consensus Explanation */}
          <Card className="border-border bg-gradient-to-r from-blue-500/5 to-purple-500/5">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-500/20">
                  <Shield className="h-4 w-4 text-blue-400" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-foreground">
                    Refracted Consensus Analysis
                  </h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Findings marked as{' '}
                    <span className="font-medium text-green-400">"Confirmed Consensus"</span> have
                    been verified by 2+ AI agents agreeing on the same issue. Single-agent findings
                    require manual review.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Confirmed Findings */}
          {confirmedFindings.length > 0 && (
            <div className="space-y-3">
              <h2 className="flex items-center gap-2 text-lg font-bold text-foreground">
                <CheckCircle2 className="h-5 w-5 text-green-400" />
                Confirmed Findings ({confirmedFindings.length})
              </h2>
              <div className="space-y-4">
                {confirmedFindings.map((finding) => (
                  <FindingCard key={finding.id} finding={finding} />
                ))}
              </div>
            </div>
          )}

          {/* Single Agent Findings */}
          {singleAgentFindings.length > 0 && (
            <div className="space-y-3">
              <h2 className="flex items-center gap-2 text-lg font-bold text-foreground">
                <Info className="h-5 w-5 text-yellow-400" />
                Single Agent Findings ({singleAgentFindings.length})
              </h2>
              <div className="space-y-4">
                {singleAgentFindings.map((finding) => (
                  <FindingCard key={finding.id} finding={finding} />
                ))}
              </div>
            </div>
          )}

          {/* No Findings */}
          {findings.length === 0 && (
            <Card className="border-border">
              <CardContent className="p-8 text-center">
                <CheckCircle2 className="mx-auto mb-4 h-12 w-12 text-green-400" />
                <h3 className="mb-2 text-lg font-semibold text-foreground">No Issues Found</h3>
                <p className="text-sm text-muted-foreground">
                  All AI agents have reviewed this pull request and found no issues. Great job!
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </ScrollArea>
    </div>
  )
}

export default AnalysisView
