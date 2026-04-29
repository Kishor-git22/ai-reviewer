'use client'

import { useState } from 'react'
import { usePRs, usePRAnalysis } from '@/hooks/usePrAnalysis'
import { AnalysisView } from '@/components/dashboard/AnalysisView'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { Activity, Shield, ChevronRight, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react'
import { cn } from '@/lib/utils'
import { PullRequest } from '@/types'

function PRListItem({
  pr,
  isSelected,
  onClick,
}: {
  pr: PullRequest
  isSelected: boolean
  onClick: () => void
}) {
  return (
    <div
      onClick={onClick}
      className={cn(
        'group flex cursor-pointer items-center justify-between rounded-xl border border-border bg-card p-4 transition-colors',
        isSelected ? 'border-blue-500/50 bg-blue-500/5' : 'hover:border-blue-500/30'
      )}
    >
      <div className="flex items-center gap-4">
        <div
          className={cn(
            'flex h-10 w-10 items-center justify-center rounded-full',
            pr.vuls > 0 ? 'bg-red-500/10 text-red-400' : 'bg-green-500/10 text-green-400'
          )}
        >
          {pr.vuls > 0 ? <AlertCircle size={20} /> : <CheckCircle2 size={20} />}
        </div>
        <div>
          <div
            className={cn(
              'font-semibold text-foreground transition-colors group-hover:text-blue-400',
              isSelected && 'text-blue-400'
            )}
          >
            {pr.title}
          </div>
          <div className="mt-1 text-xs text-muted-foreground">
            {pr.repo} • Score: {pr.quality}%
          </div>
        </div>
      </div>
      <ChevronRight
        className={cn(
          'text-muted-foreground transition-colors group-hover:text-foreground',
          isSelected && 'text-blue-400'
        )}
        size={20}
      />
    </div>
  )
}

export default function DashboardPage() {
  const [selectedPr, setSelectedPr] = useState<PullRequest | null>(null)
  const { data: prs, isLoading, refetch } = usePRs()
  const { data: analysis, isLoading: isAnalysisLoading } = usePRAnalysis(selectedPr?.id ?? null)

  const handleBack = () => {
    setSelectedPr(null)
  }

  return (
    <div className="flex h-full flex-col">
      {/* Top Bar */}
      <div className="flex items-center justify-between border-b border-border px-6 py-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            Reviewing activity across your repositories.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => refetch()}
          disabled={isLoading}
          className="gap-2"
        >
          <RefreshCw className={cn('h-4 w-4', isLoading && 'animate-spin')} />
          Refresh
        </Button>
      </div>

      {/* Main Content - h-screen overflow-hidden layout */}
      <div className="flex-1 overflow-hidden">
        {selectedPr ? (
          <AnalysisView pr={selectedPr} findings={analysis?.findings || []} onBack={handleBack} />
        ) : (
          <ScrollArea className="h-full">
            <div className="space-y-6 p-6">
              {/* Stats */}
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <Card>
                  <CardContent className="flex items-center gap-4 p-5">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-500/10 text-blue-400">
                      <Activity size={24} />
                    </div>
                    <div>
                      <div className="text-2xl font-black text-foreground">12,482</div>
                      <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                        Total PRs Refracted
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="flex items-center gap-4 p-5">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-green-500/10 text-green-400">
                      <Shield size={24} />
                    </div>
                    <div>
                      <div className="text-2xl font-black text-foreground">3,291</div>
                      <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                        Vulnerabilities Addressed
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* PR List */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-bold text-foreground">Your Pull Requests</h2>
                  <Badge variant="outline" className="text-xs">
                    {prs?.length || 0} PRs
                  </Badge>
                </div>

                {isLoading ? (
                  <div className="space-y-3">
                    {[...Array(3)].map((_, i) => (
                      <Card key={i} className="animate-pulse">
                        <CardContent className="h-20 p-4" />
                      </Card>
                    ))}
                  </div>
                ) : prs?.length ? (
                  <div className="grid grid-cols-1 gap-3">
                    {prs.map((pr) => (
                      <PRListItem
                        key={pr.id}
                        pr={pr}
                        isSelected={selectedPr?.id === pr.id}
                        onClick={() => setSelectedPr(pr)}
                      />
                    ))}
                  </div>
                ) : (
                  <Card>
                    <CardContent className="p-8 text-center">
                      <p className="text-muted-foreground">No pull requests found.</p>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          </ScrollArea>
        )}
      </div>
    </div>
  )
}
