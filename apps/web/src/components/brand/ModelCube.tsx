'use client'

import { cn } from '@/lib/utils'

interface ModelCubeProps {
  colorClassName?: string
  size?: number
  className?: string
}

/**
 * A small spinning CSS cube  six faces, real 3D transforms, no WebGL.
 * Used as a per-model badge in the marquee so each entry reads as "a
 * distinct running model" rather than a repeated stock icon, without the
 * cost (or WebGL-context pressure) of a Canvas per row item.
 */
export function ModelCube({
  colorClassName = 'bg-primary/70',
  size = 26,
  className,
}: ModelCubeProps) {
  const half = size / 2
  const faces = [
    `rotateY(0deg) translateZ(${half}px)`,
    `rotateY(180deg) translateZ(${half}px)`,
    `rotateY(90deg) translateZ(${half}px)`,
    `rotateY(-90deg) translateZ(${half}px)`,
    `rotateX(90deg) translateZ(${half}px)`,
    `rotateX(-90deg) translateZ(${half}px)`,
  ]

  return (
    <div className={cn('cube-scene shrink-0', className)} style={{ width: size, height: size }}>
      <div className="cube-3d" style={{ width: size, height: size }}>
        {faces.map((transform, i) => (
          <div key={i} className={cn('cube-face', colorClassName)} style={{ transform }} />
        ))}
      </div>
    </div>
  )
}

export default ModelCube
