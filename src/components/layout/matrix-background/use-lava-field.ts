import { type RefObject, useEffect } from 'react'

/**
 * A single drifting blob, defined in resolution-independent terms so the field
 * adapts to any viewport / document size:
 * - `x` is a fraction of the container width (0–1)
 * - `y` is a fraction of the container height (0–1)
 * - `r` is a base radius as a fraction of the viewport's smaller side
 * - the `*Amp` / `*Freq` / `*Phase` fields drive a slow, looping drift + wobble
 */
type Blob = {
  x: number
  y: number
  r: number
  xAmp: number
  yAmp: number
  xFreq: number
  yFreq: number
  xPhase: number
  yPhase: number
  rFreq: number
  rPhase: number
}

// Hand-tuned spread of blobs across the page. Radii are deliberately varied
// (small ~0.12 to large ~0.36) so the field has a mix of sizes. Prime-ish
// frequencies keep the combined motion from visibly repeating.
const BLOBS: Blob[] = [
  {
    x: 0.22,
    y: 0.12,
    r: 0.34,
    xAmp: 0.05,
    yAmp: 0.04,
    xFreq: 0.07,
    yFreq: 0.05,
    xPhase: 0,
    yPhase: 1.7,
    rFreq: 0.11,
    rPhase: 0.4,
  },
  {
    x: 0.74,
    y: 0.18,
    r: 0.16,
    xAmp: 0.06,
    yAmp: 0.05,
    xFreq: 0.05,
    yFreq: 0.08,
    xPhase: 2.1,
    yPhase: 0.3,
    rFreq: 0.09,
    rPhase: 1.2,
  },
  {
    x: 0.5,
    y: 0.34,
    r: 0.3,
    xAmp: 0.07,
    yAmp: 0.05,
    xFreq: 0.06,
    yFreq: 0.04,
    xPhase: 4.2,
    yPhase: 2.6,
    rFreq: 0.08,
    rPhase: 2.0,
  },
  {
    x: 0.18,
    y: 0.55,
    r: 0.13,
    xAmp: 0.06,
    yAmp: 0.06,
    xFreq: 0.08,
    yFreq: 0.06,
    xPhase: 1.1,
    yPhase: 3.4,
    rFreq: 0.12,
    rPhase: 0.8,
  },
  {
    x: 0.82,
    y: 0.62,
    r: 0.26,
    xAmp: 0.05,
    yAmp: 0.05,
    xFreq: 0.04,
    yFreq: 0.07,
    xPhase: 3.3,
    yPhase: 1.0,
    rFreq: 0.1,
    rPhase: 2.8,
  },
  {
    x: 0.4,
    y: 0.8,
    r: 0.2,
    xAmp: 0.07,
    yAmp: 0.05,
    xFreq: 0.07,
    yFreq: 0.05,
    xPhase: 5.0,
    yPhase: 4.1,
    rFreq: 0.09,
    rPhase: 1.6,
  },
  {
    x: 0.7,
    y: 0.92,
    r: 0.36,
    xAmp: 0.06,
    yAmp: 0.06,
    xFreq: 0.05,
    yFreq: 0.08,
    xPhase: 0.7,
    yPhase: 2.2,
    rFreq: 0.11,
    rPhase: 3.5,
  },
  {
    x: 0.55,
    y: 0.06,
    r: 0.14,
    xAmp: 0.06,
    yAmp: 0.05,
    xFreq: 0.06,
    yFreq: 0.07,
    xPhase: 1.9,
    yPhase: 0.9,
    rFreq: 0.1,
    rPhase: 2.3,
  },
  {
    x: 0.34,
    y: 0.27,
    r: 0.24,
    xAmp: 0.07,
    yAmp: 0.06,
    xFreq: 0.08,
    yFreq: 0.05,
    xPhase: 3.7,
    yPhase: 2.0,
    rFreq: 0.12,
    rPhase: 0.6,
  },
  {
    x: 0.9,
    y: 0.42,
    r: 0.12,
    xAmp: 0.05,
    yAmp: 0.06,
    xFreq: 0.05,
    yFreq: 0.08,
    xPhase: 0.4,
    yPhase: 3.1,
    rFreq: 0.09,
    rPhase: 1.9,
  },
  {
    x: 0.6,
    y: 0.7,
    r: 0.3,
    xAmp: 0.07,
    yAmp: 0.05,
    xFreq: 0.07,
    yFreq: 0.06,
    xPhase: 2.8,
    yPhase: 4.4,
    rFreq: 0.1,
    rPhase: 3.0,
  },
  {
    x: 0.12,
    y: 0.86,
    r: 0.18,
    xAmp: 0.06,
    yAmp: 0.06,
    xFreq: 0.06,
    yFreq: 0.07,
    xPhase: 4.6,
    yPhase: 1.4,
    rFreq: 0.11,
    rPhase: 0.2,
  },
]

// How much of the dot matrix the scrim mutes outside the blobs (0–1).
const SCRIM_OPACITY = 0.85
// Render the field at half resolution and let CSS scale it up — the blobs are
// soft, so the upscale is invisible and the per-frame cost stays tiny.
const RENDER_SCALE = 0.5
// Fraction of each blob's radius that reveals the dots at full contrast before
// the soft feathered falloff begins — mirrors the original spotlight's gradient.
const CORE = 0.45
// Global multiplier on drift speed — raise to make the blobs travel faster.
const DRIFT_SPEED = 1.45

