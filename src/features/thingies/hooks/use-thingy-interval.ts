'use client'

import { useEffect, useRef } from 'react'
import { useThingyActive } from './use-thingy-active'

type IntervalOptions = {
  /** Suppress the interval under `prefers-reduced-motion: reduce` (default true). */
  respectReducedMotion?: boolean
}

/**
 * Invokes `fn` on a fixed cadence (`ms`) ONLY while the tile is active (on-screen
 * and tab visible). The cadence is suspended while the tile is off-screen or the
 * tab is hidden and resumes on return — `setInterval` restarts fresh, so there is
 * no burst of catch-up calls for the suspended span. The interval is cleared on
 * unmount, and does not run under reduced motion. This is the path for a discrete
 * game clock (e.g. a grid snake that advances one step per tick).
 */
export function useThingyInterval(
  fn: () => void,
  ms: number,
  { respectReducedMotion = true }: IntervalOptions = {}
) {
  // Hold the latest callback in a ref so a re-render doesn't restart the cadence.
  const fnRef = useRef(fn)
  fnRef.current = fn

  const active = useThingyActive()

  useEffect(() => {
    if (!active) return

    const reduceMq = window.matchMedia('(prefers-reduced-motion: reduce)')
    let id = 0

    const stop = () => {
      if (id) clearInterval(id)
      id = 0
    }
    const start = () => {
      stop()
      if (respectReducedMotion && reduceMq.matches) return
      id = window.setInterval(() => fnRef.current(), ms)
    }

    start()
    reduceMq.addEventListener('change', start)
    return () => {
      stop()
      reduceMq.removeEventListener('change', start)
    }
  }, [active, ms, respectReducedMotion])
}
