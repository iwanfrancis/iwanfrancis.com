'use client'

import { type ReactNode, useEffect, useReducer, useRef } from 'react'
import { useThingyFrame } from '../../hooks/use-thingy-frame'

/**
 * Windows pipes screensaver — a homage to the 3D Pipes classic, in ink. Pipes grow
 * one cell at a time through a 7×7×7 lattice: mostly straight, turning at random,
 * never entering a cell already taken, with the odd ball joint at a bend. When a
 * pipe boxes itself in (or runs long) it caps off and a new one starts elsewhere;
 * after a handful the scene fades and a fresh round begins.
 *
 * A fixed three-quarter camera with mild perspective projects the lattice once at
 * load. Each frame sorts the unit segments far-to-near (painter's algorithm) and
 * draws each as a background-coloured halo (so crossing pipes read as over/under),
 * a depth-shaded ink body, and a sheen stripe that rounds it into a tube. Each pipe
 * gets its own ink tone, standing in for the original's colours — and now and then
 * a round lays one pipe in an accent (blue or rose) as the minority pop. It is never
 * one of the first two pipes, so it never has the tile to itself. Halos are trimmed
 * back from joints so a pipe never notches itself at its own bends.
 *
 * Growth runs on `useThingyFrame`, so it freezes off-screen and resumes mid-pipe;
 * reduced motion sees a still of a real mid-round scene. Drawn in a 0–100 viewBox so it scales with the tile; decorative and non-interactive.
 * Tile contract: ../README.md.
 */

/** Lattice cells per axis. */
const N = 7
const CELL_COUNT = N * N * N
/** Lattice centre, so it projects around the origin. */
const MID = (N - 1) / 2

/** Fixed camera: yaw around Y then pitch around X (radians) — a three-quarter view
 *  looking slightly down, like the screensaver's. */
const YAW = 0.62
const PITCH = 0.42
/** Viewer distance for the perspective divide, in cells; larger = flatter. */
const VIEW = 16
/** ViewBox units per cell. Big enough that the lattice's corners clip at the tile
 *  edge, so pipes run off-screen as they did on a monitor. */
const SCALE = 10

/** Pipe diameter, ball radius and halo width, in viewBox units at unit perspective. */
const PIPE_W = 5.8
const BALL_R = PIPE_W * 0.72
const HALO = 1.6
/** Body and sheen run this far past each end, so a straight run's unit segments
 *  overlap instead of meeting edge-to-edge (which leaves an anti-aliasing seam). */
const OVERLAP = 0.35
/** Screen-space light direction (up-left) for the sheen. */
const LIGHT = { x: -0.55, y: -0.83 }

/** Time for a pipe to grow one cell, in ms. */
const STEP_MS = 120
/** Chance of carrying straight on when straight ahead is free. */
const STRAIGHT_BIAS = 0.7
/** Chance a bend gets a ball joint instead of a plain elbow. */
const BALL_CHANCE = 0.2
/** Pipes per round, and the longest a pipe grows before capping off. */
const MAX_PIPES = 6
const MAX_LEN = 36
/** End-of-round fade, then a beat of empty tile before the next round. */
const FADE_MS = 900
const REST_MS = 300
/** Per-pipe ink strength, cycled — distinguishes pipes as the colours once did. */
const TONES = [1, 0.7, 0.88, 0.6, 0.94, 0.78]
/** Chance a round lays one accent pipe, the accents to pick from, and the first
 *  pipe index that may take it (later pipes join a scene that's already busy). */
const ACCENT_CHANCE = 0.5
const ACCENTS = ['text-thingy-blue', 'text-thingy-rose']
const ACCENT_FROM = 2
/** The reduced-motion still: grow this many pipes, the last part-way. */
const STILL_PIPES = 4
const STILL_LAST_LEN = 8

/** The six axis steps (±x, ±y, ±z). */
const DIRS: [number, number, number][] = [
  [1, 0, 0],
  [-1, 0, 0],
  [0, 1, 0],
  [0, -1, 0],
  [0, 0, 1],
  [0, 0, -1],
]