/**
 * Drives the ambient lava-lamp canvas: a muting scrim with soft-edged, drifting
 * holes that fuse like liquid to reveal the dot matrix beneath. The canvas is
 * sized to (and scrolls with) the matrix container, so the effect never spills
 * over the header/footer. Pure 2D canvas, no dependencies. Respects
 * prefers-reduced-motion (renders a single static frame), pauses while the tab
 * is hidden, and re-reads its colour on theme change so it works in both themes.
 *
 * `fallbackRef` points at a server-rendered scrim that mutes the matrix on first
 * paint (no flash before hydration). Once the canvas has a frame, the canvas
 * fades in and the fallback fades out together (CSS-driven, gated on reduced
 * motion), so the blobs emerge gently rather than popping or visibly drawing
 * their feathered edges. Both mute by the same amount, so there is no flash.
 */
function useLavaField(
  canvasRef: RefObject<HTMLCanvasElement | null>,
  fallbackRef: RefObject<HTMLDivElement | null>
) {
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let raf = 0
    let scrim = getComputedStyle(canvas).color
    let cssW = 0
    let cssH = 0

    const measure = () => {
      cssW = canvas.clientWidth
      cssH = canvas.clientHeight
      canvas.width = Math.max(1, Math.floor(cssW * RENDER_SCALE))
      canvas.height = Math.max(1, Math.floor(cssH * RENDER_SCALE))
      ctx.setTransform(RENDER_SCALE, 0, 0, RENDER_SCALE, 0, 0)
    }

    const draw = (timeMs: number) => {
      const t = timeMs / 1000
      const minSide = Math.min(window.innerWidth, window.innerHeight)

      ctx.clearRect(0, 0, cssW, cssH)
      ctx.globalCompositeOperation = 'source-over'
      ctx.globalAlpha = SCRIM_OPACITY
      ctx.fillStyle = scrim
      ctx.fillRect(0, 0, cssW, cssH)

      // Punch soft holes out of the scrim. Overlapping holes remove more alpha
      // in the gap between them, so they merge with a smooth liquid neck.
      ctx.globalCompositeOperation = 'destination-out'
      ctx.globalAlpha = 1
      for (const b of BLOBS) {
        const cx =
          (b.x +
            b.xAmp *
              Math.sin(t * b.xFreq * DRIFT_SPEED * Math.PI * 2 + b.xPhase)) *
          cssW
        const cy =
          (b.y +
            b.yAmp *
              Math.sin(t * b.yFreq * DRIFT_SPEED * Math.PI * 2 + b.yPhase)) *
          cssH
        const r =
          b.r *
          minSide *
          (1 + 0.16 * Math.sin(t * b.rFreq * Math.PI * 2 + b.rPhase))

        const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r)
        g.addColorStop(0, 'rgba(0, 0, 0, 1)')
        g.addColorStop(CORE, 'rgba(0, 0, 0, 1)')
        g.addColorStop(1, 'rgba(0, 0, 0, 0)')
        ctx.fillStyle = g
        ctx.fillRect(cx - r, cy - r, r * 2, r * 2)
      }

      ctx.globalCompositeOperation = 'source-over'
    }

    // Pin the pre-fade state up front so the CSS opacity transition has a stable
    // painted "from" value. Without this the transition fires only intermittently
    // (a "flash in"): if opacity is flipped to 1 before the 0 state has painted,
    // or on a React StrictMode remount where the element is already at 1, the
    // browser skips the animation and jumps straight to the end.
    canvas.style.opacity = '0'
    if (fallbackRef.current) fallbackRef.current.style.opacity = '0.85'

    let revealRaf1 = 0
    let revealRaf2 = 0
    // Cross-fade from the server-rendered fallback scrim to the canvas, but only
    // after the pinned pre-fade state has actually painted (two frames). The
    // blobs are already at full shape, so they emerge through the lifting veil —
    // no pop, no edges drawing themselves in. Reduced motion has no transition,
    // so this just swaps instantly.
    const scheduleReveal = () => {
      revealRaf1 = requestAnimationFrame(() => {
        revealRaf2 = requestAnimationFrame(() => {
          canvas.style.opacity = '1'
          if (fallbackRef.current) fallbackRef.current.style.opacity = '0'
        })
      })
    }

    const loop = (timeMs: number) => {
      draw(timeMs)
      raf = requestAnimationFrame(loop)
    }

    const reduceMq = window.matchMedia('(prefers-reduced-motion: reduce)')

    const stop = () => {
      if (raf) cancelAnimationFrame(raf)
      raf = 0
    }

    const start = () => {
      stop()
      // Reduced motion or hidden tab: draw one static frame, don't loop.
      if (reduceMq.matches || document.hidden) {
        draw(0)
        return
      }
      raf = requestAnimationFrame(loop)
    }

    const onResize = () => {
      measure()
      if (raf === 0) draw(0)
    }
    const onColorChange = () => {
      scrim = getComputedStyle(canvas).color
      if (raf === 0) draw(0)
    }

    measure()
    start()
    scheduleReveal()

    window.addEventListener('resize', onResize)
    document.addEventListener('visibilitychange', start)
    reduceMq.addEventListener('change', start)

    // The container can grow/shrink (fonts, responsive reflow, content); keep
    // the canvas sized to it.
    const sizeObserver = new ResizeObserver(() => {
      measure()
      if (raf === 0) draw(0)
    })
    sizeObserver.observe(canvas)

    // Theme toggle swaps the `dark` class on <html>; re-read the scrim colour.
    const themeObserver = new MutationObserver(onColorChange)
    themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    })

    return () => {
      stop()
      cancelAnimationFrame(revealRaf1)
      cancelAnimationFrame(revealRaf2)
      window.removeEventListener('resize', onResize)
      document.removeEventListener('visibilitychange', start)
      reduceMq.removeEventListener('change', start)
      sizeObserver.disconnect()
      themeObserver.disconnect()
    }
  }, [canvasRef, fallbackRef])
}

export default useLavaField
