'use client'

import { useState } from 'react'
import { usePRAnalysis } from '@/hooks/usePrAnalysis'
import { useRepos, useRepoPRs } from '@/hooks/useGitHub'
import { AnalysisView } from '@/components/dashboard/AnalysisView'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { Activity, Shield, ChevronRight, CheckCircle2, AlertCircle, RefreshCw, Cpu, GitFork, Star, Lock, Globe, GitPullRequest } from 'lucide-react'
import { cn } from '@/lib/utils'
import { PullRequest, Repository } from '@/types'

function RepoListItem({
  repo,
  onClick,
}: {
  repo: Repository
  onClick: () => void
}) {
  return (
    <div
      onClick={onClick}
      className="group flex cursor-pointer items-center justify-between rounded-2xl border border-border/50 bg-card/50 p-5 transition-all hover:border-primary/50 hover:bg-primary/5 hover:shadow-lg hover:shadow-primary/5"
    >
      <div className="flex items-center gap-5">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary transition-transform group-hover:scale-110">
          {repo.private ? <Lock size={22} /> : <Globe size={22} />}
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="truncate text-lg font-black tracking-tight text-foreground group-hover:text-primary transition-colors">
              {repo.name}
            </span>
            {repo.private && (
              <Badge variant="outline" className="text-[10px] uppercase font-black tracking-widest text-muted-foreground">
                Private
              </Badge>
            )}
          </div>
          <div className="mt-1 flex items-center gap-4 text-xs font-bold text-muted-foreground">
            <span className="flex items-center gap-1">
              <Star size={14} className="text-yellow-500/50" />
              {repo.stargazers_count}
            </span>
            <span className="flex items-center gap-1">
              <GitFork size={14} />
              {repo.language || 'Plain Text'}
            </span>
            <span>Updated {new Date(repo.updated_at).toLocaleDateString()}</span>
          </div>
        </div>
      </div>
      <ChevronRight className="text-muted-foreground transition-transform group-hover:translate-x-1 group-hover:text-primary" size={20} />
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
        'group flex cursor-pointer items-center justify-between rounded-2xl border border-border/50 bg-card/50 p-5 transition-all hover:border-primary/50 hover:bg-primary/5',
        isSelected && 'border-primary/50 bg-primary/5'
      )}
    >
      <div className="flex items-center gap-5">
        <div
          className={cn(
            'flex h-12 w-12 items-center justify-center rounded-2xl transition-transform group-hover:scale-110',
            pr.vuls > 0 ? 'bg-red-500/10 text-red-400' : 'bg-green-500/10 text-green-400'
          )}
        >
          {pr.vuls > 0 ? <AlertCircle size={22} /> : <CheckCircle2 size={22} />}
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="text-lg font-black tracking-tight text-foreground group-hover:text-primary transition-colors">
              {pr.title}
            </span>
            <span className="text-xs font-bold text-muted-foreground">#{ (pr as any).number }</span>
          </div>
          <div className="mt-1 flex items-center gap-3 text-xs font-bold text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <div className="h-1.5 w-1.5 rounded-full bg-blue-500" />
              {(pr as any).user}
            </span>
            <span>•</span>
            <span>Score: {pr.quality}%</span>
            <span>•</span>
            <span>{new Date((pr as any).createdAt).toLocaleDateString()}</span>
          </div>
        </div>
      </div>
      <ChevronRight className="text-muted-foreground transition-transform group-hover:translate-x-1 group-hover:text-primary" size={20} />
    </div>
  )
}

