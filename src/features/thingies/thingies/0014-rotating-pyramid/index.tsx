'use client'

import { useReducer, useRef } from 'react'
import { useThingyFrame } from '../../hooks/use-thingy-frame'

/**
 * Rotating 3D pyramid — a square-based pyramid tumbled around two axes each frame,
 * projected with a touch of perspective onto the 0–100 viewBox and drawn as its
 * eight edges (four base, four slant). Edges fade front-to-back and the shape swells
 * as corners near the viewer, so the wireframe reads as solid depth without any
 * fills. Vertices are centred on the pyramid's centroid so it spins about its own
 * middle. The spin is integrated through `useThingyFrame`, so it freezes off-screen /
 * tab-hidden and resumes mid-tumble; reduced-motion visitors see it held at a fixed
 * three-quarter pose. Ink only, scale-independent (viewBox), decorative and
 * non-interactive.
 */

// Square base (±1 in x/z) plus an apex, all shifted down so the origin sits on the
// centroid (a quarter of the height above the base) — keeps the spin balanced.
const VERTS: [number, number, number][] = [
  [-1, -0.5, -1],
  [1, -0.5, -1],
  [1, -0.5, 1],
  [-1, -0.5, 1], // base corners
  [0, 1.5, 0], // apex
]
const EDGES: [number, number][] = [
  [0, 1],
  [1, 2],
  [2, 3],
  [3, 0], // base square
  [0, 4],
  [1, 4],
  [2, 4],
  [3, 4], // slant edges to the apex
]

/** Viewer distance for the perspective divide; larger = flatter. */
const VIEW = 4
/** Half-extent of the projected pyramid in viewBox units (centred at 50,50). */
const SCALE = 16
/** Spin rates in rad/s — different per axis for a tumbling, non-repeating feel. */
const SPIN_Y = 0.5
const SPIN_X = 0.32
/** Starting angles, and the static pose shown under reduced motion. */
const START = { ax: 0.5, ay: 0.6 }

type Pt = { x: number; y: number; z: number }

function project(ax: number, ay: number): Pt[] {
  const cx = Math.cos(ax)
  const sx = Math.sin(ax)
  const cy = Math.cos(ay)
  const sy = Math.sin(ay)
  return VERTS.map(([x, y, z]) => {
    // rotate around Y, then X
    const x1 = x * cy + z * sy
    const z1 = -x * sy + z * cy
    const y2 = y * cx - z1 * sx
    const z2 = y * sx + z1 * cx
    const p = VIEW / (VIEW - z2) // perspective divide; nearer (higher z) → larger
    return { x: 50 + x1 * SCALE * p, y: 50 - y2 * SCALE * p, z: z2 }
  })
}

export default function RotatingPyramid() {
  // Angles live in a ref (preserved across an off-screen freeze); a fresh mount
  // after unmount restarts from START, matching the runtime's reset-on-unmount.
  const angle = useRef(START)
  const [, render] = useReducer((n: number) => n + 1, 0)

  useThingyFrame((deltaMs) => {
    const dt = deltaMs / 1000
    angle.current = {
      ax: angle.current.ax + SPIN_X * dt,
      ay: angle.current.ay + SPIN_Y * dt,
    }
    render()
  })

  const pts = project(angle.current.ax, angle.current.ay)
  // Draw far edges first so nearer ones overlap them.
  const edges = EDGES.map(([a, b]) => ({
    a,
    b,
    z: (pts[a].z + pts[b].z) / 2,
  })).sort((e1, e2) => e1.z - e2.z)

  return (
    <svg
      viewBox="0 0 100 100"
      className="h-full w-full text-foreground"
      aria-hidden="true"
    >
      {edges.map(({ a, b, z }) => (
        <line
          key={`${a}-${b}`}
          x1={pts[a].x}
          y1={pts[a].y}
          x2={pts[b].x}
          y2={pts[b].y}
          stroke="currentColor"
          strokeWidth={3}
          strokeLinecap="round"
          // z spans ~[-1.5, 1.5]; map to a calm front-to-back opacity gradient.
          opacity={0.4 + 0.6 * ((z + 1.5) / 3)}
        />
      ))}
    </svg>
  )
}
