'use client'

import dynamic from 'next/dynamic'
import { useMemo } from 'react'
import { ThingyActiveProvider } from '../hooks/use-thingy-active'
import { thingies } from '../thingies'
import TileErrorBoundary from './tile-error-boundary'

/** The tile id to preview. Only the id crosses the server→client boundary — the
 *  registry's `load` is a function and can't be serialised, so this component looks
 *  its own entry up from the registry client-side. */
type TilePreviewProps = { id: string }

/**
 * Renders a single tile in isolation for `/thingies/[id]` — large, centred, and
 * always animating. It reuses the two decoupled canvas primitives — the
 * ThingyActiveProvider (fixed `active`, so a JS-loop tile runs and never freezes)
 * and TileErrorBoundary (a broken tile falls back quietly instead of blanking the
 * page) — but deliberately skips ThingyFrame's fade / off-screen freeze / windowing,
 * which are canvas concerns with no meaning for a lone foreground tile.
 *
 * The drawing fills its opaque square edge-to-edge (no safe-area inset — there are
 * no neighbouring tiles to keep clear of here), so the surrounding dot matrix reads
 * as the tile's border. The tile is client-only (`ssr: false`): tiles animate and
 * are decorative, so there's nothing to gain from server-rendering them. Content is
 * `pointer-events: none` to match the canvas — a previewed tile stays non-interactive.
 */
export default function TilePreview({ id }: TilePreviewProps) {
  const Content = useMemo(() => {
    const entry = thingies.find((t) => t.id === id)
    if (!entry) return () => null
    return dynamic(entry.load, { ssr: false, loading: () => null })
  }, [id])

  return (
    <div className="pointer-events-none aspect-square w-[min(80vmin,640px)] overflow-hidden bg-background text-foreground">
      <TileErrorBoundary>
        <ThingyActiveProvider active={true}>
          <Content />
        </ThingyActiveProvider>
      </TileErrorBoundary>
    </div>
  )
}
