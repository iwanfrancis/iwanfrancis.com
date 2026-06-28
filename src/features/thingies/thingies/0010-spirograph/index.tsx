'use client'

/**
 * Spirograph — classic hypotrochoid curves, traced very slowly. Several gear ratios
 * take turns: each curve draws itself on with a single travelling pen, holds, then
 * cross-fades into the next, looping forever. Decorative; the whole sequence is
 * CSS-driven (a stroke-dashoffset trace), so it freezes for free off-screen and
 * pauses under prefers-reduced-motion, where it rests on the first curve drawn
 * statically. Pure ink — a spirograph is a fine line by design, so the stroke is
 * deliberately thin (not a structural hairline). Tile contract: ../README.md.
 *
 * Geometry is the real hypotrochoid (fixed ring R, rolling gear r, pen offset d):
 *   x = (R−r)·cos t + d·cos((R−r)/r · t)
 *   y = (R−r)·sin t − d·sin((R−r)/r · t)
 * sampled over r/gcd(R,r) turns (so the curve closes), then fitted to a centred box.
 *
 * Each mount is slightly different: every figure gets a random orientation and a
 * small jitter to its pen offset, so the curves come out fresh each time the tile
 * appears (and on remount). Safe to use Math.random here — tiles mount client-only
 * (`dynamic(..., { ssr: false })`), so there's no server render to mismatch. The
 * paths are built once per mount via a lazy useState initialiser.
 * Tweak the figures, pace, jitter, or stroke in the constants below.
 */

import { useState } from 'react'

const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b))
const r2 = (n: number) => Math.round(n * 100) / 100

// Gear ratios [R, r, d]. Each gives a distinct figure; ordered simple → intricate.
// Density (petal count) is (R−r)/gcd(R,r); lacing comes from the revolutions r/gcd.
// Keep R and r coprime for a single continuous, many-looped stroke.
const FIGURES: [number, number, number][] = [
  [13, 6, 5],
  [17, 9, 6],
  [24, 7, 6],
  [29, 11, 8],
  [37, 13, 9],
]

const STEPS_PER_REV = 120 // sampling density; higher = smoother cusps, longer path
const FIT = 40 // half-size of the centred box each curve is scaled into

function spiroPath(R: number, r: number, d: number, rot: number): string {
  const revolutions = r / gcd(R, r) // turns needed for the curve to close
  const steps = Math.round(revolutions * STEPS_PER_REV)
  const k = (R - r) / r
  const cosR = Math.cos(rot) // whole-figure rotation, for per-mount variety
  const sinR = Math.sin(rot)
  const pts: [number, number][] = []
  for (let i = 0; i <= steps; i++) {
    const t = (i / steps) * revolutions * 2 * Math.PI
    const x = (R - r) * Math.cos(t) + d * Math.cos(k * t)
    const y = (R - r) * Math.sin(t) - d * Math.sin(k * t)
    pts.push([x * cosR - y * sinR, x * sinR + y * cosR])
  }
  let minX = Number.POSITIVE_INFINITY
  let maxX = Number.NEGATIVE_INFINITY
  let minY = Number.POSITIVE_INFINITY
  let maxY = Number.NEGATIVE_INFINITY
  for (const [x, y] of pts) {
    if (x < minX) minX = x
    if (x > maxX) maxX = x
    if (y < minY) minY = y
    if (y > maxY) maxY = y
  }
  // Uniform scale (aspect preserved) + centre on (50, 50).
  const scale = (2 * FIT) / Math.max(maxX - minX, maxY - minY)
  const cx = (minX + maxX) / 2
  const cy = (minY + maxY) / 2
  return `${pts
    .map(([x, y], i) => {
      const px = r2(50 + (x - cx) * scale)
      const py = r2(50 + (y - cy) * scale)
      return `${i === 0 ? 'M' : 'L'}${px} ${py}`
    })
    .join('')}Z`
}

const JITTER = 0.18 // ± fraction the pen offset is nudged each mount

// Build one randomised set of path strings — a random orientation per figure plus a
// small jitter to its pen offset, so the curves differ slightly every mount. Called
// from a lazy useState initialiser, so it runs once per mount, client-side only.
function buildPaths(): string[] {
  return FIGURES.map(([R, r, d]) => {
    const jittered = d * (1 + (Math.random() * 2 - 1) * JITTER)
    const rot = Math.random() * 2 * Math.PI
    return spiroPath(R, r, jittered, rot)
  })
}

// Pace is deliberately slow. The whole loop scales with the figure count, so adding
// figures lengthens the loop rather than speeding each one up.
const SECONDS_PER_FIGURE = 26
const CYCLE = FIGURES.length * SECONDS_PER_FIGURE
const SLOT = 100 / FIGURES.length // % of the cycle each figure owns

// Phase boundaries as % of the cycle, derived from one slot. Most of the slot is the
// slow pen trace; the fade is brief so figures hand over crisply. The window runs a
// little past one slot (fade ends at 1.12 slots) so out- and in-going figures
// cross-fade at the handover; otherwise exactly one figure is visible at a time.
const DRAW = r2(0.78 * SLOT) // pen has traced the whole curve by here (slow)
const HOLD = r2(0.92 * SLOT) // held drawn until here
const FADE = r2(1.12 * SLOT) // faded out by here (brief; overlaps the next figure)
const RESET = r2(FADE + 0.5) // re-arm the dash offset while hidden

// One shared animation, phase-shifted per figure by `animation-delay`, tiles the
// slots. Default (no media query) leaves the first figure drawn statically for
// reduced-motion visitors.
const css = `
.spiro-path { opacity: 0; stroke-dasharray: 1; stroke-dashoffset: 1; }
.spiro-root .spiro-c0 { opacity: 1; stroke-dashoffset: 0; }
@keyframes spiro-form {
  0% { opacity: 0; stroke-dashoffset: 1; }
  ${DRAW}% { opacity: 1; stroke-dashoffset: 0; }
  ${HOLD}% { opacity: 1; stroke-dashoffset: 0; }
  ${FADE}% { opacity: 0; stroke-dashoffset: 0; }
  ${RESET}% { opacity: 0; stroke-dashoffset: 1; }
  100% { opacity: 0; stroke-dashoffset: 1; }
}
@media (prefers-reduced-motion: no-preference) {
  .spiro-root .spiro-path {
    animation: spiro-form ${CYCLE}s linear infinite;
  }
${FIGURES.map(
  (_, i) =>
    `  .spiro-root .spiro-c${i} { animation-delay: ${r2(i * SECONDS_PER_FIGURE)}s; }`
).join('\n')}
}`

export default function Spirograph() {
  // Lazy initialiser → paths are built once per mount (stable across re-renders),
  // and freshly randomised whenever the tile remounts.
  const [paths] = useState(buildPaths)
  return (
    <svg
      viewBox="0 0 100 100"
      className="spiro-root h-full w-full text-foreground"
      aria-hidden="true"
    >
      <style>{css}</style>
      {paths.map((d, i) => (
        <path
          key={d}
          className={`spiro-path spiro-c${i}`}
          d={d}
          pathLength={1}
          fill="none"
          stroke="currentColor"
          strokeWidth={1.3}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ))}
    </svg>
  )
}
