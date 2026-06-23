'use client'

import { useMemo } from 'react'
import LavaBackground from '@/components/layout/matrix-background/lava-background'
import { PITCH, TILE_SIZE } from '../constants'
import usePanZoom from '../hooks/use-pan-zoom'
import { thingies } from '../thingies'
import { placeTiles } from '../utils/place-tiles'
import ThingyFrame from './thingy-frame'
import ZoomControls from './zoom-controls'

/** A huge, cheap repeating-dot layer — large enough to always cover the viewport
 *  as it pans, even at the minimum zoom. It's pure CSS background, so its size
 *  costs nothing. */
const DOT_FIELD = 40000

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
  const layout = useMemo(() => {
    const cells = placeTiles(thingies.length)
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
  }, [])

  const { containerRef, dotsRef, tilesRef, zoomIn, zoomOut } = usePanZoom({
    contentW: layout.contentW,
    contentH: layout.contentH,
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
        <LavaBackground />
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
        {layout.tiles.map((tile) => (
          <ThingyFrame
            key={tile.entry.id}
            entry={tile.entry}
            left={tile.left}
            top={tile.top}
          />
        ))}
      </div>
      <ZoomControls onZoomIn={zoomIn} onZoomOut={zoomOut} />
    </div>
  )
}

export default ThingyCanvas
