'use client'

import { useMemo } from 'react'
import { useSearchParams, useRouter, usePathname } from 'next/navigation'
import {
  useAnalysis,
  useAnalyzePR,
  useRegisterWebhook,
  useUnregisterWebhook,
  useActiveRepos,
  useUserSettings,
  useAnalysisByPr,
  useAnalysisHistory,
  useMyStats,
} from '@/hooks/usePrAnalysis'
import { useRepos, useRepoPRs } from '@/hooks/useGitHub'
import { AnalysisView } from '@/components/dashboard/AnalysisView'
import { DebateArena } from '@/components/dashboard/DebateArena'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import {
  Activity,
  Shield,
  ChevronRight,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Cpu,
  GitFork,
  Star,
  Lock,
  Globe,
  GitPullRequest,
  Zap,
  ArrowRight,
  Loader2,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { PullRequest, Repository, Analysis } from '@/types'

function RepoListItem({
  repo,
  onClick,
  isReviewActive,
  onToggleActive,
}: {
  repo: Repository
  onClick: () => void
  isReviewActive?: boolean
  onToggleActive?: (e: React.MouseEvent) => void
}) {
  return (
    <div
      onClick={onClick}
      className="group relative flex cursor-pointer items-center justify-between rounded-xl border border-border/60 bg-card/50 p-5 transition-colors hover:border-primary/40 hover:bg-card"
    >
      <div className="flex items-center gap-5">
        <div
          className={cn(
            'flex h-11 w-11 items-center justify-center rounded-xl transition-colors',
            isReviewActive ? 'bg-primary/15 text-primary' : 'bg-muted text-muted-foreground'
          )}
        >
          {repo.private ? <Lock size={20} /> : <Globe size={20} />}
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="truncate text-base font-semibold tracking-tight text-foreground transition-colors group-hover:text-primary">
              {repo.name}
            </span>
            {isReviewActive && (
              <Badge className="border-primary/20 bg-primary/15 text-[9px] font-semibold uppercase tracking-wide text-primary">
                <Zap className="mr-1 h-3 w-3 fill-primary" />
                Review active
              </Badge>
            )}
          </div>
          <div className="mt-1 flex items-center gap-4 text-xs font-medium text-muted-foreground">
            <span className="flex items-center gap-1">
              <Star size={13} className="text-warning/70" />
              {repo.stargazers_count}
            </span>
            <span className="flex items-center gap-1">
              <GitFork size={13} />
              {repo.language || 'Plain Text'}
            </span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Button
          size="sm"
          variant={isReviewActive ? 'secondary' : 'outline'}
          className={cn(
            'h-8 rounded-lg px-3.5 text-[11px] font-semibold transition-colors',
            !isReviewActive && 'hover:border-primary hover:bg-primary hover:text-primary-foreground'
          )}
          onClick={(e) => {
            e.stopPropagation()
            onToggleActive?.(e)
          }}
        >
          {isReviewActive ? 'Deactivate' : 'Activate review'}
        </Button>
        <ChevronRight
          className="text-muted-foreground transition-transform group-hover:translate-x-1 group-hover:text-primary"
          size={18}
        />
      </div>
    </div>
  )
}

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
        'group flex cursor-pointer items-center justify-between rounded-xl border border-border/60 bg-card/50 p-5 transition-colors hover:border-primary/40 hover:bg-card',
        isSelected && 'border-primary/40 bg-card'
      )}
    >
      <div className="flex items-center gap-5">
        <div
          className={cn(
            'flex h-11 w-11 items-center justify-center rounded-xl',
            (pr.status as string) === 'in_progress' ||
              (pr.status as string) === 'pending' ||
              pr.status === 'In Progress'
              ? 'bg-primary/10 text-primary'
              : (pr.status as string) === 'stopped' ||
                  (pr.status as string) === 'failed' ||
                  pr.vuls > 0
                ? 'bg-destructive/10 text-destructive'
                : (pr.status as string) === 'unreviewed' || pr.status === 'Pending Review'
                  ? 'bg-muted/40 text-muted-foreground'
                  : 'bg-success/10 text-success'
          )}
        >
          {(pr.status as string) === 'in_progress' ||
          (pr.status as string) === 'pending' ||
          pr.status === 'In Progress' ? (
            <Loader2 className="animate-spin" size={20} />
          ) : (pr.status as string) === 'stopped' ||
            (pr.status as string) === 'failed' ||
            pr.vuls > 0 ? (
            <AlertCircle size={20} />
          ) : (pr.status as string) === 'unreviewed' || pr.status === 'Pending Review' ? (
            <GitPullRequest size={20} />
          ) : (
            <CheckCircle2 size={20} />
          )}
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="text-base font-semibold tracking-tight text-foreground transition-colors group-hover:text-primary">
              {pr.title}
            </span>
            <span className="text-xs font-medium text-muted-foreground">#{(pr as any).number}</span>
          </div>
          <div className="mt-1 flex items-center gap-3 text-xs font-medium text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <div className="h-1.5 w-1.5 rounded-full bg-agent-1" />
              {(pr as any).user}
            </span>
            {pr.quality !== null && (
              <>
                <span>•</span>
                <span>Score: {pr.quality}%</span>
              </>
            )}
            <span>•</span>
            <span>{new Date((pr as any).createdAt).toLocaleDateString()}</span>
          </div>
        </div>
      </div>
      <ChevronRight
        className="text-muted-foreground transition-transform group-hover:translate-x-1 group-hover:text-primary"
        size={18}
      />
    </div>
  )
}

