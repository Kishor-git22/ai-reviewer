import { NvidiaModel, Feature, Finding, PullRequest } from '@/types'

export const NVIDIA_MODELS: NvidiaModel[] = [
  { id: 'meta/llama-3.1-405b', name: 'Llama 3.1 405B', provider: 'Meta' },
  { id: 'nvidia/nemotron-4-340b', name: 'Nemotron-4 340B', provider: 'NVIDIA' },
  { id: 'mistralai/mixtral-8x22b', name: 'Mixtral 8x22B', provider: 'Mistral' },
  { id: 'google/gemma-2-27b', name: 'Gemma 2 27B', provider: 'Google' },
  { id: 'microsoft/phi-3-medium', name: 'Phi-3 Medium', provider: 'Microsoft' },
  { id: 'ai21/jamba-instruct', name: 'Jamba Instruct', provider: 'AI21' },
  { id: 'databricks/dbrx-instruct', name: 'DBRX Instruct', provider: 'Databricks' },
]

export const DEFAULT_SELECTED_MODELS = [
  'meta/llama-3.1-405b',
  'nvidia/nemotron-4-340b',
  'mistralai/mixtral-8x22b',
]

export const FEATURES: Feature[] = [
  {
    title: 'Consensus, not one model’s opinion',
    description:
      'A single model guessing alone is exactly how false positives happen. A finding only ever reaches you once two of your three models independently agree  the noise that makes other tools easy to tune out never gets through.',
    icon: 'layers',
  },
  {
    title: 'You see the argument, not just the verdict',
    description:
      'Every finding ships with the full transcript  what each model said, where they clashed, and how the panel landed on consensus. Nothing here asks you to just trust a black box.',
    icon: 'debate',
  },
  {
    title: 'Your panel, your call',
    description:
      'Choose any three models to sit on the panel. You’re never locked into one vendor’s blind spots  change the lineup any time, and every review from then on reflects it.',
    icon: 'panel',
  },
  {
    title: 'Seconds, not minutes',
    description:
      "Runs on the fastest inference hardware available  a full three-model review lands before you've context-switched away from the PR.",
    icon: 'zap',
  },
]

