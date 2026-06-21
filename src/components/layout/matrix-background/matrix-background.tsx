import { cn } from '@/utils/cn'
import LavaBackground from './lava-background'

type MatrixBackgroundProps = {
  children: React.ReactNode
  className?: string
}

/**
 * Ambient "lava lamp" background. The container paints the vivid dot matrix; the
 * LavaBackground canvas lays a muting scrim over it and punches soft-edged,
 * drifting holes that fuse like liquid, revealing the vivid dots beneath. The
 * holes are anchored to document coordinates, so they drift with the page rather
 * than sticking to the viewport.
 */
function MatrixBackground({ children, className }: MatrixBackgroundProps) {
  return (
    <div className={cn('bg-matrix relative overflow-clip', className)}>
      <LavaBackground />
      <div className="relative z-20">{children}</div>
    </div>
  )
}

export default MatrixBackground
