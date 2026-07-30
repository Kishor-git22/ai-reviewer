import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatNumber(num: number): string {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M'
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'k'
  }
  return num.toString()
}

export function getConfidenceColor(confidence: 'High' | 'Medium' | 'Low'): string {
  switch (confidence) {
    case 'High':
      return 'text-destructive bg-destructive/10 border-destructive/20'
    case 'Medium':
      return 'text-warning bg-warning/10 border-warning/20'
    case 'Low':
      return 'text-agent-1 bg-agent-1/10 border-agent-1/20'
    default:
      return 'text-muted-foreground bg-muted/40 border-border'
  }
}

export function getFindingTypeColor(type: string): string {
  switch (type) {
    case 'Critical':
      return 'bg-destructive/15 text-destructive'
    case 'Vulnerability':
      return 'bg-warning/15 text-warning'
    case 'Warning':
      return 'bg-warning/15 text-warning'
    case 'Info':
      return 'bg-agent-1/15 text-agent-1'
    default:
      return 'bg-muted/40 text-muted-foreground'
  }
}

export function getVerdictColor(verdict: 'positive' | 'negative' | 'neutral'): string {
  switch (verdict) {
    case 'positive':
      return 'text-success bg-success/10 border-success/20'
    case 'negative':
      return 'text-destructive bg-destructive/10 border-destructive/20'
    case 'neutral':
      return 'text-warning bg-warning/10 border-warning/20'
    default:
      return 'text-muted-foreground bg-muted/40 border-border'
  }
}
