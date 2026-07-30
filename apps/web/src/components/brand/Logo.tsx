import { cn } from '@/lib/utils'

interface LogoMarkProps {
  className?: string
}

/**
 * Three agents, one verdict: the mark behind the wordmark. Three nodes
 * (the reviewing models) resolve into a single diamond at the center
 * (the consensus). Deliberately not a sparkle/orb/gradient-blob glyph.
 */
export function LogoMark({ className }: LogoMarkProps) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn('h-8 w-8', className)}
      aria-hidden="true"
    >
      <rect width="32" height="32" rx="9" className="fill-card" />
      <rect width="32" height="32" rx="9" className="fill-primary/10" />
      <line
        x1="16"
        y1="16"
        x2="16"
        y2="8"
        stroke="currentColor"
        strokeOpacity="0.35"
        strokeWidth="1.4"
      />
      <line
        x1="16"
        y1="16"
        x2="9.07"
        y2="20"
        stroke="currentColor"
        strokeOpacity="0.35"
        strokeWidth="1.4"
      />
      <line
        x1="16"
        y1="16"
        x2="22.93"
        y2="20"
        stroke="currentColor"
        strokeOpacity="0.35"
        strokeWidth="1.4"
      />
      <circle cx="16" cy="8" r="2.6" className="fill-agent-1" />
      <circle cx="9.07" cy="20" r="2.6" className="fill-agent-2" />
      <circle cx="22.93" cy="20" r="2.6" className="fill-agent-3" />
      <path d="M16 12.6 L19.4 16 L16 19.4 L12.6 16 Z" className="fill-primary" />
    </svg>
  )
}

interface LogoProps {
  className?: string
  markClassName?: string
  textClassName?: string
  showWordmark?: boolean
}

export function Logo({ className, markClassName, textClassName, showWordmark = true }: LogoProps) {
  return (
    <div className={cn('flex items-center gap-2.5', className)}>
      <LogoMark className={markClassName} />
      {showWordmark && (
        <span
          className={cn(
            'font-display text-lg font-medium leading-none tracking-tight text-foreground',
            textClassName
          )}
        >
          AI Review
        </span>
      )}
    </div>
  )
}

export default Logo
