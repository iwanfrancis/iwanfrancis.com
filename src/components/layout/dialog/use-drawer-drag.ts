'use client'

import { useDrag } from '@use-gesture/react'
import { useEffect, useRef } from 'react'
import { shouldDismiss } from './should-dismiss'

const prefersReducedMotion = () =>
  typeof window !== 'undefined' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches

const SNAP_TRANSITION = 'transform 200ms ease-out'

type UseDrawerDragOptions = {
  /** Whether drag-to-dismiss is active (mobile only). */
  enabled: boolean
  /** Called once a dismiss drag completes, to close the overlay. */
  onClose: () => void
}

/**
 * Swipe-down-to-dismiss for a bottom-sheet `Dialog`. Binds to the grabber only
 * (via `dragProps`) so scrollable content is unaffected, and drives the sheet's
 * inline transform on `contentRef`.
 *
 * On release it either snaps back, or — past the {@link shouldDismiss} threshold
 * — animates the sheet fully off-screen itself and *then* calls `onClose`. By the
 * time Radix runs its own exit animation the content is already gone, so the two
 * animations never fight and there's no jump. Honours `prefers-reduced-motion`.
 */
function useDrawerDrag({ enabled, onClose }: UseDrawerDragOptions) {
  const contentRef = useRef<HTMLDivElement>(null)

  // If the viewport grows past `sm` mid-life, drop any inline transform we left
  // behind so it can't override the desktop centring transform from the classes.
  useEffect(() => {
    if (!enabled && contentRef.current) {
      contentRef.current.style.transform = ''
      contentRef.current.style.transition = ''
    }
  }, [enabled])

  const bind = useDrag(
    ({ last, movement: [, my], velocity: [, vy], direction: [, dirY] }) => {
      const el = contentRef.current
      if (!el) return

      if (!last) {
        // Follow the finger down; resist upward drags with a rubber band.
        const y = my > 0 ? my : my / 5
        el.style.transition = 'none'
        el.style.transform = `translateY(${y}px)`
        return
      }

      const dismiss = shouldDismiss({
        distance: my,
        height: el.getBoundingClientRect().height,
        velocity: dirY > 0 ? vy : 0,
      })

      if (dismiss) {
        if (prefersReducedMotion()) {
          onClose()
          return
        }
        el.style.transition = SNAP_TRANSITION
        el.style.transform = 'translateY(100%)'
        const onEnd = () => {
          el.removeEventListener('transitionend', onEnd)
          onClose()
        }
        el.addEventListener('transitionend', onEnd)
        return
      }

      // Snap back to rest.
      el.style.transition = prefersReducedMotion() ? 'none' : SNAP_TRANSITION
      el.style.transform = 'translateY(0px)'
    },
    { axis: 'y', filterTaps: true, enabled }
  )

  return { contentRef, dragProps: bind() }
}

export default useDrawerDrag
