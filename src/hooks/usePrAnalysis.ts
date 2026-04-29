'use client'

import { useQuery, useQueryClient } from '@tanstack/react-query'
import { PullRequest, PRAnalysis, Finding } from '@/types'
import { MOCK_PRS, MOCK_FINDINGS } from '@/lib/data'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

// Query keys for TanStack Query
export const prQueryKeys = {
  all: ['prs'] as const,
  lists: () => [...prQueryKeys.all, 'list'] as const,
  list: (filters: { repo?: string; status?: string }) => [...prQueryKeys.lists(), filters] as const,
  details: () => [...prQueryKeys.all, 'detail'] as const,
  detail: (id: string | number) => [...prQueryKeys.details(), id] as const,
  analysis: (id: string | number) => [...prQueryKeys.all, 'analysis', id] as const,
}

interface UsePRsOptions {
  repo?: string
  status?: string
  enabled?: boolean
}

// Hook to fetch all PRs
export function usePRs(options: UsePRsOptions = {}) {
  const { repo, status, enabled = true } = options

  return useQuery({
    queryKey: prQueryKeys.list({ repo, status }),
    queryFn: async (): Promise<PullRequest[]> => {
      // In production, this would be:
      // const response = await fetch(`${API_URL}/api/prs?repo=${repo}&status=${status}`)
      // if (!response.ok) throw new Error('Failed to fetch PRs')
      // return response.json()

      // Mock implementation for now
      await new Promise((resolve) => setTimeout(resolve, 500))

      let filtered = [...MOCK_PRS]
      if (repo) {
        filtered = filtered.filter((pr) => pr.repo.toLowerCase().includes(repo.toLowerCase()))
      }
      if (status) {
        filtered = filtered.filter((pr) => pr.status === status)
      }

      return filtered
    },
    enabled,
    staleTime: 1000 * 60 * 5, // 5 minutes
  })
}

// Hook to fetch a single PR
export function usePR(id: string | number | null) {
  return useQuery({
    queryKey: prQueryKeys.detail(id ?? ''),
    queryFn: async (): Promise<PullRequest | null> => {
      if (!id) return null

      // In production:
      // const response = await fetch(`${API_URL}/api/prs/${id}`)
      // if (!response.ok) throw new Error('Failed to fetch PR')
      // return response.json()

      await new Promise((resolve) => setTimeout(resolve, 300))
      return MOCK_PRS.find((pr) => pr.id === id) || null
    },
    enabled: !!id,
  })
}

// Hook to fetch PR analysis with findings
export function usePRAnalysis(id: string | number | null) {
  return useQuery({
    queryKey: prQueryKeys.analysis(id ?? ''),
    queryFn: async (): Promise<PRAnalysis | null> => {
      if (!id) return null

      // In production:
      // const response = await fetch(`${API_URL}/api/prs/${id}/analysis`)
      // if (!response.ok) throw new Error('Failed to fetch analysis')
      // return response.json()

      await new Promise((resolve) => setTimeout(resolve, 800))

      const pr = MOCK_PRS.find((p) => p.id === id)
      if (!pr) return null

      // Filter findings that are confirmed (2+ agents agree)
      const confirmedFindings = MOCK_FINDINGS.filter((f) => f.consensus)

      return {
        pr,
        findings: confirmedFindings,
        summary: {
          totalFiles: 12,
          linesChanged: 245,
          qualityScore: pr.quality,
          securityIssues: pr.vuls,
          recommendations: pr.recs,
        },
      }
    },
    enabled: !!id,
    staleTime: 1000 * 60 * 2, // 2 minutes
  })
}

// Hook to prefetch PR data
export function usePrefetchPR() {
  const queryClient = useQueryClient()

  return {
    prefetchPR: (id: string | number) => {
      queryClient.prefetchQuery({
        queryKey: prQueryKeys.detail(id),
        queryFn: async () => MOCK_PRS.find((pr) => pr.id === id) || null,
        staleTime: 1000 * 60 * 5,
      })
    },
    prefetchAnalysis: (id: string | number) => {
      queryClient.prefetchQuery({
        queryKey: prQueryKeys.analysis(id),
        queryFn: async () => {
          const pr = MOCK_PRS.find((p) => p.id === id)
          if (!pr) return null
          return {
            pr,
            findings: MOCK_FINDINGS.filter((f) => f.consensus),
            summary: {
              totalFiles: 12,
              linesChanged: 245,
              qualityScore: pr.quality,
              securityIssues: pr.vuls,
              recommendations: pr.recs,
            },
          }
        },
        staleTime: 1000 * 60 * 2,
      })
    },
  }
}

// Hook to refetch PRs
export function useRefreshPRs() {
  const queryClient = useQueryClient()

  return {
    refresh: () => {
      queryClient.invalidateQueries({ queryKey: prQueryKeys.lists() })
    },
    refreshAnalysis: (id: string | number) => {
      queryClient.invalidateQueries({ queryKey: prQueryKeys.analysis(id) })
    },
  }
}
