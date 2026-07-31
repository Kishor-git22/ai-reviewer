'use client'

import { useEffect, useRef } from 'react'
import { cn } from '@/lib/utils'

interface HeroVideoProps {
  className?: string
}

// The hero visual as a rendered clip instead of a live WebGL scene. Autoplay
// and looping are driven imperatively in an effect (not the autoPlay/loop
// JSX attributes) so server and client render the exact same static markup
//  no hydration mismatch  and so prefers-reduced-motion can be honored by
// simply never starting playback, leaving the first frame in place.
export function HeroVideo({ className }: HeroVideoProps) {
  const videoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (prefersReducedMotion) {
      video.pause()
      return
    }

    video.loop = true
    video.play().catch(() => {
      // Autoplay can still be blocked in some browser contexts  fine, it
      // just sits on the first frame instead of throwing.
    })
  }, [])

  return (
    <div
      className={cn(
        'relative h-full w-full overflow-hidden rounded-2xl',
        '[mask-image:radial-gradient(ellipse_80%_80%_at_50%_50%,#000_60%,transparent_100%)]',
        className
      )}
    >
      <video ref={videoRef} muted playsInline preload="auto" className="h-full w-full object-cover">
        <source src="/hero.mp4" type="video/mp4" />
      </video>
    </div>
  )
}

export default HeroVideo
