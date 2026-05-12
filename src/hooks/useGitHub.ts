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

      // Map GitHub PRs to our application's PullRequest type
      return githubPRs.map((pr: any) => ({
        id: pr.id,
        number: pr.number,
        title: pr.title,
        repo: repo,
        status: pr.state === 'open' ? 'Pending Review' : 'Analysis Complete',
        issues: Math.floor(Math.random() * 5), // Mock data for now
        quality: 80 + Math.floor(Math.random() * 20), // Mock data for now
        vuls: Math.floor(Math.random() * 2), // Mock data for now
        recs: Math.floor(Math.random() * 10), // Mock data for now
        user: pr.user.login,
        avatar: pr.user.avatar_url,
        createdAt: pr.created_at,
      }))
    },
    enabled: !!githubToken && !!owner && !!repo,
  })
}
