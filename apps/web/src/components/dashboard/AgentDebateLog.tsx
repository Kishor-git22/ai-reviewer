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
  children?: React.ReactNode
}

function VerdictIcon({ verdict }: { verdict: AgentReasoning['verdict'] }) {
  switch (verdict) {
    case 'positive':
      return <CheckCircle2 className="h-4 w-4 text-success" />
    case 'negative':
      return <XCircle className="h-4 w-4 text-destructive" />
    case 'neutral':
      return <HelpCircle className="h-4 w-4 text-warning" />
  }
}

function VerdictLabel({ verdict }: { verdict: AgentReasoning['verdict'] }) {
  switch (verdict) {
    case 'positive':
      return <span className="font-medium text-success">Agreed</span>
    case 'negative':
      return <span className="font-medium text-destructive">Disagreed</span>
    case 'neutral':
      return <span className="font-medium text-warning">Uncertain</span>
  }
}

export function AgentDebateLog({ finding, children }: AgentDebateLogProps) {
  const [open, setOpen] = useState(false)

  // Count verdicts
  const reasonings = finding.agentReasonings || []
  const positiveCount = reasonings.filter((r) => r.verdict === 'positive').length
  const negativeCount = reasonings.filter((r) => r.verdict === 'negative').length
  const neutralCount = reasonings.filter((r) => r.verdict === 'neutral').length

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        {children || (
          <Button variant="outline" size="sm" className="gap-2">
            <MessageSquare className="h-4 w-4" />
            View debate
          </Button>
        )}
      </SheetTrigger>
      <SheetContent className="w-full border-border bg-background sm:max-w-xl">
        <SheetHeader className="border-b border-border pb-4">
          <SheetTitle className="flex items-center gap-2 font-display text-lg font-medium">
            <MessageSquare className="h-5 w-5 text-agent-1" />
            Debate log
          </SheetTitle>
          <SheetDescription className="text-muted-foreground">
            Full reasoning from each agent that reviewed this finding
          </SheetDescription>
        </SheetHeader>

        <div className="mt-4 space-y-6">
          {/* Consensus Summary */}
          <div className="rounded-lg border border-border bg-muted/50 p-4">
            <h4 className="mb-3 text-sm font-semibold text-foreground">Consensus summary</h4>
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline" className="border-success/20 bg-success/10 text-success">
                <CheckCircle2 className="mr-1 h-3 w-3" />
                {positiveCount} agreed
              </Badge>
              <Badge
                variant="outline"
                className="border-destructive/20 bg-destructive/10 text-destructive"
              >
                <XCircle className="mr-1 h-3 w-3" />
                {negativeCount} disagreed
              </Badge>
              {neutralCount > 0 && (
                <Badge variant="outline" className="border-warning/20 bg-warning/10 text-warning">
                  <HelpCircle className="mr-1 h-3 w-3" />
                  {neutralCount} uncertain
                </Badge>
              )}
            </div>
            <div className="mt-3 text-sm">
              {finding.consensus ? (
                <p className="text-success">
                  <span className="font-semibold">Confirmed:</span> 2 or more agents agree on this
                  finding.
                </p>
              ) : (
                <p className="text-warning">
                  <span className="font-semibold">Single agent:</span> only one agent identified
                  this issue.
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
                  <p className="text-sm text-muted-foreground">
                    No detailed agent logs available for this finding.
                  </p>
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
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>
      </SheetContent>
    </Sheet>
  )
}

export default AgentDebateLog
