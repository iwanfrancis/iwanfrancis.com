'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import LavaBackground from '@/components/layout/matrix-background/lava-background'
import { PITCH, TILE_SIZE } from '../constants'
import usePanZoom from '../hooks/use-pan-zoom'
import { thingies } from '../thingies'
import { placeTiles } from '../utils/place-tiles'
import { shuffle } from '../utils/shuffle'
import {
  type Bands,
  computeBands,
  intersects,
  type Viewport,
} from '../utils/visible-band'
import CanvasControls from './canvas-controls'
import ThingyFrame from './thingy-frame'

/** A huge, cheap repeating-dot layer — large enough to always cover the viewport
 *  as it pans, even at the minimum zoom. It's pure CSS background, so its size
 *  costs nothing. */
const DOT_FIELD = 40000

/** First-paint fallback viewport for the mount band — real dimensions arrive via
 *  onViewport one frame after mount. Fixed (not read from `window`) so the server
 *  and client first render mount the same tiles and hydration doesn't drift. */
const INITIAL_VW = 1280
const INITIAL_VH = 800

/**
 * The /thingies surface. Three stacked layers in a fixed, viewport-filling
 * container:
 *   - dots  (z0): the matrix grid, panned and zoomed with the tiles so they read
 *                 as pinned to one surface;
 *   - lava  (z10): the ambient background, fixed to the viewport;
 *   - tiles (z20): the placed tile frames, above the lava so they aren't muted.
 *
 * The dots and tiles layers share one `translate … scale …` transform; the lava
 * stays put. Both transformed layers anchor at the container centre with
 * `transform-origin: 0 0`, so the single transform scales them about the same
 * point and they never drift apart. The dot field is centred by a static inner
 * offset (not a margin) so the outer layer's origin sits at that shared anchor.
 *
 * Pan + zoom live in usePanZoom (DIY pointer maths + @use-gesture recognition).
 * All layers are pointer-transparent, so the container catches every drag —
 * including drags that start on a tile — while the zoom controls sit on top and
 * capture their own clicks.
 */
function ThingyCanvas() {
  // The blob's cells, one per tile (cells[i] is the cell for thingies[i]). Starts
  // from the deterministic placement; shuffle permutes this assignment over the
  // same set of cells, so the blob's shape never changes — only its seating. State
  // (not a useMemo) so a shuffle re-derives the layout. The lazy initialiser keeps
  // first render deterministic and SSR-safe.
  const [cells, setCells] = useState(() => placeTiles(thingies.length))

  const shuffleTiles = useCallback(() => setCells((prev) => shuffle(prev)), [])

  // Global pause: freezes every tile (folded into `frozen` below) and the lava
  // drift. Seeded from the OS reduced-motion preference so a reduced-motion
  // visitor lands paused. `reducedMotion` additionally disables the toggle, since
  // motion is already suppressed at a lower layer (motion-safe CSS, the loop
  // hooks, the lava field) — there the toggle only conveys state. Both start
  // `false` for a deterministic, hydration-safe first render; the effect reads the
  // real preference after mount (the established `tabHidden` pattern).
  const [paused, setPaused] = useState(false)
  const [reducedMotion, setReducedMotion] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    setReducedMotion(mq.matches)
    setPaused(mq.matches)
    const onChange = () => {
      setReducedMotion(mq.matches)
      // Turning reduced motion on mid-session forces paused so the toggle and the
      // (already-stilled) canvas agree; turning it off leaves the visitor's own
      // choice intact.
      if (mq.matches) setPaused(true)
    }
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  const layout = useMemo(() => {
    let minC = Infinity
    let maxC = -Infinity
    let minR = Infinity
    let maxR = -Infinity
    for (const c of cells) {
      if (c.col < minC) minC = c.col
      if (c.col > maxC) maxC = c.col
      if (c.row < minR) minR = c.row
      if (c.row > maxR) maxR = c.row
    }
    // Centre the blob's bounding box on the viewport centre (the layers anchor
    // at left/top 50%), so each tile's offset is relative to that centre.
    const centreX = ((minC + maxC) * PITCH + TILE_SIZE) / 2
    const centreY = ((minR + maxR) * PITCH + TILE_SIZE) / 2
    const tiles = thingies.map((entry, i) => ({
      entry,
      left: cells[i].col * PITCH - centreX,
      top: cells[i].row * PITCH - centreY,
    }))
    return {
      tiles,
      contentW: (maxC - minC) * PITCH + TILE_SIZE,
      contentH: (maxR - minR) * PITCH + TILE_SIZE,
    }
  }, [cells])

  // Which tiles to mount. Starts from a deterministic fallback band (SSR-safe),
  // then the engine pushes the real viewport after mount. setBands keeps the same
  // object when the cell band is unchanged, so a pan only re-renders on a band
  // crossing — not every frame.
  const [bands, setBands] = useState<Bands>(() =>
    computeBands({
      vw: INITIAL_VW,
      vh: INITIAL_VH,
      offsetX: 0,
      offsetY: 0,
      scale: 1,
    })
  )

  const onViewport = useCallback((viewport: Viewport) => {
    setBands((prev) => {
      const next = computeBands(viewport)
      return prev.key === next.key ? prev : next
    })
  }, [])

  const { containerRef, dotsRef, tilesRef, zoomIn, zoomOut } = usePanZoom({
    contentW: layout.contentW,
    contentH: layout.contentH,
    onViewport,
  })

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 select-none overflow-hidden"
      style={{ touchAction: 'none', cursor: 'grab' }}
    >
      <div
        ref={dotsRef}
        className="pointer-events-none absolute z-0"
        style={{
          left: '50%',
          top: '50%',
          transformOrigin: '0 0',
          willChange: 'transform',
        }}
      >
        {/* Static inner offset centres the field on the layer's (0,0) anchor. */}
        <div
          className="bg-matrix absolute"
          style={{
            left: -DOT_FIELD / 2,
            top: -DOT_FIELD / 2,
            width: DOT_FIELD,
            height: DOT_FIELD,
          }}
        />
      </div>
      <div className="pointer-events-none absolute inset-0 z-10">
        <LavaBackground paused={paused} />
      </div>
      <div
        ref={tilesRef}
        className="pointer-events-none absolute z-20"
        style={{
          left: '50%',
          top: '50%',
          transformOrigin: '0 0',
          willChange: 'transform',
        }}
      >
        {layout.tiles
          .filter((tile) => intersects(bands.mount, tile.left, tile.top))
          .map((tile) => (
            <ThingyFrame
              key={tile.entry.id}
              entry={tile.entry}
              left={tile.left}
              top={tile.top}
              frozen={paused || !intersects(bands.active, tile.left, tile.top)}
              paused={paused}
            />
          ))}
      </div>
      <CanvasControls
        onZoomIn={zoomIn}
        onZoomOut={zoomOut}
        onShuffle={shuffleTiles}
        paused={paused}
        onTogglePause={() => setPaused((p) => !p)}
        pauseDisabled={reducedMotion}
      />
    </div>
  )
}

export default ThingyCanvas
