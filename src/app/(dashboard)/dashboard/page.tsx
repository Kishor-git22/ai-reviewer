'use client'

import { useState } from 'react'
import { useAnalysis, useAnalyzePR, useRegisterWebhook, useActiveRepos, useUserSettings } from '@/hooks/usePrAnalysis'
import { useRepos, useRepoPRs } from '@/hooks/useGitHub'
import { AnalysisView } from '@/components/dashboard/AnalysisView'
import { NVIDIA_MODELS } from '@/components/dashboard/ModelSelector'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { Activity, Shield, ChevronRight, CheckCircle2, AlertCircle, RefreshCw, Cpu, GitFork, Star, Lock, Globe, GitPullRequest, Zap, ArrowRight, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { PullRequest, Repository, Analysis } from '@/types'

function RepoListItem({
  repo,
  onClick,
  isPrismActive,
  onToggleActive,
}: {
  repo: Repository
  onClick: () => void
  isPrismActive?: boolean
  onToggleActive?: (e: React.MouseEvent) => void
}) {
  return (
    <div
      onClick={onClick}
      className="group relative flex cursor-pointer items-center justify-between rounded-2xl border border-border/50 bg-card/50 p-5 transition-all hover:border-primary/50 hover:bg-primary/5 hover:shadow-lg hover:shadow-primary/5"
    >
      <div className="flex items-center gap-5">
        <div className={cn(
          "flex h-12 w-12 items-center justify-center rounded-2xl transition-all group-hover:scale-110",
          isPrismActive ? "bg-primary/20 text-primary shadow-lg shadow-primary/20" : "bg-muted text-muted-foreground"
        )}>
          {repo.private ? <Lock size={22} /> : <Globe size={22} />}
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="truncate text-lg font-black tracking-tight text-foreground group-hover:text-primary transition-colors">
              {repo.name}
            </span>
            {isPrismActive && (
              <Badge className="bg-primary/20 text-primary border-primary/20 text-[8px] font-black uppercase tracking-tighter">
                <Zap className="mr-1 h-3 w-3 fill-primary" />
                Prism Active
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
          </div>
        </div>
      </div>
      
      <div className="flex items-center gap-3">
        <Button
          size="sm"
          variant={isPrismActive ? "secondary" : "outline"}
          className={cn(
            "h-8 rounded-full px-4 text-[10px] font-black uppercase tracking-widest transition-all",
            !isPrismActive && "hover:bg-primary hover:text-primary-foreground hover:border-primary"
          )}
          onClick={(e) => {
            e.stopPropagation();
            onToggleActive?.(e);
          }}
        >
          {isPrismActive ? 'Deactivate' : 'Activate AI'}
        </Button>
        <ChevronRight className="text-muted-foreground transition-transform group-hover:translate-x-1 group-hover:text-primary" size={20} />
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
  const { data: userSettings } = useUserSettings()
  const selectedModels = userSettings?.selectedModels || ['llama-3.1', 'deepseek-v4-pro', 'mistral-medium-3.5']

  const [showModelSelection, setShowModelSelection] = useState(false)
  const [currentAnalysisId, setCurrentAnalysisId] = useState<string | null>(null)

  const { data: repos, isLoading: isReposLoading, refetch: refetchRepos } = useRepos()
  const { data: activeRepos } = useActiveRepos()
  const registerMutation = useRegisterWebhook()
  
  const { data: prs, isLoading: isPrsLoading, refetch: refetchPrs } = useRepoPRs(
    selectedRepo?.owner.login,
    selectedRepo?.name
  )
  
  const { data: analysis, isLoading: isAnalysisLoading } = useAnalysis(currentAnalysisId)
  const analyzeMutation = useAnalyzePR()

  const handleToggleActive = async (repo: Repository) => {
    try {
      await registerMutation.mutateAsync({
        owner: repo.owner.login,
        repo: repo.name,
      })
    } catch (error) {
      console.error('Failed to activate Prism:', error)
    }
  }

  const handleRepoClick = (repo: Repository) => {
    setSelectedRepo(repo)
    setShowModelSelection(false)
  }

  const handlePrClick = (pr: PullRequest) => {
    setSelectedPr(pr)
    setShowModelSelection(true)
  }

  const handleStartAnalysis = async () => {
    if (!selectedPr || !selectedRepo) return

    try {
      const result = await analyzeMutation.mutateAsync({
        repoName: selectedRepo.name,
        prNumber: (selectedPr as any).number,
        title: selectedPr.title,
        owner: selectedRepo.owner.login,
        models: selectedModels,
      })
      setCurrentAnalysisId(result.id)
      setShowModelSelection(false)
    } catch (error) {
      console.error('Failed to start analysis:', error)
    }
  }

  const handleBackToRepos = () => {
    setSelectedRepo(null)
    setSelectedPr(null)
    setShowModelSelection(false)
    setCurrentAnalysisId(null)
  }

  const handleBackToPrs = () => {
    setSelectedPr(null)
    setShowModelSelection(false)
    setCurrentAnalysisId(null)
  }

  return (
    <div className="flex min-h-full flex-col">
      {/* Page Header */}
      <div className="flex flex-col gap-4 border-b border-border/50 bg-background/50 px-4 py-8 backdrop-blur-md sm:flex-row sm:items-center sm:justify-between sm:px-10">
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
            <h1 className="text-4xl font-black tracking-tight text-foreground">
              {currentAnalysisId ? 'AI Review' : selectedPr ? 'Setup Review' : selectedRepo ? 'Pull Requests' : 'Overview'}
            </h1>
          </div>
          <p className="text-sm font-bold text-muted-foreground">
            {currentAnalysisId 
              ? `Multi-agent debate in progress for #${(selectedPr as any).number}`
              : selectedPr 
                ? 'Configure your AI agents for this review.'
                : selectedRepo 
                  ? `Active PRs for ${selectedRepo.full_name}`
                  : 'Select a repository to begin analysis.'}
          </p>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 p-4 sm:p-10">
        {currentAnalysisId ? (
          analysis?.status === 'completed' ? (
            <AnalysisView pr={selectedPr!} analysis={analysis} onBack={handleBackToPrs} />
          ) : (
            <div className="flex h-full flex-col items-center justify-center space-y-8 py-20">
              <div className="relative">
                <div className="absolute -inset-4 animate-pulse rounded-full bg-primary/20 blur-xl" />
                <div className="relative flex h-24 w-24 items-center justify-center rounded-3xl bg-card border-2 border-primary shadow-2xl shadow-primary/20">
                  <Loader2 className="h-12 w-12 animate-spin text-primary" />
                </div>
              </div>
              <div className="max-w-md text-center space-y-3">
                <h2 className="text-2xl font-black text-foreground">Multi-Agent Debate</h2>
                <p className="text-sm font-bold text-muted-foreground">
                  Your selected agents are communicating and building consensus on this code change. This may take up to a minute.
                </p>
              </div>
              <div className="grid grid-cols-1 gap-3 w-full max-w-sm">
                {selectedModels.map((mid: string) => {
                  const m = NVIDIA_MODELS.find(x => x.id === mid)
                  return (
                    <div key={mid} className="flex items-center gap-3 rounded-2xl border border-border/50 bg-card/50 p-4">
                      <div className="h-2 w-2 animate-pulse rounded-full bg-primary" />
                      <span className="font-bold text-sm">{m?.name} is reviewing...</span>
                    </div>
                  )
                })}
              </div>
            </div>
          )
        ) : selectedPr && showModelSelection ? (
          <div className="mx-auto max-w-5xl space-y-12">
            <div className="space-y-6">
              <div className="text-center">
                <h3 className="text-2xl font-black text-foreground">Launch Manual Review</h3>
                <p className="text-muted-foreground mt-2">
                  This PR will be reviewed by your active Neural Engine team.
                </p>
              </div>
              
              <div className="flex justify-center gap-4">
                {selectedModels.map((modelId: string) => {
                  const modelInfo = NVIDIA_MODELS.find(m => m.id === modelId);
                  return (
                    <div key={modelId} className="flex flex-col items-center p-4 bg-card/50 border border-border/50 rounded-2xl w-48 text-center">
                      <Cpu className="h-8 w-8 text-primary mb-2" />
                      <span className="font-bold text-sm text-foreground">{modelInfo?.name || modelId}</span>
                      <span className="text-xs text-muted-foreground mt-1 capitalize">{modelInfo?.capability || 'AI Agent'}</span>
                    </div>
                  )
                })}
              </div>
            </div>
            <div className="flex justify-end pt-6">
              <Button
                size="lg"
                disabled={selectedModels.length !== 3 || analyzeMutation.isPending}
                onClick={handleStartAnalysis}
                className="gap-2 rounded-[2rem] px-10 h-16 text-lg font-black shadow-2xl shadow-primary/30 transition-all hover:scale-105 active:scale-95"
              >
                {analyzeMutation.isPending ? (
                  <Loader2 className="h-6 w-6 animate-spin" />
                ) : (
                  <>
                    Launch Analysis
                    <ArrowRight className="h-6 w-6" />
                  </>
                )}
              </Button>
            </div>
          </div>
        ) : (
          <div className="mx-auto max-w-7xl space-y-12">
            {/* ... stats grid same as before ... */}
            
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
                <div className="flex flex-col gap-6">
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
                        onClick={() => handlePrClick(pr)}
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
              ) : repos?.length ? (
                <div className="flex flex-col gap-6">
                  {repos.map((repo) => {
                    const isActive = activeRepos?.some((ar: any) => ar.name === repo.name && ar.owner === repo.owner.login)
                    return (
                      <RepoListItem
                        key={repo.id}
                        repo={repo}
                        isPrismActive={isActive}
                        onToggleActive={() => handleToggleActive(repo)}
                        onClick={() => handleRepoClick(repo)}
                      />
                    )
                  })}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center rounded-[3rem] border-2 border-dashed border-border/50 bg-accent/5 py-24 text-center">
                  <div className="mb-6 rounded-[2rem] bg-accent p-6 shadow-inner">
                    <Globe size={48} className="text-muted-foreground" />
                  </div>
                  <p className="text-xl font-black text-foreground">No Repositories Found</p>
                  <p className="mt-2 font-bold text-muted-foreground">We couldn't find any repositories in your GitHub account.</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
