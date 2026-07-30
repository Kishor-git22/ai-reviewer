'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { Cpu } from 'lucide-react'
import { cn } from '@/lib/utils'
import { NVIDIA_MODELS } from './ModelSelector'

const AGENT_DOT_BG = ['bg-agent-1', 'bg-agent-2', 'bg-agent-3']
const AGENT_TEXT = ['text-agent-1', 'text-agent-2', 'text-agent-3']
const AGENT_RING = ['ring-agent-1', 'ring-agent-2', 'ring-agent-3']

type Line = { speaker: number; text: string }

function buildScript(names: string[], prTitle?: string): Line[] {
  const [a, b, c] = names
  const title = prTitle ? `“${prTitle}”` : 'this pull request'

  return [
    { speaker: 0, text: `${a} is reading the diff for ${title}.` },
    { speaker: 1, text: `${b} is cross-referencing it against known failure patterns.` },
    { speaker: 2, text: `${c} is checking for missing edge cases and null handling.` },
    { speaker: 0, text: `Possible issue flagged  routing it to the panel for a second opinion.` },
    { speaker: 1, text: `I see the same thing. Confidence is high here.` },
    { speaker: 2, text: `Disagree  looks safe given the surrounding context. Holding my vote.` },
    { speaker: 0, text: `Split opinion. Weighing severity before we finalize.` },
    { speaker: 1, text: `Casting the deciding vote based on how the function is actually called.` },
    { speaker: 2, text: `Fair  updating my read. Consensus reached on this finding.` },
    { speaker: 0, text: `Moving to the next changed file.` },
    { speaker: 1, text: `Scanning for style and consistency issues.` },
    { speaker: 2, text: `Re-checking security-sensitive paths before we close this out.` },
  ]
}

interface DebateArenaProps {
  modelIds: string[]
  prTitle?: string
  className?: string
}

export function DebateArena({ modelIds, prTitle, className }: DebateArenaProps) {
  const agents = useMemo(() => {
    const ids = modelIds.length ? modelIds : ['a', 'b', 'c']
    return ids.slice(0, 3).map((id, i) => {
      const model = NVIDIA_MODELS.find((m) => m.id === id)
      return model?.name || `Agent ${i + 1}`
    })
  }, [modelIds])

  const script = useMemo(() => buildScript(agents, prTitle), [agents, prTitle])

  // Full history is kept (never truncated) so scrolling up actually shows
  // earlier debate instead of lines that were silently discarded from state.
  const [log, setLog] = useState<Line[]>(() => [script[0]])
  const [tick, setTick] = useState(1)

  const scrollRef = useRef<HTMLDivElement>(null)
  // Sticks to the bottom for new messages by default, but stops the moment
  // the user scrolls up to read earlier lines - re-engages once they scroll
  // back down themselves, same as a normal chat log.
  const stickToBottomRef = useRef(true)

  useEffect(() => {
    setLog([script[0]])
    setTick(1)
    stickToBottomRef.current = true
    let i = 1
    const id = setInterval(() => {
      setLog((prev) => [...prev, script[i % script.length]])
      setTick((t) => t + 1)
      i++
    }, 2600)
    return () => clearInterval(id)
  }, [script])

  useEffect(() => {
    const el = scrollRef.current
    if (el && stickToBottomRef.current) {
      el.scrollTop = el.scrollHeight
    }
  }, [log])

  const handleScroll = () => {
    const el = scrollRef.current
    if (!el) return
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight
    stickToBottomRef.current = distanceFromBottom < 48
  }

  const activeSpeaker = log[log.length - 1]?.speaker ?? 0
  const nextSpeaker = (activeSpeaker + 1) % 3
  const progress = Math.min(92, 10 + tick * 6)
  const circumference = 2 * Math.PI * 26
  const dashOffset = circumference * (1 - progress / 100)

  return (
    <div className={cn('w-full max-w-lg', className)}>
      {/* Agent row */}
      <div className="mb-8 flex items-center justify-center gap-6 sm:gap-10">
        {agents.map((name, i) => (
          <div key={name} className="flex flex-col items-center gap-2">
            <div
              className={cn(
                'flex h-12 w-12 items-center justify-center rounded-full border bg-card transition-all duration-300',
                activeSpeaker === i
                  ? cn(
                      'scale-110 border-transparent ring-2 ring-offset-2 ring-offset-background',
                      AGENT_RING[i]
                    )
                  : 'border-border/60'
              )}
            >
              <Cpu className={cn('h-5 w-5', AGENT_TEXT[i])} />
            </div>
            <span className="max-w-[5.5rem] truncate text-center text-[10px] font-semibold text-muted-foreground">
              {name}
            </span>
          </div>
        ))}
      </div>

      {/* Transcript - fixed height, scrolls so earlier debate is never lost */}
      <div className="rounded-2xl border border-border/60 bg-card/60 p-5">
        <div
          ref={scrollRef}
          onScroll={handleScroll}
          className="dashboard-scroll max-h-72 space-y-3 overflow-y-auto pr-1"
        >
          {log.map((line, i) => (
            <div
              key={`${line.speaker}-${i}-${line.text.slice(0, 12)}`}
              className="view-transition flex items-start gap-3"
            >
              <span
                className={cn(
                  'mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full',
                  AGENT_DOT_BG[line.speaker]
                )}
              />
              <p className="text-[13px] leading-relaxed text-foreground/80">
                <span className={cn('font-semibold', AGENT_TEXT[line.speaker])}>
                  {agents[line.speaker]}:
                </span>{' '}
                {line.text}
              </p>
            </div>
          ))}

          {/* Typing indicator for whoever speaks next */}
          <div className="flex items-center gap-3 pt-1">
            <span className={cn('h-1.5 w-1.5 shrink-0 rounded-full', AGENT_DOT_BG[nextSpeaker])} />
            <div className="flex items-center gap-1">
              <span className="typing-dot h-1.5 w-1.5 rounded-full bg-muted-foreground" />
              <span
                className="typing-dot h-1.5 w-1.5 rounded-full bg-muted-foreground"
                style={{ animationDelay: '0.15s' }}
              />
              <span
                className="typing-dot h-1.5 w-1.5 rounded-full bg-muted-foreground"
                style={{ animationDelay: '0.3s' }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Consensus meter */}
      <div className="mt-6 flex items-center justify-center gap-3">
        <svg width="60" height="60" viewBox="0 0 60 60" className="-rotate-90">
          <circle cx="30" cy="30" r="26" fill="none" stroke="hsl(var(--border))" strokeWidth="4" />
          <circle
            cx="30"
            cy="30"
            r="26"
            fill="none"
            stroke="hsl(var(--primary))"
            strokeWidth="4"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
            style={{ transition: 'stroke-dashoffset 0.8s ease-out' }}
          />
        </svg>
        <div className="text-left">
          <p className="text-sm font-semibold text-foreground">Building consensus</p>
          <p className="text-xs text-muted-foreground">{progress}% of the panel has weighed in</p>
        </div>
      </div>
    </div>
  )
}

export default DebateArena
