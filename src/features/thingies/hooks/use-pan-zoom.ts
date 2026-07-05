'use client'

import { useGesture } from '@use-gesture/react'
import { useCallback, useEffect, useRef } from 'react'
import {
  EDGE_MARGIN,
  FLING_SPEED,
  FRICTION,
  MAX_SCALE,
  MIN_SCALE,
  MIN_VELOCITY,
  TILE_SIZE,
  WHEEL_SESSION_GAP,
  WHEEL_ZOOM_SPEED,
  ZOOM_ANIM_MS,
  ZOOM_STEP,
} from '../constants'
import type { Viewport } from '../utils/visible-band'

type UsePanZoomOptions = {
  contentW: number
  contentH: number
  /** Notified (rAF-throttled) whenever the pan/zoom transform changes, so the
   *  canvas can recompute which tiles to mount. */
  onViewport?: (viewport: Viewport) => void
}

/** Imperative engine the gesture handlers and zoom buttons both drive. Held in
 *  a ref so the once-bound listeners and rAF loops always see the live state. */
type Engine = {
  onDrag: (s: GestureDragState) => void
  /** Returns the @use-gesture pinch memo (previous scale) to persist. */
  onPinch: (s: GesturePinchState) => number
  zoomBy: (factor: number) => void
}

// Minimal shapes of the @use-gesture state we read (avoids leaking its generics).
type GestureDragState = {
  pinching?: boolean
  first: boolean
  last: boolean
  delta: [number, number]
  velocity: [number, number]
  direction: [number, number]
}
type GesturePinchState = {
  first: boolean
  offset: [number, number]
  origin: [number, number]
  memo?: number
}

const clamp = (v: number, min: number, max: number) =>
  Math.max(min, Math.min(max, v))

const prefersReducedMotion = () =>
  typeof window !== 'undefined' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches

/**
 * Pan + zoom controller for the /thingies surface.
 *
 * One screen-space `offset` and one `scale` drive a single
 * `translate(offset) scale(scale)` transform written to BOTH the dots and tiles
 * layers (each anchored at the container centre with `transform-origin: 0 0`), so
 * they scale as one pinned surface. Zoom is anchored to a focal point:
 *   offset' = (s1/s0)·offset + (f − A)·(1 − s1/s0)   with A = container centre.
 *
 * @use-gesture supplies normalised drag (pan + fling velocity) and touch pinch;
 * wheel is handled directly so mouse-wheel (zoom), trackpad swipe (pan), and
 * trackpad pinch (ctrl+wheel, zoom) can be split by hand.
 */
