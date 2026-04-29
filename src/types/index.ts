export interface NvidiaModel {
  id: string
  name: string
  provider: string
}

export interface LandingStats {
  members: string
  prsReviewed: string
  successRate: string
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

export interface User {
  id: string
  login: string
  image?: string
}