type Pt = { x: number; y: number; z: number; p: number }
type Pipe = {
  cells: number[]
  tone: number
  balls: number[]
  /** Accent class (sets currentColor) when this is the round's accent pipe. */
  accent?: string
}
type Round = {
  pipes: Pipe[]
  /** Cells claimed by any pipe (including the one being grown into). */
  taken: Uint8Array
  /** Heading of the growing pipe, as an index into DIRS. */
  dir: number
  /** Cell the head is growing into; -1 when nothing is growing. */
  next: number
  /** 0–1 along head → next. */
  progress: number
  phase: 'grow' | 'fade' | 'rest'
  /** ms into the fade / rest phase. */
  clock: number
  /** Index of the pipe drawn in `accent`; -1 for an all-ink round. */
  accentAt: number
  accent: string
}

const coords = (c: number): [number, number, number] => [
  c % N,
  Math.floor(c / N) % N,
  Math.floor(c / (N * N)),
]
const world = (c: number) => coords(c).map((v) => v - MID)
const pick = <T,>(xs: T[]) => xs[Math.floor(Math.random() * xs.length)]

function neighbour(c: number, d: number): number {
  const [i, j, k] = coords(c)
  const [dx, dy, dz] = DIRS[d]
  const ni = i + dx
  const nj = j + dy
  const nk = k + dz
  if (ni < 0 || nj < 0 || nk < 0 || ni >= N || nj >= N || nk >= N) return -1
  return ni + N * (nj + N * nk)
}

const CY = Math.cos(YAW)
const SY = Math.sin(YAW)
const CX = Math.cos(PITCH)
const SX = Math.sin(PITCH)

function project(x: number, y: number, z: number): Pt {
  // rotate around Y, then X
  const x1 = x * CY + z * SY
  const z1 = -x * SY + z * CY
  const y2 = y * CX - z1 * SX
  const z2 = y * SX + z1 * CX
  const p = VIEW / (VIEW - z2) // perspective divide; nearer (higher z) → larger
  return { x: 50 + x1 * SCALE * p, y: 50 - y2 * SCALE * p, z: z2, p }
}

// The camera never moves, so every cell centre is projected once, up front.
const PTS: Pt[] = Array.from({ length: CELL_COUNT }, (_, c) => {
  const [x, y, z] = world(c)
  return project(x, y, z)
})
const Z_NEAR = Math.max(...PTS.map((q) => q.z))
const Z_FAR = Math.min(...PTS.map((q) => q.z))

/** Ink strength (%) for a depth and pipe tone: near pipes full ink, far ones fade
 *  toward the background. */
function shade(z: number, tone: number) {
  const t = Math.min(1, Math.max(0, (z - Z_FAR) / (Z_NEAR - Z_FAR)))
  return 100 * tone * (0.62 + 0.38 * t)
}
/** An opaque mix of ink and background — opaque, so overlaps never double up. */
const ink = (pct: number) =>
  `color-mix(in oklch, currentColor ${Math.round(pct)}%, var(--background))`
/** The lit stripe: the body lifted toward white, so it reads as a highlight in
 *  both themes (mixing toward the background would turn it into a groove on dark). */
const sheen = (pct: number) => `color-mix(in oklch, ${ink(pct)}, white 55%)`
const BG = 'var(--background)'

function freeDirs(r: Round, c: number): number[] {
  const out: number[] = []
  for (let d = 0; d < DIRS.length; d++) {
    const n = neighbour(c, d)
    if (n >= 0 && !r.taken[n]) out.push(d)
  }
  return out
}

/** Point the growing pipe along `d` and claim the cell it will grow into. */
function aim(r: Round, head: number, d: number) {
  r.dir = d
  r.next = neighbour(head, d)
  r.taken[r.next] = 1
}

/** Start a new pipe from a random free cell; false when the round is done. */
function startPipe(r: Round): boolean {
  if (r.pipes.length >= MAX_PIPES) return false
  for (let tries = 0; tries < 40; tries++) {
    const c = Math.floor(Math.random() * CELL_COUNT)
    if (r.taken[c]) continue
    const dirs = freeDirs(r, c)
    if (dirs.length === 0) continue
    r.taken[c] = 1
    const i = r.pipes.length
    const accented = i === r.accentAt
    r.pipes.push({
      cells: [c],
      tone: accented ? 1 : TONES[i % TONES.length],
      balls: [c], // every pipe starts from a ball
      accent: accented ? r.accent : undefined,
    })
    aim(r, c, pick(dirs))
    r.progress = 0
    return true
  }
  return false
}

