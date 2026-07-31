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

// Confidence is "how sure is the panel", not "how bad is this" - severity
// already owns alarm color via getFindingTypeColor. Using destructive/warning
// hues here too made a trivial Info finding the panel was merely sure about
// look as scary as an actual critical vulnerability. This scales by neutral
// weight (how solid/prominent) instead of by hue, so the two axes don't
// visually collide.
export function getConfidenceColor(confidence: 'High' | 'Medium' | 'Low'): string {
  switch (confidence) {
    case 'High':
      return 'text-foreground bg-accent border-border'
    case 'Medium':
      return 'text-muted-foreground bg-accent/50 border-border/60'
    case 'Low':
      return 'text-muted-foreground/80 bg-transparent border-border/40'
    default:
      return 'text-muted-foreground bg-muted/40 border-border'
  }
}

export function getFindingTypeColor(type: string): string {
  switch (type) {
    case 'Critical':
      return 'bg-destructive/15 text-destructive'
    case 'Vulnerability':
      return 'bg-destructive/15 text-destructive'
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
