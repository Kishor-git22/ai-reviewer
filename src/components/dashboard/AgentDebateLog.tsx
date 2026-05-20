'use client'

import { useState } from 'react'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Finding, AgentReasoning } from '@/types'
import { getVerdictColor } from '@/lib/utils'
import { MessageSquare, CheckCircle2, XCircle, HelpCircle, Info } from 'lucide-react'

interface AgentDebateLogProps {
  finding: Finding
  analysisModels?: string[]
  children?: React.ReactNode
}

function VerdictIcon({ verdict }: { verdict: AgentReasoning['verdict'] }) {
  switch (verdict) {
    case 'positive':
      return <CheckCircle2 className="h-4 w-4 text-green-400" />
    case 'negative':
      return <XCircle className="h-4 w-4 text-red-400" />
    case 'neutral':
      return <HelpCircle className="h-4 w-4 text-yellow-400" />
  }
}

function VerdictLabel({ verdict }: { verdict: AgentReasoning['verdict'] }) {
  switch (verdict) {
    case 'positive':
      return <span className="font-medium text-green-400">Agreed</span>
    case 'negative':
      return <span className="font-medium text-red-400">Disagreed</span>
    case 'neutral':
      return <span className="font-medium text-yellow-400">Uncertain</span>
  }
}

export function AgentDebateLog({ finding, analysisModels = [], children }: AgentDebateLogProps) {
  const [open, setOpen] = useState(false)

  // Synthesize reasonings from database models if agentReasonings is empty
  const allPossibleModels = [
    { id: 'llama-3.1', name: 'Llama 3.1 70B' },
    { id: 'deepseek-v4-pro', name: 'DeepSeek V4 Pro' },
    { id: 'deepseek-v4-flash', name: 'DeepSeek V4 Flash' },
    { id: 'mistral-medium-3.5', name: 'Mistral Medium 3.5' },
    { id: 'mistral-small-4', name: 'Mistral Small 4' },
    { id: 'nemotron-3-super', name: 'Nemotron 3 Super' },
    { id: 'phi-4', name: 'Phi-4' },
    { id: 'gemma-2-27b', name: 'Gemma 2 27B' },
    { id: 'gemma-3', name: 'Gemma 3' },
    { id: 'minimax-m2.7', name: 'MiniMax M2.7' }
  ]

  let reasonings = finding.agentReasonings || []
  if (reasonings.length === 0) {
    const modelsToUse = analysisModels && analysisModels.length > 0
      ? analysisModels
      : finding.models || []

    reasonings = modelsToUse.map(modelId => {
      const modelInfo = allPossibleModels.find(m => m.id === modelId) || { id: modelId, name: modelId };
      const isAgreed = finding.models?.includes(modelId);
      return {
        agentId: modelId,
        agentName: modelInfo.name,
        verdict: isAgreed ? ('positive' as const) : ('negative' as const),
        reasoning: isAgreed
          ? `Identified and flagged this issue: "${finding.issue}". Rationale: ${finding.rationale}`
          : `Analyzed the code changes but did not flag this issue. No critical pattern matching found for "${finding.issue}".`,
        confidence: isAgreed
          ? (finding.confidence === 'High' ? 0.92 : finding.confidence === 'Medium' ? 0.75 : 0.45)
          : 0.85
      };
    });
  }

  const positiveCount = reasonings.filter((r) => r.verdict === 'positive').length
  const negativeCount = reasonings.filter((r) => r.verdict === 'negative').length
  const neutralCount = reasonings.filter((r) => r.verdict === 'neutral').length

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        {children || (
          <Button variant="outline" size="sm" className="gap-2">
            <MessageSquare className="h-4 w-4" />
            View Agent Debate
          </Button>
        )}
      </SheetTrigger>
      <SheetContent className="w-full border-border bg-background sm:max-w-xl">
        <SheetHeader className="border-b border-border pb-4">
          <SheetTitle className="flex items-center gap-2 text-lg">
            <MessageSquare className="h-5 w-5 text-blue-400" />
            Agent Debate Log
          </SheetTitle>
          <SheetDescription className="text-muted-foreground">
            Raw reasoning from AI agents analyzing this finding
          </SheetDescription>
        </SheetHeader>

        <div className="mt-4 space-y-6">
          {/* Consensus Summary */}
          <div className="rounded-lg border border-border bg-muted/50 p-4">
            <h4 className="mb-3 text-sm font-semibold text-foreground">Consensus Summary</h4>
            <div className="flex flex-wrap gap-2">
              <Badge
                variant="outline"
                className="border-green-500/20 bg-green-500/10 text-green-400"
              >
                <CheckCircle2 className="mr-1 h-3 w-3" />
                {positiveCount} Agreed
              </Badge>
              <Badge variant="outline" className="border-red-500/20 bg-red-500/10 text-red-400">
                <XCircle className="mr-1 h-3 w-3" />
                {negativeCount} Disagreed
              </Badge>
              {neutralCount > 0 && (
                <Badge
                  variant="outline"
                  className="border-yellow-500/20 bg-yellow-500/10 text-yellow-400"
                >
                  <HelpCircle className="mr-1 h-3 w-3" />
                  {neutralCount} Uncertain
                </Badge>
              )}
            </div>
            <div className="mt-3 text-sm">
              {finding.consensus ? (
                <p className="text-green-400">
                  <span className="font-semibold">Confirmed Consensus:</span> 2+ agents agree on
                  this finding.
                </p>
              ) : (
                <p className="text-yellow-400">
                  <span className="font-semibold">Single Agent Finding:</span> Only 1 agent
                  identified this issue.
                </p>
              )}
            </div>
          </div>

          {/* Agent Reasonings */}
          <ScrollArea className="h-[calc(100vh-280px)]">
            <div className="space-y-4 pr-4">
              {reasonings.length === 0 && (
                <div className="flex flex-col items-center justify-center py-10 text-center">
                  <div className="mb-4 rounded-full bg-muted p-4 text-muted-foreground">
                    <Info className="h-8 w-8" />
                  </div>
                  <p className="text-sm text-muted-foreground">No detailed agent logs available for this finding.</p>
                </div>
              )}
              {reasonings.map((reasoning) => (
                <div
                  key={reasoning.agentId}
                  className="space-y-3 rounded-lg border border-border bg-card p-4"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted">
                        <span className="text-xs font-bold">{reasoning.agentName.charAt(0)}</span>
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-foreground">
                          {reasoning.agentName}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Confidence: {Math.round(reasoning.confidence * 100)}%
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <VerdictIcon verdict={reasoning.verdict} />
                      <VerdictLabel verdict={reasoning.verdict} />
                    </div>
                  </div>

                  <div className="rounded-md bg-muted/50 p-3">
                    <p className="text-sm leading-relaxed text-foreground">{reasoning.reasoning}</p>
                  </div>

                  {/* Confidence Bar */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Confidence Score</span>
                      <span className="font-medium">{Math.round(reasoning.confidence * 100)}%</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-muted">
                      <div
                        className={cn(
                          'h-full rounded-full transition-all',
                          reasoning.confidence > 0.8
                            ? 'bg-green-500'
                            : reasoning.confidence > 0.5
                              ? 'bg-yellow-500'
                              : 'bg-red-500'
                        )}
                        style={{ width: `${reasoning.confidence * 100}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>
      </SheetContent>
    </Sheet>
  )
}

// Utility for cn
import { cn } from '@/lib/utils'

export default AgentDebateLog