function newRound(): Round {
  const r: Round = {
    pipes: [],
    taken: new Uint8Array(CELL_COUNT),
    dir: 0,
    next: -1,
    progress: 0,
    phase: 'grow',
    clock: 0,
    accentAt:
      Math.random() < ACCENT_CHANCE
        ? ACCENT_FROM + Math.floor(Math.random() * (MAX_PIPES - ACCENT_FROM))
        : -1,
    accent: pick(ACCENTS),
  }
  startPipe(r)
  return r
}

/** Land the head on the cell it was growing into, then choose where it goes next
 *  — or cap the pipe and start another, ending the round when none can start. */
function advance(r: Round) {
  const pipe = r.pipes[r.pipes.length - 1]
  const head = r.next
  pipe.cells.push(head)
  r.next = -1

  const dirs = pipe.cells.length < MAX_LEN ? freeDirs(r, head) : []
  if (dirs.length > 0) {
    const d =
      dirs.includes(r.dir) && Math.random() < STRAIGHT_BIAS ? r.dir : pick(dirs)
    if (d !== r.dir && Math.random() < BALL_CHANCE) pipe.balls.push(head)
    aim(r, head, d)
    return
  }

  pipe.balls.push(head) // cap the finished end
  if (!startPipe(r)) {
    r.phase = 'fade'
    r.clock = 0
  }
}

/** A real mid-round still for reduced motion, which never ticks. */
function stillScene(): Round {
  const r = newRound()
  while (r.phase === 'grow') {
    const last = r.pipes[r.pipes.length - 1]
    if (r.pipes.length >= STILL_PIPES && last.cells.length >= STILL_LAST_LEN)
      break
    advance(r)
  }
  r.progress = 0.5
  return r
}

type Item = { z: number; node: ReactNode }

/** One unit of pipe: halo (trimmed back at joints), tube body, sheen stripe. */
function segment(
  key: string,
  a: Pt,
  b: Pt,
  pipe: Pipe,
  trimA: boolean,
  trimB: boolean
): Item | null {
  const dx = b.x - a.x
  const dy = b.y - a.y
  const len = Math.hypot(dx, dy)
  if (len < 0.01) return null
  const ux = dx / len
  const uy = dy / len
  const z = (a.z + b.z) / 2
  const w = PIPE_W * ((a.p + b.p) / 2)
  const pct = shade(z, pipe.tone)

  // Trim the halo clear of a joint so it can't carve into the pipe's own bend.
  const trim = w / 2 + HALO
  const ta = trimA ? trim : 0
  const tb = trimB ? trim : 0

  // Sheen sits on the lit side of the tube.
  let nx = -uy
  let ny = ux
  if (nx * LIGHT.x + ny * LIGHT.y < 0) {
    nx = -nx
    ny = -ny
  }
  const off = w * 0.22
  // Body/sheen ends, nudged past both endpoints by OVERLAP.
  const ax = a.x - ux * OVERLAP
  const ay = a.y - uy * OVERLAP
  const bx = b.x + ux * OVERLAP
  const by = b.y + uy * OVERLAP

  return {
    z,
    node: (
      <g key={key} className={pipe.accent}>
        {len - ta - tb > 0 && (
          <line
            x1={a.x + ux * ta}
            y1={a.y + uy * ta}
            x2={b.x - ux * tb}
            y2={b.y - uy * tb}
            strokeWidth={w + HALO * 2}
            style={{ stroke: BG }}
          />
        )}
        <line
          x1={ax}
          y1={ay}
          x2={bx}
          y2={by}
          strokeWidth={w}
          style={{ stroke: ink(pct) }}
        />
        <line
          x1={ax + nx * off}
          y1={ay + ny * off}
          x2={bx + nx * off}
          y2={by + ny * off}
          strokeWidth={w * 0.24}
          style={{ stroke: sheen(pct) }}
        />
      </g>
    ),
  }
}

