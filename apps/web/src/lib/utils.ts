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
      return 'text-red-400 bg-red-500/10 border-red-500/20'
    case 'Medium':
      return 'text-orange-400 bg-orange-500/10 border-orange-500/20'
    case 'Low':
      return 'text-blue-400 bg-blue-500/10 border-blue-500/20'
    default:
      return 'text-slate-400 bg-slate-500/10 border-slate-500/20'
  }
}

export function getFindingTypeColor(type: string): string {
  switch (type) {
    case 'Critical':
      return 'bg-red-500/20 text-red-400'
    case 'Vulnerability':
      return 'bg-orange-500/20 text-orange-400'
    case 'Warning':
      return 'bg-yellow-500/20 text-yellow-400'
    case 'Info':
      return 'bg-blue-500/20 text-blue-400'
    default:
      return 'bg-slate-500/20 text-slate-400'
  }
}

export function getVerdictColor(verdict: 'positive' | 'negative' | 'neutral'): string {
  switch (verdict) {
    case 'positive':
      return 'text-green-400 bg-green-500/10 border-green-500/20'
    case 'negative':
      return 'text-red-400 bg-red-500/10 border-red-500/20'
    case 'neutral':
      return 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20'
    default:
      return 'text-slate-400 bg-slate-500/10 border-slate-500/20'
  }
}
