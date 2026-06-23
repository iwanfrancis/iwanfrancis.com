'use client'

import { useEffect, useMemo, useRef } from 'react'
import LavaBackground from '@/components/layout/matrix-background/lava-background'
import { PITCH, TILE_SIZE } from '../constants'
import { thingies } from '../thingies'
import { placeTiles } from '../utils/place-tiles'
import ThingyFrame from './thingy-frame'

/** A huge, cheap repeating-dot layer — large enough to always cover the viewport
 *  as it pans. It's pure CSS background, so its size costs nothing. */
const DOT_FIELD = 40000
/** How far past the tiles' edge a visitor may overscroll, in px. */
const EDGE_MARGIN = 140
/** Per-frame velocity decay during a fling. */
const FRICTION = 0.92
/** Below this px/frame the fling stops. */
const MIN_VELOCITY = 0.25

/**
 * The /thingies surface. Three stacked layers in a fixed, viewport-filling
 * container:
 *   - dots  (z0): the matrix grid, panned with the tiles so they read as pinned
 *                 to one surface;
 *   - lava  (z10): the ambient background, fixed to the viewport;
 *   - tiles (z20): the placed tile frames, above the lava so they aren't muted.
 *
 * The dots and tiles layers share one translate transform; the lava stays put.
 * Panning is DIY pointer events (one path for mouse and touch), with a fling and
 * a clamp to the tiles' extent. All layers are pointer-transparent, so the
 * container catches every drag — including drags that start on a tile.
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

  const containerRef = useRef<HTMLDivElement>(null)
  const dotsRef = useRef<HTMLDivElement>(null)
  const tilesRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const container = containerRef.current
    const dots = dotsRef.current
    const tiles = tilesRef.current
    if (!container || !dots || !tiles) return

    const { contentW, contentH } = layout
    const offset = { x: 0, y: 0 }
    const velocity = { x: 0, y: 0 }
    const last = { x: 0, y: 0 }
    let dragging = false
    let vw = container.clientWidth
    let vh = container.clientHeight
    let raf = 0

    const clamp = () => {
      const maxX = Math.max(EDGE_MARGIN, (contentW - vw) / 2 + EDGE_MARGIN)
      const maxY = Math.max(EDGE_MARGIN, (contentH - vh) / 2 + EDGE_MARGIN)
      offset.x = Math.max(-maxX, Math.min(maxX, offset.x))
      offset.y = Math.max(-maxY, Math.min(maxY, offset.y))
    }
    const apply = () => {
      const transform = `translate3d(${offset.x}px, ${offset.y}px, 0)`
      dots.style.transform = transform
      tiles.style.transform = transform
    }
    clamp()
    apply()

    const stopInertia = () => {
      if (raf) cancelAnimationFrame(raf)
      raf = 0
    }
    const inertia = () => {
      offset.x += velocity.x
      offset.y += velocity.y
      velocity.x *= FRICTION
      velocity.y *= FRICTION
      clamp()
      apply()
      if (
        Math.abs(velocity.x) < MIN_VELOCITY &&
        Math.abs(velocity.y) < MIN_VELOCITY
      ) {
        raf = 0
        return
      }
      raf = requestAnimationFrame(inertia)
    }

    const onDown = (e: PointerEvent) => {
      if (e.pointerType === 'mouse' && e.button !== 0) return
      dragging = true
      stopInertia()
      velocity.x = 0
      velocity.y = 0
      last.x = e.clientX
      last.y = e.clientY
      container.setPointerCapture(e.pointerId)
      container.style.cursor = 'grabbing'
    }
    const onMove = (e: PointerEvent) => {
      if (!dragging) return
      const dx = e.clientX - last.x
      const dy = e.clientY - last.y
      last.x = e.clientX
      last.y = e.clientY
      offset.x += dx
      offset.y += dy
      velocity.x = dx
      velocity.y = dy
      clamp()
      apply()
    }
    const onUp = (e: PointerEvent) => {
      if (!dragging) return
      dragging = false
      container.releasePointerCapture(e.pointerId)
      container.style.cursor = 'grab'
      if (
        Math.abs(velocity.x) > MIN_VELOCITY ||
        Math.abs(velocity.y) > MIN_VELOCITY
      ) {
        raf = requestAnimationFrame(inertia)
      }
    }
    const onResize = () => {
      vw = container.clientWidth
      vh = container.clientHeight
      clamp()
      apply()
    }

    container.addEventListener('pointerdown', onDown)
    container.addEventListener('pointermove', onMove)
    container.addEventListener('pointerup', onUp)
    container.addEventListener('pointercancel', onUp)
    window.addEventListener('resize', onResize)
    return () => {
      stopInertia()
      container.removeEventListener('pointerdown', onDown)
      container.removeEventListener('pointermove', onMove)
      container.removeEventListener('pointerup', onUp)
      container.removeEventListener('pointercancel', onUp)
      window.removeEventListener('resize', onResize)
    }
  }, [layout])

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 select-none overflow-hidden"
      style={{ touchAction: 'none', cursor: 'grab' }}
    >
      <div
        ref={dotsRef}
        className="bg-matrix pointer-events-none absolute z-0"
        style={{
          left: '50%',
          top: '50%',
          width: DOT_FIELD,
          height: DOT_FIELD,
          marginLeft: -DOT_FIELD / 2,
          marginTop: -DOT_FIELD / 2,
          willChange: 'transform',
        }}
      />
      <div className="pointer-events-none absolute inset-0 z-10">
        <LavaBackground />
      </div>
      <div
        ref={tilesRef}
        className="pointer-events-none absolute z-20"
        style={{ left: '50%', top: '50%', willChange: 'transform' }}
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
    </div>
  )
}

export default ThingyCanvas
