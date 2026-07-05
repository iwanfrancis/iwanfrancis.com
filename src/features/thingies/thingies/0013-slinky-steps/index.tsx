'use client'

import { useReducer, useRef } from 'react'
import { useThingyFrame } from '../../hooks/use-thingy-frame'

/**
 * Slinky steps — a slinky walking forever down a pseudo-3D staircase. The stairs
 * are cabinet-projected (side face, riser fronts, tread-top parallelograms); the
 * slinky is a chain of coils threaded along an "n"-shaped path (vertical stack,
 * arch over the nose, vertical stack), poured from the rear stack to the front
 * by a wide, constant-speed stagger — coils stream over the nose right up to the
 * seam, so the once-per-loop gather onto a step is a single instant, not a
 * pause. (Easing the flights instead crams motion into mid-cycle and drains the
 * arch at the seam.) Each coil is a true 3D
 * circle perpendicular to the path, obliquely projected to an ellipse via
 * Rytz's construction, translucent so overlaps read as wound wire. The
 * staircase scrolls up-left one step per cycle, making the descent endless and
 * seamless; which end leads alternates each step (as real slinkies do), and one
 * physical end coil is rose so the leapfrog is visible. Driven by
 * `useThingyFrame`, so it freezes off-screen and resumes mid-stride;
 * reduced-motion visitors see it held mid-pour, draped over a step edge.
 * Scale-independent (viewBox), decorative and non-interactive.
 */

// Staircase geometry, in viewBox units. Nose k sits at NOSE0 + k*(T, R); steps
// march down-right. Depth (stair width) recedes up-right under an oblique
// projection.
const T = 26 // tread run
const R = 17 // riser drop
const OB = [0.5, -0.42] // screen offset of one unit of depth
const ZD = 13 // stair depth
const D = [OB[0] * ZD, OB[1] * ZD]
const HD = [D[0] / 2, D[1] / 2] // the slinky walks at half depth

// Slinky: N coils of radius CR; HS is the arc length of a fully compressed
// stack; LAM staggers the coils' flights across the cycle (leader first).
// A wide stagger + squat stacks keep coils streaming over the arch right up to
// the seam, so the once-per-loop gather onto a step is a single instant.
const N = 15
const CR = 7.4
const HS = 12
const LAM = 0.46
const A: [number, number] = [50, 55] // rear foot on its tread; front foot is one step on
const B: [number, number] = [A[0] + T, A[1] + R]
const LIFT1 = 13 // bezier control lift above the rear stack top
const LIFT2 = 16 // ... above the front stack top
const CYCLES_PER_SEC = 0.6
/** Phase shown when the loop never ticks (reduced motion): mid-pour. */
const START_P = 0.42

// The walk path: straight up the rear stack, bezier arch over the step nose,
// straight down onto the front tread. Sampled once into an arc-length table so
// coils space evenly along it.
const pts: [number, number][] = []
for (let i = 0; i <= 12; i++) pts.push([A[0], A[1] - (HS * i) / 12])
{
  const q0 = [A[0], A[1] - HS]
  const q1 = [A[0], A[1] - HS - LIFT1]
  const q2 = [B[0], B[1] - HS - LIFT2]
  const q3 = [B[0], B[1] - HS]
  for (let i = 1; i <= 120; i++) {
    const t = i / 120
    const m = 1 - t
    pts.push([
      m * m * m * q0[0] +
        3 * m * m * t * q1[0] +
        3 * m * t * t * q2[0] +
        t * t * t * q3[0],
      m * m * m * q0[1] +
        3 * m * m * t * q1[1] +
        3 * m * t * t * q2[1] +
        t * t * t * q3[1],
    ])
  }
}
for (let i = 1; i <= 12; i++) pts.push([B[0], B[1] - HS + (HS * i) / 12])
const cum: number[] = [0]
for (let i = 1; i < pts.length; i++) {
  cum.push(
    cum[i - 1] +
      Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1])
  )
}
const L = cum[cum.length - 1]

/** Point + unit tangent at arc length `a` along the walk path. */
function pathAt(a: number) {
  const s = Math.max(0, Math.min(L, a))
  let i = 1
  while (i < cum.length - 1 && cum[i] < s) i++
  const f = (s - cum[i - 1]) / (cum[i] - cum[i - 1] || 1)
  const x = pts[i - 1][0] + (pts[i][0] - pts[i - 1][0]) * f
  const y = pts[i - 1][1] + (pts[i][1] - pts[i - 1][1]) * f
  const j0 = Math.max(0, i - 2)
  const j1 = Math.min(pts.length - 1, i + 1)
  const tx = pts[j1][0] - pts[j0][0]
  const ty = pts[j1][1] - pts[j0][1]
  const tl = Math.hypot(tx, ty) || 1
  return { x, y, tx: tx / tl, ty: ty / tl }
}

/** Flight progress, clamped to [0, 1]. Deliberately linear: an ease-out here
 *  crams all the motion into mid-cycle and crawls into each landing, which
 *  drains the arch and reads as a pause at the loop seam. Constant speed keeps
 *  coils streaming over the nose right up to the gather; the stack geometry
 *  itself supplies the visual "settle". */
function flight(x: number) {
  return Math.max(0, Math.min(1, x))
}

/**
 * Screen ellipse of a 3D coil: a circle of radius CR perpendicular to the path
 * tangent. Its conjugate semi-diameters are the in-plane normal and the depth
 * axis under the oblique projection; Rytz's construction (via complex sums)
 * recovers the true axes. `ry` is floored so an edge-on coil never collapses
 * into a bare line.
 */
