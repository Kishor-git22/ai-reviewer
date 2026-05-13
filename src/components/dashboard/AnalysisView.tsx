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
import { Finding, PullRequest, FindingType, Analysis, BackendFinding } from '@/types'
import { getFindingTypeColor, getConfidenceColor, cn } from '@/lib/utils'

interface AnalysisViewProps {
  pr: PullRequest
  analysis: Analysis
  onBack: () => void
}

function FindingCard({ finding }: { finding: BackendFinding }) {
  const isCritical = finding.type === 'Critical' || finding.type === 'Vulnerability'
  const isWarning = finding.type === 'Warning'
  
  const Icon = isCritical ? Shield : isWarning ? AlertCircle : Info
  const color = isCritical ? 'text-red-400' : isWarning ? 'text-yellow-400' : 'text-blue-400'
  const bg = isCritical ? 'bg-red-500/10' : isWarning ? 'bg-yellow-500/10' : 'bg-blue-500/10'
  const border = isCritical ? 'border-red-500/20' : isWarning ? 'border-yellow-500/20' : 'border-blue-500/20'

  return (
    <Card className="overflow-hidden border-border/50 bg-card/30 backdrop-blur-sm transition-all hover:border-primary/30 hover:bg-card/50">
      <CardHeader className="pb-4">
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
        <CardTitle className="mt-2 text-xl font-black tracking-tight text-foreground">
          {finding.issue}
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Analysis Rationale */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
              <div className={cn("h-1.5 w-1.5 rounded-full", isCritical ? "bg-red-500" : "bg-primary")} />
              The "Why"
            </div>
            <p className="text-sm font-medium leading-relaxed text-foreground/80">
              {finding.rationale}
            </p>
          </div>

          {/* Resolution */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-blue-400">
              <Lightbulb className="h-3 w-3" />
              The "How" (Solution)
            </div>
            <div className="rounded-2xl border border-blue-500/20 bg-blue-500/5 p-4 shadow-inner">
              <p className="font-mono text-xs leading-relaxed text-blue-300">
                {finding.resolution}
              </p>
            </div>
          </div>
        </div>

        {/* Footer info */}
        <div className="flex flex-col justify-between gap-4 border-t border-border/50 pt-4 sm:flex-row sm:items-center">
          <div className="flex items-center gap-3">
            <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
              Analyzed by:
            </span>
            <div className="flex flex-wrap gap-1.5">
              {finding.models.map((model) => (
                <span
                  key={model}
                  className="inline-block rounded-full border border-border/50 bg-accent/50 px-3 py-1 text-[9px] font-bold text-muted-foreground"
                >
                  {model}
                </span>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {(finding as any).reference && (
              <a
                href={(finding as any).reference}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-4 py-1.5 text-[10px] font-black uppercase tracking-widest text-primary transition-all hover:bg-primary/20"
              >
                Reference
                <ExternalLink className="h-3 w-3" />
              </a>
            )}

            <AgentDebateLog finding={finding as any}>
              <Button variant="ghost" size="sm" className="h-8 gap-1.5 rounded-full text-[10px] font-black uppercase tracking-widest hover:bg-accent">
                <MessageSquare className="h-3 w-3" />
                Debate Log
              </Button>
            </AgentDebateLog>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export function AnalysisView({ pr, analysis, onBack }: AnalysisViewProps) {
  const findings = analysis.findings || []
  // Separate findings by consensus status
  const confirmedFindings = findings.filter((f) => f.consensus)
  const singleAgentFindings = findings.filter((f) => !f.consensus)

  return (
    <div className="flex min-h-full flex-col">
      {/* ... header logic same ... */}

      {/* Main Content Area */}
      <div className="mx-auto w-full max-w-7xl space-y-8 p-4 sm:p-8">
        {/* Responsive Stats Grid */}
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
          <Card className="border-border/50 bg-accent/20">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-black text-blue-400 sm:text-3xl">{analysis.qualityScore || 0}%</div>
              <div className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">
                Quality
              </div>
            </CardContent>
          </Card>
          <Card className="border-border/50 bg-accent/20">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-black text-red-400 sm:text-3xl">{analysis.securityScore || 0}%</div>
              <div className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">
                Security
              </div>
            </CardContent>
          </Card>
          <Card className="border-border/50 bg-accent/20">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-black text-purple-400 sm:text-3xl">{findings.length}</div>
              <div className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">
                Issues
              </div>
            </CardContent>
          </Card>
          <Card className="border-border/50 bg-accent/20">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-black text-green-400 sm:text-3xl">
                {confirmedFindings.length}
              </div>
              <div className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">
                Consensus
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Informational Card */}
        <Card className="overflow-hidden border-border/50 bg-gradient-to-r from-blue-500/10 via-purple-500/10 to-transparent">
          <CardContent className="p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-500/20 shadow-inner">
                <Shield className="h-5 w-5 text-blue-400" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-black tracking-tight text-foreground">
                  AI Debate Summary
                </h3>
                <p className="text-sm font-medium leading-relaxed text-muted-foreground">
                  {analysis.summary || 'Consensus building completed. Review the confirmed findings below.'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Confirmed Findings Section */}
        {confirmedFindings.length > 0 && (
          <div className="space-y-4">
            <h2 className="flex items-center gap-2 text-xl font-black tracking-tight text-foreground">
              <CheckCircle2 className="h-6 w-6 text-green-400" />
              Confirmed Findings
            </h2>
            <div className="grid grid-cols-1 gap-4">
              {confirmedFindings.map((finding) => (
                <FindingCard key={finding.id} finding={finding} />
              ))}
            </div>
          </div>
        )}

        {/* Single Agent Findings Section */}
        {singleAgentFindings.length > 0 && (
          <div className="space-y-4 pt-4">
            <h2 className="flex items-center gap-2 text-xl font-black tracking-tight text-foreground">
              <Info className="h-6 w-6 text-yellow-400" />
              Single Agent Findings
            </h2>
            <div className="grid grid-cols-1 gap-4">
              {singleAgentFindings.map((finding) => (
                <FindingCard key={finding.id} finding={finding} />
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {findings.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="mb-6 rounded-full bg-green-500/10 p-6">
              <CheckCircle2 className="h-12 w-12 text-green-400" />
            </div>
            <h3 className="text-xl font-black text-foreground">No Issues Found</h3>
            <p className="mx-auto max-w-sm text-sm font-medium text-muted-foreground">
              Prism's multi-agent review system found zero vulnerabilities or quality issues in this
              pull request.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

export default AnalysisView
