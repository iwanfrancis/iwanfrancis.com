'use client'

import { Component, type ReactNode } from 'react'

type Props = { children: ReactNode; fallback?: ReactNode }
type State = { hasError: boolean }

/**
 * Contains a single tile's failure. If a tile throws while rendering, only that
 * tile is replaced by `fallback` (a quiet placeholder) — the rest of the canvas
 * keeps working. A local class component so we don't pull in a dependency.
 */
class TileErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false }

  static getDerivedStateFromError(): State {
    return { hasError: true }
  }

  render() {
    if (this.state.hasError) return this.props.fallback ?? null
    return this.props.children
  }
}

export default TileErrorBoundary
