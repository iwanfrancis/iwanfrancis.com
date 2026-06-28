'use client'

import {
  createContext,
  type ReactNode,
  useContext,
  useEffect,
  useState,
} from 'react'

/** Whether the surrounding tile is currently active (on-screen AND tab visible).
 *  Defaults to `true` so a tile rendered outside a frame (e.g. in isolation) runs. */
const ThingyActiveContext = createContext(true)

/**
 * Broadcasts a tile's active state to its content. Rendered by ThingyFrame with
 * `active={!frozen}`; folds tab visibility into the signal so a hidden tab freezes
 * every tile (matching the lava background's pause-while-hidden). The CSS freeze
 * (.thingy-frozen) is independent — both ride the same `frozen` boolean.
 */
export function ThingyActiveProvider({
  active,
  children,
}: {
  active: boolean
  children: ReactNode
}) {
  // Starts visible (SSR-safe, matches first paint); the effect corrects it on
  // mount in case the tab is already hidden, then tracks changes.
  const [tabHidden, setTabHidden] = useState(false)
  useEffect(() => {
    const onChange = () => setTabHidden(document.hidden)
    onChange()
    document.addEventListener('visibilitychange', onChange)
    return () => document.removeEventListener('visibilitychange', onChange)
  }, [])

  return (
    <ThingyActiveContext.Provider value={active && !tabHidden}>
      {children}
    </ThingyActiveContext.Provider>
  )
}

/**
 * The primitive every JS-loop tile builds on: `true` while the tile is on-screen
 * (within the active band) AND the tab is visible; `false` when off-screen in the
 * freeze band OR the tab is hidden. The two pause causes are folded into one
 * boolean, so a consumer need not distinguish them.
 *
 * This is the escape hatch — a tile running a custom loop, a Web Worker, or a
 * third-party engine reads it and starts/stops its own work. For ordinary loops
 * prefer `useThingyFrame` / `useThingyInterval`, which own the loop and handle the
 * resume-without-a-jump and reduced-motion details for you.
 */
export function useThingyActive(): boolean {
  return useContext(ThingyActiveContext)
}
