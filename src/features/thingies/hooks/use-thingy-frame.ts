'use client'

import { useEffect, useRef } from 'react'
import { useThingyActive } from './use-thingy-active'

type FrameOptions = {
  /** Suppress the loop under `prefers-reduced-motion: reduce` (default true). */
  respectReducedMotion?: boolean
}

/** Largest delta handed to `tick` after a pause, in ms (~one slow frame). Caps the
 *  first frame on resume so a simulation never integrates the whole frozen span. */
const MAX_DELTA_MS = 32

/**
 * Runs a `requestAnimationFrame` loop on the tile's behalf, invoking `tick(deltaMs)`
 * once per frame ONLY while the tile is active (on-screen and tab visible). The
 * delta is measured from the last tick that actually ran and clamped, so the first
 * frame after a freeze is an ordinary step rather than a jump of the whole frozen
 * duration. The loop is cancelled on unmount and while inactive, and does not run
 * under reduced motion. For continuous motion (an integrator); for a discrete game
 * clock use `useThingyInterval`.
 */
export function useThingyFrame(
  tick: (deltaMs: number) => void,
  { respectReducedMotion = true }: FrameOptions = {}
) {
  // Hold the latest callback in a ref so a re-render doesn't restart the loop.
  const tickRef = useRef(tick)
  tickRef.current = tick

  const active = useThingyActive()

  useEffect(() => {
    if (!active) return

    const reduceMq = window.matchMedia('(prefers-reduced-motion: reduce)')
    let raf = 0
    let last = 0

    const loop = (now: number) => {
      const delta = last === 0 ? 0 : Math.min(now - last, MAX_DELTA_MS)
      last = now
      tickRef.current(delta)
      raf = requestAnimationFrame(loop)
    }

    const stop = () => {
      if (raf) cancelAnimationFrame(raf)
      raf = 0
    }
    const start = () => {
      stop()
      if (respectReducedMotion && reduceMq.matches) return
      last = 0 // fresh delta clock, so resume yields a normal first step
      raf = requestAnimationFrame(loop)
    }

    start()
    reduceMq.addEventListener('change', start)
    return () => {
      stop()
      reduceMq.removeEventListener('change', start)
    }
  }, [active, respectReducedMotion])
}
