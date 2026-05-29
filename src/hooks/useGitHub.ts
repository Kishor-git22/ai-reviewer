'use client'

import { useQuery } from '@tanstack/react-query'
import { useSession } from 'next-auth/react'
import { Repository, PullRequest } from '@/types'

const GITHUB_API_BASE = 'https://api.github.com'

export function useRepos() {
  const { data: session } = useSession()
  const githubToken = session?.user?.githubToken

  return useQuery({
    queryKey: ['github', 'repos', session?.user?.id],
    queryFn: async (): Promise<Repository[]> => {
      if (!githubToken) return []

      const response = await fetch(`${GITHUB_API_BASE}/user/repos?sort=updated&per_page=100&type=all`, {
        headers: {
          Authorization: `Bearer ${githubToken}`,
          Accept: 'application/vnd.github.v3+json',
        },
      })

      if (!response.ok) {
        throw new Error('Failed to fetch repositories')
      }

      return response.json()
    },
    enabled: !!githubToken,
  })
}

export function useRepoPRs(owner?: string, repo?: string) {
  const { data: session } = useSession()
  const githubToken = session?.user?.githubToken
  const token = session?.user?.accessToken
  const API_URL = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002').replace(/\/$/, '')

  return useQuery({
    queryKey: ['github', 'prs', owner, repo],
    queryFn: async (): Promise<PullRequest[]> => {
      if (!githubToken || !owner || !repo) return []

      const response = await fetch(
        `${GITHUB_API_BASE}/repos/${owner}/${repo}/pulls?state=all&sort=updated&per_page=50`,
        {
          headers: {
            Authorization: `Bearer ${githubToken}`,
            Accept: 'application/vnd.github.v3+json',
          },
        }
      )

      if (!response.ok) {
        throw new Error('Failed to fetch pull requests')
      }

      const githubPRs = await response.json()

      let statuses: Record<string, any> = {}
      if (token) {
        try {
          const statusRes = await fetch(`${API_URL}/reviewer/repo/${repo}/prs/status`, {
            headers: { Authorization: `Bearer ${token}` }
          })
          if (statusRes.ok) {
            statuses = await statusRes.json()
          }
        } catch (e) {
          console.error("Failed to fetch backend PR statuses", e)
        }
      }

      return githubPRs.map((pr: any) => {
        const prStatus = statuses[pr.number]
        return {
          id: pr.id,
          number: pr.number,
          title: pr.title,
          repo: repo,
          status: prStatus?.status || (pr.state === 'open' ? 'Pending Review' : 'Analysis Complete'),
          issues: prStatus?.vuls || 0,
          quality: prStatus?.qualityScore || 100,
          vuls: prStatus?.vuls || 0,
          recs: prStatus?.recs || 0,
          user: pr.user.login,
          avatar: pr.user.avatar_url,
          createdAt: pr.created_at,
          headSha: pr.head.sha,
        }
      })
    },
    enabled: !!githubToken && !!owner && !!repo,
    refetchInterval: 5000,
  })
}