export default function DashboardPage() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const ownerParam = searchParams.get('owner')
  const repoParam = searchParams.get('repo')
  const prParam = searchParams.get('pr')

  const { data: userSettings } = useUserSettings()
  const selectedModels = userSettings?.selectedModels || [
    'llama-3.1',
    'deepseek-v4-flash',
    'nemotron-3-super',
  ]

  const { data: repos, isLoading: isReposLoading } = useRepos()
  const { data: activeRepos } = useActiveRepos()
  const { data: myStats, isLoading: isMyStatsLoading } = useMyStats()
  const registerMutation = useRegisterWebhook()

  // Selection is derived straight from the URL + already-loaded data, not
  // useState. It used to be state that a click handler set directly *and*
  // a separate useEffect re-derived from the URL on every change  those
  // two paths raced each other on every click, each one re-triggering the
  // PR/analysis queries a beat apart. That's what caused the double API
  // calls and the flicker when selecting a repo or PR.
  const selectedRepo = useMemo(() => {
    if (!ownerParam || !repoParam || !repos) return null
    return repos.find((r) => r.owner.login === ownerParam && r.name === repoParam) ?? null
  }, [repos, ownerParam, repoParam])

  const { data: prs, isLoading: isPrsLoading } = useRepoPRs(
    selectedRepo?.owner.login,
    selectedRepo?.name
  )

  const selectedPr = useMemo(() => {
    if (!prParam || !prs) return null
    return prs.find((p) => (p as any).number.toString() === prParam) ?? null
  }, [prs, prParam])

  const { data: prAnalysis, isLoading: isPrAnalysisLoading } = useAnalysisByPr(
    selectedRepo?.name,
    selectedPr ? (selectedPr as any).number : undefined
  )
  const { data: analysisHistory } = useAnalysisHistory(
    selectedRepo?.name,
    selectedPr ? (selectedPr as any).number : undefined
  )

  const analyzeMutation = useAnalyzePR()
  const unregisterMutation = useUnregisterWebhook()

  const handleToggleActive = async (repo: Repository) => {
    try {
      if (activeRepos?.some((ar) => ar.name === repo.name && ar.isActive)) {
        await unregisterMutation.mutateAsync({
          owner: repo.owner.login,
          repo: repo.name,
        })
      } else {
        await registerMutation.mutateAsync({
          owner: repo.owner.login,
          repo: repo.name,
        })
      }
    } catch (error) {
      console.error('Failed to toggle review active state:', error)
    }
  }

  const updateUrl = (owner?: string, repo?: string, pr?: string) => {
    const params = new URLSearchParams()
    if (owner) params.set('owner', owner)
    if (repo) params.set('repo', repo)
    if (pr) params.set('pr', pr)

    const query = params.toString()
    router.push(`${pathname}${query ? `?${query}` : ''}`)
  }

  const handleRepoClick = (repo: Repository) => {
    updateUrl(repo.owner.login, repo.name)
  }

  const handlePrClick = (pr: PullRequest) => {
    updateUrl(selectedRepo?.owner.login, selectedRepo?.name, (pr as any).number.toString())
  }

  const handleStartAnalysis = async () => {
    if (!selectedPr || !selectedRepo) return

    try {
      await analyzeMutation.mutateAsync({
        repoName: selectedRepo.name,
        prNumber: (selectedPr as any).number,
        title: selectedPr.title,
        owner: selectedRepo.owner.login,
        models: selectedModels,
        headSha: (selectedPr as any).headSha,
      })
    } catch (error) {
      console.error('Failed to start analysis:', error)
    }
  }

  const handleBackToRepos = () => {
    updateUrl()
  }

  const handleBackToPrs = () => {
    updateUrl(selectedRepo?.owner.login, selectedRepo?.name)
  }

  // Distinct key per view so the content fades in fresh instead of the
  // abrupt DOM swap that read as a "flicker" between repos / PRs / review.
  const viewKey = selectedPr
    ? `pr-${(selectedPr as any).number}`
    : selectedRepo
      ? selectedRepo.id
      : 'repos'

  return (
    <div className="flex min-h-full flex-col">
      {/* Page Header */}
      <div className="flex flex-col gap-4 border-b border-border/60 bg-background/50 px-4 py-8 backdrop-blur-md sm:flex-row sm:items-center sm:justify-between sm:px-10">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            {(selectedRepo || selectedPr) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={selectedPr ? handleBackToPrs : handleBackToRepos}
                className="h-8 w-8 rounded-lg p-0 hover:bg-accent"
              >
                <ChevronRight className="rotate-180" size={18} />
              </Button>
            )}
            <h1 className="font-display text-3xl font-medium tracking-tight text-foreground">
              {selectedPr && prAnalysis?.status
                ? 'Review'
                : selectedPr
                  ? 'Set up review'
                  : selectedRepo
                    ? 'Pull requests'
                    : 'Overview'}
            </h1>
          </div>
          <p className="text-sm font-medium text-muted-foreground">
            {selectedPr
              ? prAnalysis?.status === 'completed'
                ? `Full analysis for PR #${(selectedPr as any)?.number || searchParams.get('pr')}`
                : prAnalysis?.status === 'stopped'
                  ? `Analysis stopped for PR #${(selectedPr as any)?.number || searchParams.get('pr')}`
                  : prAnalysis?.status === 'failed'
                    ? `Analysis failed for PR #${(selectedPr as any)?.number || searchParams.get('pr')}`
                    : prAnalysis?.status === 'in_progress' || prAnalysis?.status === 'pending'
                      ? `The panel is debating #${(selectedPr as any)?.number || searchParams.get('pr')}`
                      : 'Choose which models review this change.'
              : selectedRepo
                ? `Open PRs for ${selectedRepo.full_name}`
                : 'Select a repository to begin.'}
          </p>
        </div>
      </div>

      {/* Main Content Area */}
      <div key={viewKey} className="view-transition flex-1 p-4 sm:p-10">
        {selectedPr ? (
          isPrAnalysisLoading ? (
            <div className="flex h-full flex-col items-center justify-center space-y-8 py-20">
              <Loader2 className="h-10 w-10 animate-spin text-primary" />
            </div>
          ) : prAnalysis?.status === 'failed' ? (
            <div className="flex h-full flex-col items-center justify-center space-y-8 py-20 text-center">
              <div className="rounded-2xl border border-destructive/20 bg-destructive/10 p-6 text-destructive">
                <AlertCircle size={40} />
              </div>
              <div className="space-y-2">
                <h2 className="font-display text-xl font-medium text-foreground">
                  Analysis failed
                </h2>
                <p className="max-w-md text-sm font-medium text-muted-foreground">
                  The review panel hit an error while processing this pull request. This can happen
                  with very large diffs or an API timeout.
                </p>
              </div>
              <Button
                onClick={handleStartAnalysis}
                disabled={analyzeMutation.isPending}
                variant="outline"
                className="h-11 rounded-lg border-primary/30 px-6 font-semibold hover:bg-primary/5"
              >
                {analyzeMutation.isPending ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Retrying...
                  </span>
                ) : (
                  'Retry analysis'
                )}
              </Button>
            </div>
          ) : prAnalysis?.status === 'stopped' ? (
            <div className="flex h-full flex-col items-center justify-center space-y-8 py-20 text-center">
              <div className="rounded-2xl border border-destructive/20 bg-destructive/10 p-6 text-destructive">
                <AlertCircle size={40} />
              </div>
              <div className="space-y-2">
                <h2 className="font-display text-xl font-medium text-foreground">
                  Analysis stopped
                </h2>
                <p className="max-w-md text-sm font-medium text-muted-foreground">
                  The review was stopped because this pull request has been closed.
                </p>
              </div>
              <Button
                onClick={handleBackToPrs}
                variant="outline"
                className="h-11 rounded-lg border-primary/30 px-6 font-semibold hover:bg-primary/5"
              >
                Back to pull requests
              </Button>
            </div>
          ) : prAnalysis?.status === 'completed' ||
            (analysisHistory && analysisHistory.some((a) => a.status === 'completed')) ? (
            <AnalysisView
              pr={selectedPr!}
              analysis={
                prAnalysis || analysisHistory?.find((a) => a.status === 'completed') || ({} as any)
              }
              history={analysisHistory}
              onBack={handleBackToPrs}
            />
          ) : prAnalysis?.status === 'in_progress' || prAnalysis?.status === 'pending' ? (
            <div className="flex h-full flex-col items-center justify-center space-y-8 py-16">
              <div className="max-w-md space-y-2 text-center">
                <h2 className="font-display text-xl font-medium text-foreground">
                  The panel is reviewing your change
                </h2>
                <p className="text-sm font-medium text-muted-foreground">
                  Three independent models are reading the diff and debating what matters. This
                  usually takes under a minute.
                </p>
              </div>
              <DebateArena modelIds={selectedModels} prTitle={selectedPr.title} />
            </div>
          ) : (
            <div className="flex h-full flex-col items-center justify-center space-y-8 py-20">
              <div className="flex h-20 w-20 items-center justify-center rounded-2xl border border-border/60 bg-card">
                <Cpu className="h-9 w-9 text-muted-foreground" />
              </div>
              <div className="max-w-md space-y-6 text-center">
                <div className="space-y-3">
                  <h2 className="font-display text-xl font-medium text-foreground">
                    No review yet
                  </h2>
                  <p className="text-sm font-medium text-muted-foreground">
                    This pull request hasn&apos;t been reviewed by the panel yet.
                  </p>
                </div>
                <Button
                  onClick={handleStartAnalysis}
                  disabled={analyzeMutation.isPending}
                  className="h-11 rounded-lg px-6 font-semibold"
                >
                  {analyzeMutation.isPending ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Starting review...
                    </span>
                  ) : (
                    'Start review'
                  )}
                </Button>
              </div>
            </div>
          )
        ) : (
          <div className="mx-auto max-w-7xl space-y-12">
            {!selectedRepo && (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <Card className="border-border/60 bg-card/40">
                  <CardContent className="p-5">
                    {isMyStatsLoading ? (
                      <div className="h-8 w-12 animate-pulse rounded bg-accent/40" />
                    ) : (
                      <div className="text-2xl font-semibold text-primary">
                        {myStats?.activeRepos ?? 0}
                      </div>
                    )}
                    <div className="mt-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Active repositories
                    </div>
                  </CardContent>
                </Card>
                <Card className="border-border/60 bg-card/40">
                  <CardContent className="p-5">
                    {isMyStatsLoading ? (
                      <div className="h-8 w-12 animate-pulse rounded bg-accent/40" />
                    ) : (
                      <div className="text-2xl font-semibold text-agent-1">
                        {myStats?.prsReviewed ?? 0}
                      </div>
                    )}
                    <div className="mt-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Pull requests reviewed
                    </div>
                  </CardContent>
                </Card>
                <Card className="border-border/60 bg-card/40">
                  <CardContent className="p-5">
                    {isMyStatsLoading ? (
                      <div className="h-8 w-12 animate-pulse rounded bg-accent/40" />
                    ) : (
                      <div className="text-2xl font-semibold text-success">
                        {myStats?.consensusRate != null ? `${myStats.consensusRate}%` : ''}
                      </div>
                    )}
                    <div className="mt-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Panel agreement
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            <div className="space-y-8">
              <div className="flex items-center justify-between px-2">
                <h2 className="font-display text-xl font-medium tracking-tight text-foreground">
                  {selectedRepo ? 'Select a pull request' : 'Your repositories'}
                </h2>
                <Badge variant="secondary" className="rounded-md px-3 py-1 font-semibold">
                  {(selectedRepo ? prs?.length : repos?.length) || 0} total
                </Badge>
              </div>

              {(selectedRepo ? isPrsLoading : isReposLoading) ? (
                <div className="flex flex-col gap-4">
                  {[...Array(6)].map((_, i) => (
                    <div key={i} className="h-24 animate-pulse rounded-xl bg-accent/30" />
                  ))}
                </div>
              ) : selectedRepo ? (
                prs?.length ? (
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    {prs.map((pr) => (
                      <PRListItem
                        key={pr.id}
                        pr={pr}
                        isSelected={false}
                        onClick={() => handlePrClick(pr)}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border/60 bg-accent/5 py-24 text-center">
                    <div className="mb-6 rounded-2xl bg-accent p-6">
                      <GitPullRequest size={40} className="text-muted-foreground" />
                    </div>
                    <p className="text-lg font-semibold text-foreground">No pull requests found</p>
                    <p className="mt-2 font-medium text-muted-foreground">
                      This repository doesn&apos;t have any open or closed PRs yet.
                    </p>
                  </div>
                )
              ) : repos?.length ? (
                <div className="flex flex-col gap-4">
                  {repos.map((repo) => {
                    const isActive = activeRepos?.some(
                      (ar: any) => ar.name === repo.name && ar.owner === repo.owner.login
                    )
                    return (
                      <RepoListItem
                        key={repo.id}
                        repo={repo}
                        isReviewActive={isActive}
                        onToggleActive={() => handleToggleActive(repo)}
                        onClick={() => handleRepoClick(repo)}
                      />
                    )
                  })}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border/60 bg-accent/5 py-24 text-center">
                  <div className="mb-6 rounded-2xl bg-accent p-6">
                    <Globe size={40} className="text-muted-foreground" />
                  </div>
                  <p className="text-lg font-semibold text-foreground">No repositories found</p>
                  <p className="mt-2 font-medium text-muted-foreground">
                    We couldn&apos;t find any repositories in your GitHub account.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
