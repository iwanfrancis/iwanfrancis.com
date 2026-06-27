import { useTheme } from 'next-themes'
import { type MouseEvent, useCallback } from 'react'
import { flushSync } from 'react-dom'

/**
 * Returns a click handler that toggles light/dark, animating a feathered
 * circular reveal from the clicked element (see `::view-transition-new(root)`
 * in globals.css). Falls back to an instant switch where the View Transitions
 * API is unavailable (e.g. Firefox) or the visitor prefers reduced motion.
 */
function useThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme()

  return useCallback(
    (event: MouseEvent<HTMLElement>) => {
      const next = resolvedTheme === 'dark' ? 'light' : 'dark'

      const prefersReducedMotion = window.matchMedia(
        '(prefers-reduced-motion: reduce)'
      ).matches

      // flushSync keeps next-themes' class change inside the snapshot.
      if (!document.startViewTransition || prefersReducedMotion) {
        setTheme(next)
        return
      }

      // Feed the reveal's origin and end radius to the CSS animation on
      // ::view-transition-new(root). +100px so the solid core still covers the
      // furthest corner once the 100px feather is accounted for.
      const { top, left, width, height } =
        event.currentTarget.getBoundingClientRect()
      const x = left + width / 2
      const y = top + height / 2
      const endRadius = Math.hypot(
        Math.max(left, window.innerWidth - left),
        Math.max(top, window.innerHeight - top)
      )

      const root = document.documentElement
      root.style.setProperty('--theme-reveal-x', `${x}px`)
      root.style.setProperty('--theme-reveal-y', `${y}px`)
      root.style.setProperty('--theme-reveal-end', `${endRadius + 100}px`)

      document.startViewTransition(() => {
        flushSync(() => setTheme(next))
      })
    },
    [resolvedTheme, setTheme]
  )
}

export default useThemeToggle