function ringEllipse(tx: number, ty: number) {
  const f1 = [-ty * CR, tx * CR]
  const f2 = [OB[0] * CR, OB[1] * CR]
  const w1 = [f1[0] - f2[1], f1[1] + f2[0]]
  const w2 = [f1[0] + f2[1], f1[1] - f2[0]]
  const ha = Math.hypot(w1[0], w1[1]) / 2
  const hb = Math.hypot(w2[0], w2[1]) / 2
  const ang =
    ((Math.atan2(w1[1], w1[0]) + Math.atan2(w2[1], w2[0])) / 2) *
    (180 / Math.PI)
  return { rx: ha + hb, ry: Math.max(Math.abs(ha - hb), 1.7), ang }
}

// Static stair geometry: near-side silhouette plus riser-front and tread-top
// parallelograms, over enough steps to cover every scroll offset.
const K_MIN = -4
const K_MAX = 7
const NOSE0 = [A[0] - 0.45 * T, A[1] - R]
const SIL_D = (() => {
  let d = ''
  for (let k = K_MIN; k <= K_MAX; k++) {
    const x = NOSE0[0] + k * T
    const y = NOSE0[1] + k * R
    d += `${k === K_MIN ? `M ${x} ${y}` : ''} L ${x} ${y + R} L ${x + T} ${y + R} `
  }
  return `${d} L ${NOSE0[0] + (K_MAX + 1) * T} 190 L -140 190 Z`
})()
const STEP_FACES = (() => {
  const faces: { k: number; riser: string; tread: string }[] = []
  for (let k = K_MIN; k <= K_MAX; k++) {
    const x = NOSE0[0] + k * T
    const y = NOSE0[1] + k * R
    faces.push({
      k,
      riser: `M ${x} ${y} L ${x} ${y + R} L ${x + D[0]} ${y + R + D[1]} L ${x + D[0]} ${y + D[1]} Z`,
      tread: `M ${x} ${y + R} L ${x + T} ${y + R} L ${x + T + D[0]} ${y + R + D[1]} L ${x + D[0]} ${y + R + D[1]} Z`,
    })
  }
  return faces
})()

export default function SlinkySteps() {
  // Walk state lives in a ref (preserved across an off-screen freeze); parity
  // flips each step so the leading end alternates, as a real slinky's does.
  const walk = useRef({ p: START_P, parity: 0 })
  const [, render] = useReducer((n: number) => n + 1, 0)

  useThingyFrame((deltaMs) => {
    let p = walk.current.p + CYCLES_PER_SEC * (deltaMs / 1000)
    let parity = walk.current.parity
    if (p >= 1) {
      p -= 1
      parity ^= 1
    }
    walk.current = { p, parity }
    render()
  })

  const { p, parity } = walk.current

  // Each coil's arc position: its slot in the compressed stack plus a
  // staggered, eased share of the flight. `eu` reverses the chain on odd steps.
  const coils = []
  for (let i = 0; i < N; i++) {
    const u = i / (N - 1)
    const eu = parity ? 1 - u : u
    const s = flight((p - LAM * (1 - eu)) / (1 - LAM))
    const a = eu * HS + (L - HS) * s
    const pt = pathAt(a)
    coils.push({
      i,
      a,
      x: pt.x + HD[0],
      y: pt.y + HD[1],
      ...ringEllipse(pt.tx, pt.ty),
    })
  }
  // The camera looks slightly down, so draw bottom-up: the top of a stack lands
  // last and stays fully visible.
  coils.sort((c1, c2) => c2.y - c1.y)

  // Ground shadows sized to each stack's current occupancy.
  const nA = coils.filter((c) => c.a <= HS + 0.8).length
  const nB = coils.filter((c) => c.a >= L - HS - 0.8).length

  return (
    <svg
      viewBox="0 0 100 100"
      className="h-full w-full text-foreground"
      aria-hidden="true"
    >
      <g transform={`translate(${(-T * p).toFixed(2)} ${(-R * p).toFixed(2)})`}>
        <path d={SIL_D} fill="currentColor" opacity={0.09} />
        {STEP_FACES.map((f) => (
          <g key={f.k} fill="currentColor">
            <path d={f.riser} opacity={0.2} />
            <path d={f.tread} opacity={0.07} />
          </g>
        ))}
        <path
          d={SIL_D}
          fill="none"
          stroke="currentColor"
          strokeWidth={3}
          strokeLinejoin="round"
        />
        {nA > 0 && (
          <ellipse
            cx={A[0] + HD[0]}
            cy={A[1] + HD[1]}
            rx={3 + 0.45 * nA}
            ry={(3 + 0.45 * nA) * 0.35}
            fill="currentColor"
            opacity={0.12}
          />
        )}
        {nB > 0 && (
          <ellipse
            cx={B[0] + HD[0]}
            cy={B[1] + HD[1]}
            rx={3 + 0.45 * nB}
            ry={(3 + 0.45 * nB) * 0.35}
            fill="currentColor"
            opacity={0.12}
          />
        )}
        {coils.map((c) => (
          <ellipse
            key={c.i}
            cx={c.x.toFixed(2)}
            cy={c.y.toFixed(2)}
            rx={c.rx.toFixed(2)}
            ry={c.ry.toFixed(2)}
            fill="none"
            stroke="currentColor"
            strokeWidth={2.2}
            opacity={c.i === 0 ? 0.95 : 0.55}
            className={c.i === 0 ? 'text-thingy-rose' : undefined}
            transform={`rotate(${c.ang.toFixed(2)} ${c.x.toFixed(2)} ${c.y.toFixed(2)})`}
          />
        ))}
      </g>
    </svg>
  )
}
