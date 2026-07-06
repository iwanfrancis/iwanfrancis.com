import type { ReactNode } from 'react'
import LavaBackground from '@/components/layout/matrix-background/lava-background'

/**
 * Shared shell for the single-tile preview pages. The ambient background — the dot
 * matrix (bg-matrix) muted and drifted by the LavaBackground canvas — lives here so
 * it survives navigation between tiles (`/thingies/0013` → `/thingies/0014`): Next
 * preserves a layout at a *static* segment across navigation, re-rendering only the
 * page below, so the lava field keeps drifting instead of resetting and cross-fading
 * back in on every change.
 *
 * This is a route group (`(preview)`), so it adds no URL segment — the pages stay at
 * `/thingies/[id]`. It has to sit *above* the `[id]` segment rather than inside it:
 * a layout at the dynamic `[id]` segment is keyed by the param and remounts on every
 * navigation (which is exactly what reset the lava). It also can't be hoisted to the
 * parent `(canvas)` layout, because the `/thingies` canvas page paints its own
 * pannable lava and would then double up.
 */
export default function ThingyPreviewLayout({
  children,
}: {
  children: ReactNode
}) {
  return (
    <div className="bg-matrix relative h-dvh overflow-clip">
      <LavaBackground />
      {children}
    </div>
  )
}
