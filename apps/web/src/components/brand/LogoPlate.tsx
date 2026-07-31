'use client'

import { cn } from '@/lib/utils'

interface LogoPlateProps {
  children: React.ReactNode
  size?: number
  className?: string
}

/**
 * A flat plate that continuously turns through 3D space (rotateY)  real
 * CSS 3D, no WebGL. It renders its content on both faces with the back one
 * pre-flipped 180deg, so whichever face is toward the viewer at any moment
 * always reads right-side-out instead of mirroring mid-spin.
 */
export function LogoPlate({ children, size = 28, className }: LogoPlateProps) {
  return (
    <div className={cn('plate-scene shrink-0', className)} style={{ width: size, height: size }}>
      <div className="plate-3d" style={{ width: size, height: size }}>
        <div className="plate-face flex items-center justify-center">{children}</div>
        <div className="plate-face plate-face-back flex items-center justify-center">
          {children}
        </div>
      </div>
    </div>
  )
}

export default LogoPlate