export const MOCK_FINDINGS: Finding[] = [
  {
    id: 'f1',
    file: 'src/services/auth.ts',
    line: 42,
    issue: 'Potential Race Condition in Token Refresh',
    type: 'Critical',
    confidence: 'High',
    models: ['Llama 3.1', 'Mixtral 8x22B', 'Nemotron-4'],
    consensus: true,
    status: 'Confirmed',
    rationale:
      'The refresh token logic lacks an atomic lock. If multiple API calls fail simultaneously, multiple refresh attempts trigger.',
    resolution: 'Implement a mutex or use a database-level lock during rotation.',
    reference: 'https://auth0.com/docs/secure/tokens/refresh-tokens/refresh-token-rotation',
    agentReasonings: [
      {
        agentId: 'llama-3.1',
        agentName: 'Llama 3.1 405B',
        verdict: 'positive',
        reasoning:
          'Detected race condition in concurrent token refresh. Multiple async operations can trigger simultaneous refresh requests, leading to token invalidation.',
        confidence: 0.94,
      },
      {
        agentId: 'nemotron-4',
        agentName: 'Nemotron-4 340B',
        verdict: 'positive',
        reasoning:
          'Confirmed: The token rotation mechanism lacks proper synchronization primitives. Recommend implementing distributed locking.',
        confidence: 0.91,
      },
      {
        agentId: 'mixtral-8x22b',
        agentName: 'Mixtral 8x22B',
        verdict: 'neutral',
        reasoning:
          'Potential issue identified, but severity depends on deployment architecture. Single-instance deployments may not exhibit this behavior.',
        confidence: 0.67,
      },
    ],
  },
  {
    id: 'f2',
    file: 'src/utils/validation.ts',
    line: 78,
    issue: 'Incomplete Input Validation',
    type: 'Vulnerability',
    confidence: 'Medium',
    models: ['Llama 3.1'],
    consensus: false,
    status: 'SingleAgent',
    rationale:
      'User input is not properly sanitized before being passed to the regex engine, potentially allowing ReDoS attacks.',
    resolution: 'Add input length limits and use a safe regex pattern.',
    reference:
      'https://owasp.org/www-community/attacks/Regular_expression_Denial_of_Service_-_ReDoS',
    agentReasonings: [
      {
        agentId: 'llama-3.1',
        agentName: 'Llama 3.1 405B',
        verdict: 'positive',
        reasoning:
          'Regex pattern contains nested quantifiers that could lead to catastrophic backtracking on malicious input.',
        confidence: 0.72,
      },
      {
        agentId: 'nemotron-4',
        agentName: 'Nemotron-4 340B',
        verdict: 'negative',
        reasoning:
          'Pattern appears safe for typical use cases. No evidence of exponential backtracking in analyzed scenarios.',
        confidence: 0.85,
      },
      {
        agentId: 'mixtral-8x22b',
        agentName: 'Mixtral 8x22B',
        verdict: 'negative',
        reasoning:
          'Input validation is sufficient for the current threat model. Additional sanitization would be redundant.',
        confidence: 0.78,
      },
    ],
  },
  {
    id: 'f3',
    file: 'src/api/routes/users.ts',
    line: 156,
    issue: 'Missing Rate Limiting on Sensitive Endpoint',
    type: 'Critical',
    confidence: 'High',
    models: ['Llama 3.1', 'Nemotron-4', 'Mixtral 8x22B'],
    consensus: true,
    status: 'Confirmed',
    rationale:
      'The password reset endpoint lacks rate limiting, making it susceptible to brute force enumeration attacks.',
    resolution:
      'Implement IP-based rate limiting (max 5 attempts per hour) and add CAPTCHA for repeated failures.',
    reference: 'https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html',
    agentReasonings: [
      {
        agentId: 'llama-3.1',
        agentName: 'Llama 3.1 405B',
        verdict: 'positive',
        reasoning:
          'Critical security gap: No rate limiting observed on password reset endpoint. Vulnerable to enumeration attacks.',
        confidence: 0.96,
      },
      {
        agentId: 'nemotron-4',
        agentName: 'Nemotron-4 340B',
        verdict: 'positive',
        reasoning:
          'Confirmed vulnerability: Absence of throttling mechanisms allows attackers to systematically test user existence.',
        confidence: 0.93,
      },
      {
        agentId: 'mixtral-8x22b',
        agentName: 'Mixtral 8x22B',
        verdict: 'positive',
        reasoning:
          'High-risk finding: Unprotected endpoint enables user enumeration and potential account lockout abuse.',
        confidence: 0.89,
      },
    ],
  },
]

export const MOCK_PRS: PullRequest[] = [
  {
    id: 'pr-1',
    title: 'fix: auth rotation race condition',
    repo: 'review-api',
    status: 'Analysis Complete',
    issues: 12,
    quality: 82,
    vuls: 1,
    recs: 5,
  },
  {
    id: 'pr-2',
    title: 'feat: three.js mesh optimization',
    repo: 'review-web',
    status: 'Pending Review',
    issues: 0,
    quality: 95,
    vuls: 0,
    recs: 2,
  },
  {
    id: 'pr-3',
    title: 'chore: update sdk dependencies',
    repo: 'review-api',
    status: 'Analysis Complete',
    issues: 3,
    quality: 88,
    vuls: 0,
    recs: 1,
  },
  {
    id: 'pr-4',
    title: 'feat: implement rate limiting middleware',
    repo: 'review-api',
    status: 'In Progress',
    issues: 8,
    quality: 91,
    vuls: 0,
    recs: 3,
  },
]