export default function DashboardPage() {
  const [selectedRepo, setSelectedRepo] = useState<Repository | null>(null)
  const [selectedPr, setSelectedPr] = useState<PullRequest | null>(null)

  const { data: repos, isLoading: isReposLoading, refetch: refetchRepos } = useRepos()
  const { data: prs, isLoading: isPrsLoading, refetch: refetchPrs } = useRepoPRs(
    selectedRepo?.owner.login,
    selectedRepo?.name
  )
  const { data: analysis, isLoading: isAnalysisLoading } = usePRAnalysis(selectedPr?.id ?? null)

  const handleBackToRepos = () => {
    setSelectedRepo(null)
    setSelectedPr(null)
  }

  const handleBackToPrs = () => {
    setSelectedPr(null)
  }

  return (
    <div className="flex min-h-full flex-col">
      {/* Page Header */}
      <div className="flex flex-col gap-4 border-b border-border/50 bg-background/50 px-4 py-8 backdrop-blur-md sm:flex-row sm:items-center sm:justify-between sm:px-10">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            {selectedRepo && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleBackToRepos}
                className="h-8 w-8 rounded-lg p-0 hover:bg-accent"
              >
                <ChevronRight className="rotate-180" size={18} />
              </Button>
            )}
            <h1 className="text-4xl font-black tracking-tight text-foreground">
              {selectedPr ? 'PR Analysis' : selectedRepo ? 'Pull Requests' : 'Overview'}
            </h1>
          </div>
          <p className="text-sm font-bold text-muted-foreground">
            {selectedPr 
              ? `Reviewing pull request #${(selectedPr as any).number}`
              : selectedRepo 
                ? `Active PRs for ${selectedRepo.full_name}`
                : 'Select a repository to begin analysis.'}
          </p>
        </div>
        {!selectedPr && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => selectedRepo ? refetchPrs() : refetchRepos()}
            disabled={isReposLoading || isPrsLoading}
            className="w-full gap-2 rounded-2xl border-border/50 bg-background/50 px-6 font-black sm:w-auto"
          >
            <RefreshCw className={cn('h-4 w-4', (isReposLoading || isPrsLoading) && 'animate-spin')} />
            Sync Data
          </Button>
        )}
      </div>

      {/* Main Content Area */}
      <div className="flex-1 p-4 sm:p-10">
        {selectedPr ? (
          <AnalysisView pr={selectedPr} findings={analysis?.findings || []} onBack={handleBackToPrs} />
        ) : (
          <div className="mx-auto max-w-7xl space-y-12">
            {!selectedRepo && (
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                <Card className="overflow-hidden border-border/50 bg-gradient-to-br from-card to-accent/20 shadow-xl shadow-black/10">
                  <CardContent className="flex items-center gap-6 p-8">
                    <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-[1.5rem] bg-primary/10 text-primary">
                      <GitPullRequest size={32} />
                    </div>
                    <div className="min-w-0">
                      <div className="truncate text-4xl font-black text-foreground">{repos?.length || 0}</div>
                      <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                        Repositories
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="overflow-hidden border-border/50 bg-gradient-to-br from-card to-accent/20 shadow-xl shadow-black/10">
                  <CardContent className="flex items-center gap-6 p-8">
                    <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-[1.5rem] bg-green-500/10 text-green-400">
                      <Shield size={32} />
                    </div>
                    <div className="min-w-0">
                      <div className="truncate text-4xl font-black text-foreground">3,291</div>
                      <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                        Analyzed
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="hidden overflow-hidden border-border/50 bg-gradient-to-br from-card to-accent/20 shadow-xl shadow-black/10 lg:block">
                  <CardContent className="flex items-center gap-6 p-8">
                    <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-[1.5rem] bg-purple-500/10 text-purple-400">
                      <Cpu size={32} />
                    </div>
                    <div className="min-w-0">
                      <div className="truncate text-4xl font-black text-foreground">99.9%</div>
                      <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                        AI Consensus
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            <div className="space-y-8">
              <div className="flex items-center justify-between px-2">
                <h2 className="text-2xl font-black tracking-tight text-foreground">
                  {selectedRepo ? 'Select a Pull Request' : 'Your Repositories'}
                </h2>
                <Badge variant="secondary" className="rounded-full px-4 py-1 font-black shadow-lg">
                  {(selectedRepo ? prs?.length : repos?.length) || 0} Total
                </Badge>
              </div>

              {(selectedRepo ? isPrsLoading : isReposLoading) ? (
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                  {[...Array(6)].map((_, i) => (
                    <div key={i} className="h-28 animate-pulse rounded-[2rem] bg-accent/30" />
                  ))}
                </div>
              ) : selectedRepo ? (
                prs?.length ? (
                  <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
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
                  <div className="flex flex-col items-center justify-center rounded-[3rem] border-2 border-dashed border-border/50 bg-accent/5 py-24 text-center">
                    <div className="mb-6 rounded-[2rem] bg-accent p-6 shadow-inner">
                      <GitPullRequest size={48} className="text-muted-foreground" />
                    </div>
                    <p className="text-xl font-black text-foreground">No Pull Requests Found</p>
                    <p className="mt-2 font-bold text-muted-foreground">This repository doesn't have any open or closed PRs yet.</p>
                  </div>
                )
              ) : (
                repos?.length ? (
                  <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {repos.map((repo) => (
                      <RepoListItem
                        key={repo.id}
                        repo={repo}
                        onClick={() => setSelectedRepo(repo)}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center rounded-[3rem] border-2 border-dashed border-border/50 bg-accent/5 py-24 text-center">
                    <div className="mb-6 rounded-[2rem] bg-accent p-6 shadow-inner">
                      <Globe size={48} className="text-muted-foreground" />
                    </div>
                    <p className="text-xl font-black text-foreground">No Repositories Found</p>
                    <p className="mt-2 font-bold text-muted-foreground">We couldn't find any repositories in your GitHub account.</p>
                  </div>
                )
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
