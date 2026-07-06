'use client'

import { useReducer, useRef } from 'react'
import { useThingyFrame } from '../../hooks/use-thingy-frame'

/**
 * DVD bounce — a homage to the classic DVD-player screensaver. A rounded media badge
 * drifts diagonally at constant speed and reflects off the four walls; the payoff is
 * the exact corner hit, where both axes reverse at once and the badge shoots straight
 * back out along the diagonal it arrived on.
 *
 * Motion is two independent triangle waves — a triangle wave IS constant-speed travel
 * with instant reflection along one axis. Their wall-to-wall times are in a 3:5 ratio
 * (both odd, coprime), so the trajectory is periodic and lands an EXACT corner every
 * LCM = 12s, alternating between the two ends of one diagonal (bottom-right ↔
 * top-left). Single-wall bounces in between give the teasing near-misses: the badge
 * warms toward the accent whenever it passes close to a corner, then cools if it just
 * misses. Only a true corner fires the burst — a ring and sparks spring from the
 * corner and the badge pops.
 *
 * Driven by the runtime frame loop, so the whole thing freezes off-screen and never
 * ticks under prefers-reduced-motion — those visitors see the badge resting mid-flight
 * (a sensible still). Everything is in viewBox units, so it scales with the tile. Ink
 * badge by default; the accent (rose play glyph, corner burst) is the minority pop.
 * Tile contract: ../README.md.
 */

/** Badge half-extents (viewBox units); its centre travels the box inset by these. */
const HW = 15
const HH = 9
const RANGE_X = 100 - 2 * HW
const RANGE_Y = 100 - 2 * HH

/** Full periods per axis. Wall-to-wall times are half these: 2.4s (x) and 4.0s (y) —
 *  a 3:5 ratio, so both axes hit a wall together every 12s (an exact corner). */
const PX = 4.8
const PY = 8.0

/** Start the clock mid-flight so the badge never opens sitting in a corner. */
const START_T = 3.3

/** Both axes this close to a wall at once counts as a corner and fires the burst. */
const CORNER_THRESHOLD = 0.985
/** Burst lifetime — the flash value decays from 1 to 0 over this span. */
const FLASH_MS = 650

/** Unit directions for the corner sparks, spread evenly around the circle. */
const SPARK_DIRS = Array.from({ length: 8 }, (_, i) => {
  const a = (i / 8) * Math.PI * 2
  return [Math.cos(a), Math.sin(a)] as const
})

/** Unit triangle wave: 0 at one wall, 1 at the far wall, linear between — constant
 *  speed with instant reflection, exactly a bounce along one axis. */
function tri(t: number, period: number) {
  const p = ((t % period) + period) % period
  const half = period / 2
  return p < half ? p / half : 2 - p / half
}

export default function DvdBounce() {
  // Elapsed seconds and the decaying corner-burst value live in refs so the frame loop
  // can mutate them without restarting; `armed` gates the burst to once per corner.
  const t = useRef(START_T)
  const flash = useRef(0)
  const armed = useRef(true)
  const [, render] = useReducer((n: number) => n + 1, 0)

  useThingyFrame((deltaMs) => {
    t.current += deltaMs / 1000
    if (flash.current > 0) {
      flash.current = Math.max(0, flash.current - deltaMs / FLASH_MS)
    }

    // Corner detection: how close each axis is to a wall (0 mid-travel, 1 at a wall).
    // Their product peaks at 1 only when both walls are met at once — a true corner.
    const ex = Math.abs(2 * tri(t.current, PX) - 1)
    const ey = Math.abs(2 * tri(t.current, PY) - 1)
    const charge = ex * ey
    if (charge >= CORNER_THRESHOLD && armed.current) {
      flash.current = 1
      armed.current = false
    } else if (charge < 0.5) {
      armed.current = true
    }

    render()
  })

  // Derive everything shown from the current time, so the initial (and reduced-motion)
  // render shows a coherent still even though the loop above never ran.
  const trix = tri(t.current, PX)
  const triy = tri(t.current, PY)
  const cx = HW + trix * RANGE_X
  const cy = HH + triy * RANGE_Y
  const charge = Math.abs(2 * trix - 1) * Math.abs(2 * triy - 1)
  const f = flash.current

  const scale = 1 + f * 0.28
  const glow = Math.min(0.42, charge ** 3 * 0.4 + f * 0.2)
  const burstR = 4 + (1 - f) * 26

  return (
    <svg
      viewBox="0 0 100 100"
      className="h-full w-full text-foreground"
      aria-hidden="true"
    >
      {/* Anticipation glow — a soft accent halo that swells as the badge nears a
          corner and fades on a near-miss; brightest at contact. */}
      <circle
        cx={cx}
        cy={cy}
        r={20}
        className="text-thingy-rose"
        fill="currentColor"
        opacity={glow}
      />

      {/* The bouncing media badge: an ink chip with a rose play glyph. Punches up in
          scale on a corner hit. */}
      <g transform={`translate(${cx} ${cy}) scale(${scale})`}>
        <rect
          x={-HW}
          y={-HH}
          width={2 * HW}
          height={2 * HH}
          rx={4.5}
          className="text-foreground"
          fill="currentColor"
        />
        <polygon
          points="-4,-5 -4,5 5.5,0"
          className="text-thingy-rose"
          fill="currentColor"
        />
      </g>

      {/* Corner burst: an expanding ring and a ring of sparks flung from the corner,
          both fading as the flash decays. Rendered only while a burst is live. */}
      {f > 0 && (
        <g
          transform={`translate(${cx} ${cy})`}
          className="text-thingy-rose"
          fill="currentColor"
        >
          <circle
            r={burstR}
            fill="none"
            stroke="currentColor"
            strokeWidth={2.4}
            opacity={f}
          />
          {SPARK_DIRS.map(([dx, dy]) => (
            <circle
              key={`${dx},${dy}`}
              cx={dx * (5 + (1 - f) * 20)}
              cy={dy * (5 + (1 - f) * 20)}
              r={1.6 * f}
              opacity={f}
            />
          ))}
        </g>
      )}
    </svg>
  )
}