function usePanZoom({ contentW, contentH, onViewport }: UsePanZoomOptions) {
  const containerRef = useRef<HTMLDivElement>(null)
  const dotsRef = useRef<HTMLDivElement>(null)
  const tilesRef = useRef<HTMLDivElement>(null)

  const layoutRef = useRef({ contentW, contentH })
  layoutRef.current = { contentW, contentH }

  // Stored in a ref so the once-bound listeners and rAF loops call the live one.
  const onViewportRef = useRef(onViewport)
  onViewportRef.current = onViewport

  const engineRef = useRef<Engine | null>(null)

  // @use-gesture drives the engine; the engine isn't ready on the first render,
  // so the handlers no-op via optional chaining until the effect populates it.
  useGesture(
    {
      onDrag: (state) =>
        engineRef.current?.onDrag(state as unknown as GestureDragState),
      // Return value becomes @use-gesture's pinch memo (the previous scale).
      onPinch: (state) =>
        engineRef.current?.onPinch(state as unknown as GesturePinchState),
    },
    {
      target: containerRef,
      eventOptions: { passive: false },
      // Touch pinch only — wheel-based zoom (incl. trackpad ctrl+wheel) is ours.
      pinch: { pinchOnWheel: false },
    }
  )

  useEffect(() => {
    const container = containerRef.current
    const dots = dotsRef.current
    const tiles = tilesRef.current
    if (!container || !dots || !tiles) return

    const offset = { x: 0, y: 0 }
    const velocity = { x: 0, y: 0 }
    let scale = 1
    let flingRaf = 0
    let zoomRaf = 0
    let viewportRaf = 0

    // Tell the canvas the transform changed, coalesced to one call per frame so a
    // 60fps pan doesn't fire 60 React updates — the canvas itself only re-renders
    // when the resulting cell band actually changes.
    const notifyViewport = () => {
      viewportRaf = 0
      onViewportRef.current?.({
        vw: container.clientWidth,
        vh: container.clientHeight,
        offsetX: offset.x,
        offsetY: offset.y,
        scale,
      })
    }
    const scheduleViewportNotify = () => {
      if (viewportRaf) return
      viewportRaf = requestAnimationFrame(notifyViewport)
    }

    const applyTransform = () => {
      const t = `translate(${offset.x}px, ${offset.y}px) scale(${scale})`
      dots.style.transform = t
      tiles.style.transform = t
      // Single chokepoint: every drag/wheel/pinch/fling/zoom/resize path ends
      // here, so one notify hook-up covers them all.
      scheduleViewportNotify()
    }

    // Pan limit for one axis. The bound lets the OUTERMOST tile's centre reach the
    // viewport centre (not just the blob's edge reach the viewport edge), so any
    // tile can be brought to the middle at any zoom. `keepOverlap` floors it so the
    // bound is never tighter than "scaled blob still overlaps the viewport" on a
    // viewport narrower than one scaled tile; EDGE_MARGIN adds the usual overscroll.
    const axisMax = (content: number, viewport: number) => {
      const half = (content * scale) / 2
      const keepOverlap = Math.max(0, half - viewport / 2)
      const centreTile = Math.max(0, half - (TILE_SIZE * scale) / 2)
      return Math.max(keepOverlap, centreTile) + EDGE_MARGIN
    }
    const clampOffset = () => {
      const vw = container.clientWidth
      const vh = container.clientHeight
      const { contentW, contentH } = layoutRef.current
      const maxX = axisMax(contentW, vw)
      const maxY = axisMax(contentH, vh)
      offset.x = clamp(offset.x, -maxX, maxX)
      offset.y = clamp(offset.y, -maxY, maxY)
    }

    /** Set scale to `next` (clamped) keeping the screen point (fx,fy) fixed. */
    const zoomTo = (
      next: number,
      focalClientX: number,
      focalClientY: number
    ) => {
      const rect = container.getBoundingClientRect()
      const s0 = scale
      const s1 = clamp(next, MIN_SCALE, MAX_SCALE)
      if (s1 === s0) return
      const fx = focalClientX - rect.left - rect.width / 2
      const fy = focalClientY - rect.top - rect.height / 2
      const k = s1 / s0
      offset.x = k * offset.x + fx * (1 - k)
      offset.y = k * offset.y + fy * (1 - k)
      scale = s1
      clampOffset()
      applyTransform()
    }

    const stopFling = () => {
      if (flingRaf) cancelAnimationFrame(flingRaf)
      flingRaf = 0
    }
    const stopZoomAnim = () => {
      if (zoomRaf) cancelAnimationFrame(zoomRaf)
      zoomRaf = 0
    }
    const flingStep = () => {
      offset.x += velocity.x
      offset.y += velocity.y
      velocity.x *= FRICTION
      velocity.y *= FRICTION
      clampOffset()
      applyTransform()
      if (
        Math.abs(velocity.x) < MIN_VELOCITY &&
        Math.abs(velocity.y) < MIN_VELOCITY
      ) {
        flingRaf = 0
        return
      }
      flingRaf = requestAnimationFrame(flingStep)
    }

    const viewportCentre = () => {
      const rect = container.getBoundingClientRect()
      return { cx: rect.left + rect.width / 2, cy: rect.top + rect.height / 2 }
    }

    /** Zoom by a scale factor about the viewport centre (buttons / keyboard). */
    const zoomBy = (factor: number) => {
      stopFling()
      stopZoomAnim()
      const { cx, cy } = viewportCentre()
      const target = clamp(scale * factor, MIN_SCALE, MAX_SCALE)
      if (target === scale) return
      if (prefersReducedMotion()) {
        zoomTo(target, cx, cy)
        return
      }
      const from = scale
      const start = performance.now()
      const step = (now: number) => {
        const t = Math.min(1, (now - start) / ZOOM_ANIM_MS)
        const eased = 1 - (1 - t) * (1 - t) // easeOutQuad
        zoomTo(from + (target - from) * eased, cx, cy)
        zoomRaf = t < 1 ? requestAnimationFrame(step) : 0
      }
      zoomRaf = requestAnimationFrame(step)
    }

    // --- Wheel: mouse-wheel zoom / trackpad swipe pan / trackpad pinch zoom.
    //     A continuous scroll fires a *stream* of events whose per-event shape
    //     varies (esp. mouse smooth-scrolling), so classifying each one flips
    //     between zoom and pan mid-gesture — the jank. Instead, classify ONCE
    //     and lock that mode for the burst, resetting only after a brief pause.
    let wheelMode: 'zoom' | 'pan' | null = null
    let wheelEndTimer = 0
    const endWheelSession = () => {
      wheelMode = null
      wheelEndTimer = 0
    }
    const onWheel = (event: WheelEvent) => {
      if (event.cancelable) event.preventDefault()
      stopFling()
      stopZoomAnim()
      if (wheelEndTimer) clearTimeout(wheelEndTimer)
      wheelEndTimer = window.setTimeout(endWheelSession, WHEEL_SESSION_GAP)

      // Normalise deltaY out of line/page units into px.
      const unit =
        event.deltaMode === 1
          ? 16
          : event.deltaMode === 2
            ? container.clientHeight
            : 1
      const zoomAboutCursor = () =>
        zoomTo(
          scale * Math.exp(-event.deltaY * unit * WHEEL_ZOOM_SPEED),
          event.clientX,
          event.clientY
        )

      // ctrl+wheel is how browsers report a trackpad pinch → always zoom.
      if (event.ctrlKey) {
        wheelMode = 'zoom'
        zoomAboutCursor()
        return
      }

      // A horizontal component is strong evidence of a trackpad swipe (a mouse
      // wheel has no horizontal axis), so lock the burst to pan the moment we
      // see one. Otherwise a plain wheel (deltaX 0 = a mouse) defaults to zoom.
      if (event.deltaX !== 0) wheelMode = 'pan'
      else if (wheelMode === null) wheelMode = 'zoom'

      if (wheelMode === 'pan') {
        offset.x -= event.deltaX
        offset.y -= event.deltaY
        clampOffset()
        applyTransform()
        return
      }

      zoomAboutCursor()
    }

    // --- Keyboard zoom (global +/-), in addition to the focusable buttons -----
    const onKeyDown = (event: KeyboardEvent) => {
      const el = document.activeElement
      if (el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA')) return
      if (event.key === '+' || event.key === '=') {
        event.preventDefault()
        zoomBy(ZOOM_STEP)
      } else if (event.key === '-' || event.key === '_') {
        event.preventDefault()
        zoomBy(1 / ZOOM_STEP)
      }
    }

    const onResize = () => {
      clampOffset()
      applyTransform()
    }

    engineRef.current = {
      onDrag: ({ pinching, first, last, delta, velocity: v, direction }) => {
        if (pinching) return
        if (first) {
          stopFling()
          stopZoomAnim()
          container.style.cursor = 'grabbing'
        }
        offset.x += delta[0]
        offset.y += delta[1]
        clampOffset()
        applyTransform()
        if (last) {
          container.style.cursor = 'grab'
          velocity.x = v[0] * direction[0] * FLING_SPEED
          velocity.y = v[1] * direction[1] * FLING_SPEED
          if (
            Math.abs(velocity.x) > MIN_VELOCITY ||
            Math.abs(velocity.y) > MIN_VELOCITY
          ) {
            flingRaf = requestAnimationFrame(flingStep)
          }
        }
      },
      onPinch: ({ first, offset: [s], origin, memo }) => {
        if (first) {
          stopFling()
          stopZoomAnim()
          return s
        }
        const prev = memo ?? s
        if (prev !== 0) zoomTo(scale * (s / prev), origin[0], origin[1])
        return s
      },
      zoomBy,
    }

    container.addEventListener('wheel', onWheel, { passive: false })
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('resize', onResize)
    applyTransform()

    return () => {
      stopFling()
      stopZoomAnim()
      if (viewportRaf) cancelAnimationFrame(viewportRaf)
      container.removeEventListener('wheel', onWheel)
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('resize', onResize)
      engineRef.current = null
    }
  }, [])

  const zoomIn = useCallback(() => engineRef.current?.zoomBy(ZOOM_STEP), [])
  const zoomOut = useCallback(
    () => engineRef.current?.zoomBy(1 / ZOOM_STEP),
    []
  )

  return { containerRef, dotsRef, tilesRef, zoomIn, zoomOut }
}

export default usePanZoom
