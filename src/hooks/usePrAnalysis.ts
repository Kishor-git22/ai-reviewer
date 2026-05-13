import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { PullRequest, PRAnalysis, Finding, Analysis } from '@/types'
import { useSession } from 'next-auth/react'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

// Hook to fetch analysis from backend
export function useAnalysis(id: string | null) {
  const { data: session } = useSession()
  const token = session?.user?.accessToken

  return useQuery({
    queryKey: ['analysis', id],
    queryFn: async (): Promise<Analysis | null> => {
      if (!id) return null
      
      const response = await fetch(`${API_URL}/reviewer/analysis/${id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
      
      if (!response.ok) throw new Error('Failed to fetch analysis')
      return response.json()
    },
    enabled: !!id && !!token,
    refetchInterval: (query) => {
      // Poll if analysis is in progress
      const analysis = query.state.data as Analysis | null
      return analysis?.status === 'in_progress' ? 3000 : false
    },
  })
}

// Hook to trigger a new analysis
export function useAnalyzePR() {
  const { data: session } = useSession()
  const token = session?.user?.accessToken
  const githubToken = session?.user?.githubToken
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: {
      repoName: string
      prNumber: number
      title: string
      owner: string
      models?: string[]
    }) => {
      // 1. Fetch the diff from GitHub first
      const diffResponse = await fetch(
        `https://api.github.com/repos/${data.owner}/${data.repoName}/pulls/${data.prNumber}`,
        {
          headers: {
            Authorization: `Bearer ${githubToken}`,
            Accept: 'application/vnd.github.v3.diff',
          },
        }
      )

      if (!diffResponse.ok) throw new Error('Failed to fetch PR diff')
      const diff = await diffResponse.text()

      // 2. Send to our backend for analysis
      const response = await fetch(`${API_URL}/reviewer/analyze`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          repoName: data.repoName,
          prNumber: data.prNumber,
          title: data.title,
          diff,
          models: data.models,
          githubToken,
          owner: data.owner,
          headSha: (data as any).headSha,
        }),
      })

      if (!response.ok) throw new Error('Failed to trigger analysis')
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['analysis'] })
    },
  })
}

// Hook to register a webhook
export function useRegisterWebhook() {
  const { data: session } = useSession()
  const token = session?.user?.accessToken
  const githubToken = session?.user?.githubToken
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: { owner: string; repo: string }) => {
      const response = await fetch(`${API_URL}/webhooks/register/${data.owner}/${data.repo}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ githubToken }),
      })

      if (!response.ok) throw new Error('Failed to register webhook')
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['active-repos'] })
    },
  })
}

// Hook to fetch active repos
export function useActiveRepos() {
  const { data: session } = useSession()
  const token = session?.user?.accessToken

  return useQuery({
    queryKey: ['active-repos'],
    queryFn: async (): Promise<any[]> => {
      const response = await fetch(`${API_URL}/reviewer/active-repos`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
      if (!response.ok) throw new Error('Failed to fetch active repos')
      return response.json()
    },
    enabled: !!token,
  })
}

// Hook to fetch user settings
export function useUserSettings() {
  const { data: session } = useSession()
  const token = session?.user?.accessToken

  return useQuery({
    queryKey: ['user-settings'],
    queryFn: async () => {
      const response = await fetch(`${API_URL}/reviewer/settings`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
      if (!response.ok) throw new Error('Failed to fetch settings')
      return response.json()
    },
    enabled: !!token,
  })
}

// Hook to update user settings
export function useUpdateSettings() {
  const { data: session } = useSession()
  const token = session?.user?.accessToken
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: { selectedModels: string[] }) => {
      const response = await fetch(`${API_URL}/reviewer/settings`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(data),
      })

      if (!response.ok) throw new Error('Failed to update settings')
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-settings'] })
    },
  })
}
