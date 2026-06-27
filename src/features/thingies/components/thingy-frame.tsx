'use client'

import dynamic from 'next/dynamic'
import { useMemo } from 'react'
import { cn } from '@/utils/cn'
import { TILE_SIZE } from '../constants'
import type { ThingyEntry } from '../thingies'
import TileErrorBoundary from './tile-error-boundary'

type ThingyFrameProps = {
  entry: ThingyEntry
  /** Position within the tiles layer, in px (centre of the blob is at 0,0). */
  left: number
  top: number
  /** True when the tile is mounted but off-screen: its animations are paused
   *  (see the .thingy-frozen rule in globals.css) until it scrolls back in. */
  frozen?: boolean
}

/**
 * The reusable square that hosts one tile. It:
 * - is a fixed-size square clipped to its bounds,
 * - code-splits its content (each tile is its own chunk, loaded on demand, with
 *   a tile-sized placeholder so the grid never reflows),
 * - renders the content non-interactively, so a drag is never captured by a
 *   tile, and
 * - isolates failures, so one broken tile can't blank the page.
 *
 * Content is client-only (`ssr: false`): tiles are decorative and often animate,
 * so there's nothing to gain from server rendering them.
 */
function ThingyFrame({ entry, left, top, frozen }: ThingyFrameProps) {
  const Content = useMemo(
    () => dynamic(entry.load, { ssr: false, loading: () => null }),
    [entry.load]
  )

  return (
    <div
      className={cn(
        'absolute overflow-hidden bg-background',
        frozen && 'thingy-frozen'
      )}
      style={{ left, top, width: TILE_SIZE, height: TILE_SIZE }}
    >
      <div className="pointer-events-none h-full w-full">
        <TileErrorBoundary>
          <Content />
        </TileErrorBoundary>
      </div>
    </div>
  )
}

export default ThingyFrame
