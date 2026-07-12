import { useEffect, useState } from 'react'

// Matches the Tailwind `sm` breakpoint (min-width: 640px): true below it, so the
// drag behaviour switches on the same axis as the bottom-sheet styling.
const MOBILE_QUERY = '(max-width: 639px)'

/**
 * Whether the viewport is below the `sm` breakpoint. Initialises `false` and
 * reads `matchMedia` in an effect, so server and first client render agree (no
 * hydration mismatch). Overlay content only mounts on open — always after this
 * has resolved — so consumers never see the initial `false` in practice.
 */
function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const mq = window.matchMedia(MOBILE_QUERY)
    setIsMobile(mq.matches)
    const onChange = (event: MediaQueryListEvent) => setIsMobile(event.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  return isMobile
}

export default useIsMobile
