export interface NvidiaModel {
  id: string
  name: string
  provider: string
}

export interface PublicStats {
  members: number
  prsReviewed: number
  // Share of reviewed findings (Resolved or marked Not Acceptable) that
  // were Resolved - precision as judged by the humans using this, not by
  // how often the agents agreed with each other. Null means "no findings
  // reviewed yet" and must render as a placeholder, never as 0%.
  accuracyRate: number | null
}

export interface MyStats {
  activeRepos: number
  prsReviewed: number
  // See PublicStats.accuracyRate - same null-means-no-data contract.
  accuracyRate: number | null
}

export interface Feature {
  title: string
  description: string
  icon: string
}

export type FindingType = 'Critical' | 'Vulnerability' | 'Warning' | 'Info'
export type FindingStatus = 'Confirmed' | 'Disputed' | 'SingleAgent'

export interface AgentReasoning {
  agentId: string
  agentName: string
  verdict: 'positive' | 'negative' | 'neutral'
  reasoning: string
  confidence: number
}

export interface Finding {
  id: string
  file: string
  line: number
  issue: string
  type: FindingType
  confidence: 'High' | 'Medium' | 'Low'
  models: string[]
  consensus: boolean
  status: FindingStatus
  rationale: string
  resolution: string
  reference: string
  agentReasonings: AgentReasoning[]
}

export interface PullRequest {
  id: string | number
  title: string
  repo: string
  status: 'Analysis Complete' | 'Pending Review' | 'In Progress'
  issues: number
  quality: number
  vuls: number
  recs: number
}

export interface PRAnalysis {
  pr: PullRequest
  findings: Finding[]
  summary: {
    totalFiles: number
    linesChanged: number
    qualityScore: number
    securityIssues: number
    recommendations: number
  }
}

export interface Repository {
  id: number
  name: string
  full_name: string
  description: string | null
  html_url: string
  stargazers_count: number
  language: string | null
  updated_at: string
  private: boolean
  owner: {
    login: string
    avatar_url: string
  }
}

export interface BackendFinding {
  id: string
  analysisId: string
  file: string
  line: number
  issue: string
  type: FindingType
  confidence: 'High' | 'Medium' | 'Low'
  consensus: boolean
  rationale: string
  resolution: string
  status: 'open' | 'resolved' | 'dismissed'
  models: string[]
  reference?: string
  commitSha?: string
  createdAt?: string
}

export interface Analysis {
  id: string
  userId: string
  repoName: string
  prNumber: number
  title: string
  status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'stopped'
  qualityScore: number | null
  securityScore: number | null
  models: string[]
  debateLog: any
  summary: string | null
  createdAt: string
  updatedAt: string
  findings: BackendFinding[]
}

export interface User {
  id: string
  login: string
  email?: string
  image?: string
  accessToken?: string
  githubToken?: string
}