function drawItems(r: Round): Item[] {
  const items: Item[] = []
  r.pipes.forEach((pipe, pi) => {
    const growing = pi === r.pipes.length - 1 && r.next >= 0
    const path = growing ? [...pipe.cells, r.next] : pipe.cells
    const balls = new Set(pipe.balls)
    const last = path.length - 1
    // Steps between adjacent cells are ±1, ±N or ±N², so a change of delta is a bend.
    const bend = (i: number) =>
      i > 0 && i < last && path[i] - path[i - 1] !== path[i + 1] - path[i]
    const joint = (i: number) =>
      balls.has(path[i]) || bend(i) || i === 0 || (!growing && i === last)

    for (let i = 0; i < last; i++) {
      const tip = growing && i === last - 1
      let b = PTS[path[i + 1]]
      if (tip) {
        // The growing end: interpolate in 3D, then project.
        const h = world(path[i])
        const n = world(path[i + 1])
        const t = r.progress
        b = project(
          h[0] + (n[0] - h[0]) * t,
          h[1] + (n[1] - h[1]) * t,
          h[2] + (n[2] - h[2]) * t
        )
      }
      const seg = segment(
        `s${path[i]}`,
        PTS[path[i]],
        b,
        pipe,
        joint(i),
        !tip && joint(i + 1)
      )
      if (seg) items.push(seg)
    }

    // Plain elbows get a knuckle disc to round the corner; balls stand proud of the
    // bend. Both draw just over the segments they join (+0.5 depth bias).
    for (let i = 1; i < last; i++) {
      if (!bend(i) || balls.has(path[i])) continue
      const q = PTS[path[i]]
      items.push({
        z: q.z + 0.5,
        node: (
          <circle
            key={`k${path[i]}`}
            className={pipe.accent}
            cx={q.x}
            cy={q.y}
            r={(PIPE_W * q.p) / 2}
            style={{ fill: ink(shade(q.z, pipe.tone)) }}
          />
        ),
      })
    }
    for (const c of pipe.balls) {
      const q = PTS[c]
      const rad = BALL_R * q.p
      const pct = shade(q.z, pipe.tone)
      items.push({
        z: q.z + 0.5,
        node: (
          <g key={`b${c}`} className={pipe.accent}>
            <circle cx={q.x} cy={q.y} r={rad + HALO} style={{ fill: BG }} />
            <circle cx={q.x} cy={q.y} r={rad} style={{ fill: ink(pct) }} />
            <circle
              cx={q.x + LIGHT.x * rad * 0.4}
              cy={q.y + LIGHT.y * rad * 0.4}
              r={rad * 0.3}
              style={{ fill: sheen(pct) }}
            />
          </g>
        ),
      })
    }
  })
  return items.sort((i1, i2) => i1.z - i2.z)
}

export default function WindowsPipesScreensaver() {
  // Mutable round state in a ref (lazy-initialised once per mount); a fresh mount
  // after unmount starts a new round, matching the runtime's reset-on-unmount.
  const round = useRef<Round | null>(null)
  if (round.current === null) round.current = newRound()
  const [, rerender] = useReducer((n: number) => n + 1, 0)

  useThingyFrame((deltaMs) => {
    const r = round.current as Round
    if (r.phase === 'grow') {
      r.progress += deltaMs / STEP_MS
      while (r.phase === 'grow' && r.progress >= 1) {
        r.progress -= 1
        advance(r)
      }
    } else {
      r.clock += deltaMs
      if (r.phase === 'fade' && r.clock >= FADE_MS) {
        r.phase = 'rest'
        r.clock = 0
      } else if (r.phase === 'rest' && r.clock >= REST_MS) {
        round.current = newRound()
      }
    }
    rerender()
  })

  // Reduced motion never ticks, so the round would sit on its first ball. Swap in
  // a mid-round still once on mount instead.
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      round.current = stillScene()
      rerender()
    }
  }, [])

  const r = round.current
  const opacity =
    r.phase === 'grow' ? 1 : r.phase === 'fade' ? 1 - r.clock / FADE_MS : 0

  return (
    <svg
      viewBox="0 0 100 100"
      className="h-full w-full text-foreground"
      aria-hidden="true"
    >
      <g opacity={opacity}>{drawItems(r).map((item) => item.node)}</g>
    </svg>
  )
}
