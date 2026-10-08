'use client'

import { useEffect, useReducer, useRef } from 'react'
import { useThingyActive } from '../../hooks/use-thingy-active'
import { useThingyFrame } from '../../hooks/use-thingy-frame'

/**
 * Pixel water simulation — a small tank of water drawn at the falling-sand tile's
 * 32×32 resolution, but simulated as a real fluid rather than a cellular automaton, so
 * it carries momentum: it splashes, sloshes and settles. Under the hood it is a FLIP
 * solver (after Matthias Müller's "Ten Minute Physics"): ~1,500 particles carry the
 * velocity, a coarse grid one cell per pixel enforces incompressibility, and each frame
 * the particles are rasterised back onto the pixel grid.
 *
 * The loop: blue drops fall in from the top and splash into an ink pool, staying blue
 * for a beat before they mix in. Every few seconds the tank is jolted sideways (gravity
 * tilts for a moment) so the water sloshes wall to wall. Once full it holds, then a
 * drain opens in the middle of the floor, the tank empties and the drops refill it.
 * Moving the cursor across the tile stirs the water, scattering it out of the way.
 *
 * The cursor is read from a passive window listener — the tile itself stays
 * `pointer-events: none` with no handlers, so it can never capture a drag, and it only
 * listens while active. The sim is driven by `useThingyFrame`, so it freezes off-screen
 * and resumes mid-slosh; panning far enough to unmount reseeds a fresh pool. Reduced
 * motion never ticks and instead shows a still of the water mid-slosh with a drop
 * falling. Tile contract: ../README.md.
 */

/** Pixels per side — the same resolution as the falling-sand tile. */
const GRID = 32
/** Pixel edge in viewBox units. */
const CELL = 100 / GRID
/** Seam inset so the water reads as a field of pixels rather than a flat shape. */
const INSET = CELL * 0.07

/** Sim grid side: the GRID×GRID tank plus a one-cell solid wall all round. Sim units
 *  are cells and y points down, so a particle at (x, y) sits over pixel
 *  (⌊x⌋ − 1, ⌊y⌋ − 1), and the tank interior spans [1, GRID + 1] on both axes. */
const N = GRID + 2
const CELLS = N * N
const FLUID = 0
const AIR = 1
const SOLID = 2

/** Particle radius in cells — packs ~3 particles per cell at rest. */
const RADIUS = 0.3
const MIN_DIST = 2 * RADIUS
/** Clamp bounds for a particle centre against the walls. */
const LO = 1 + RADIUS
const HI = GRID + 1 - RADIUS
/** Bucket grid for the push-apart pass, sized so neighbours sit in adjacent buckets. */
const HASH_INV = 1 / (2.2 * RADIUS)
const HASH_N = Math.floor(N * HASH_INV) + 1
const HASH_CELLS = HASH_N * HASH_N
const MAX_PARTICLES = 1800

/** Fixed sim step and solver tuning. */
const DT = 1 / 60
/** Cells/s² — a drop falls the full tank in a little over half a second. */
const GRAVITY = 120
/** FLIP/PIC blend: higher keeps more energy (livelier slosh), lower is calmer. */
const FLIP_RATIO = 0.9
const PRESSURE_ITERS = 30
const SEPARATE_ITERS = 2
const OVER_RELAX = 1.9

/** Opening pool depth in pixels (so there is water to slosh from the first frame), and
 *  the particle count at which the drops stop — roughly half the tank. */
const START_DEPTH = 9
const FILL_TARGET = 1500
/** Seconds between drops, and a drop's half-width in cells (~6–20 particles each).
 *  Drops are taller than wide by DROP_STRETCH, so they read as drops, not squares. */
const DROP_GAP = [0.15, 0.4]
const DROP_RADIUS = [0.7, 1.1]
const DROP_STRETCH = 1.7
/** Seconds a fresh drop's particles stay blue before mixing into the ink pool. Random
 *  per particle, so a landed drop erodes into the pool pixel by pixel. */
const FRESH = [0.8, 1.6]
/** Seconds the full tank holds before the drain opens; the drain's width in pixels;
 *  and a backstop so a film that won't drain can't stall the loop. */
const HOLD_S = 5
const DRAIN_W = 4
const DRAIN_MAX_S = 14
/** While draining, water within FUNNEL_BAND cells of the floor is pulled toward the
 *  hole (cells/s²), as if the floor sloped to it — otherwise the last one-pixel film
 *  just sits there, with nothing to push it over the edge. */
const FUNNEL = 60
const FUNNEL_BAND = 2
/** Jolts: the tank is knocked sideways by tilting gravity for a beat, then released, so
 *  the water rushes over and sloshes back at its own natural period. */
const JOLT_GAP = [2.5, 5.5]
const JOLT_ANGLE = [0.3, 0.6]
const JOLT_HOLD = [0.2, 0.45]
const TILT_EASE = 14
/** Cursor stirring: particles within STIR_RADIUS cells of a moving cursor are dragged
 *  along and flung outward. Speed is capped so a flick can't blow the sim up. */
const STIR_RADIUS = 3.5
const STIR_MAX_SPEED = 90
const STIR_GRIP = 0.6
const STIR_FLING = 0.5

/** A cell this dense (as a fraction of rest density) draws as solid water; sparser
 *  cells holding a stray particle draw faint, as spray. */
const DENSE = 0.35
const SPRAY_OPACITY = 0.4

/** Pixel kinds for rendering (0 is empty, as a fresh Uint8Array is all-empty). */
const INK = 1
const SPRAY = 2
const FRESH_WATER = 3

type Mode = 'fill' | 'hold' | 'drain'
type Sim = {
  n: number
  pos: Float32Array
  vel: Float32Array
  /** Seconds left of the blue "fresh drop" tint, per particle. */
  fresh: Float32Array
  /** Staggered MAC grid: u on left faces, v on top faces; s is 0 for solid walls. */
  u: Float32Array
  v: Float32Array
  du: Float32Array
  dv: Float32Array
  prevU: Float32Array
  prevV: Float32Array
  s: Float32Array
  type: Int32Array
  density: Float32Array
  restDensity: number
  bucketCount: Int32Array
  bucketFirst: Int32Array
  bucketIds: Int32Array
  mode: Mode
  modeT: number
  dropIn: number
  tilt: number
  joltIn: number
  joltT: number
  joltAngle: number
  /** The cursor in sim coords and its velocity (cells/s), or null when not stirring. */
  stir: { x: number; y: number; vx: number; vy: number } | null
}

const rand = ([min, max]: number[]) => min + Math.random() * (max - min)
const clamp = (x: number, lo: number, hi: number) =>
  x < lo ? lo : x > hi ? hi : x
/** Sim column of the drain's left edge — the hole is centred in the floor. */
const DRAIN_L = 1 + (GRID - DRAIN_W) / 2

function addParticle(
  s: Sim,
  x: number,
  y: number,
  vx: number,
  vy: number,
  fresh: number
) {
  if (s.n >= MAX_PARTICLES) return
  const i = s.n++
  s.pos[2 * i] = x
  s.pos[2 * i + 1] = y
  s.vel[2 * i] = vx
  s.vel[2 * i + 1] = vy
  s.fresh[i] = fresh
}

/** Swap-remove: the last particle takes slot i. */
function removeParticle(s: Sim, i: number) {
  const last = --s.n
  s.pos[2 * i] = s.pos[2 * last]
  s.pos[2 * i + 1] = s.pos[2 * last + 1]
  s.vel[2 * i] = s.vel[2 * last]
  s.vel[2 * i + 1] = s.vel[2 * last + 1]
  s.fresh[i] = s.fresh[last]
}

function setFloorOpen(s: Sim, open: boolean) {
  for (let i = DRAIN_L; i < DRAIN_L + DRAIN_W; i++) {
    s.s[i * N + N - 1] = open ? 1 : 0
  }
}

function newSim(): Sim {
  const s: Sim = {
    n: 0,
    pos: new Float32Array(2 * MAX_PARTICLES),
    vel: new Float32Array(2 * MAX_PARTICLES),
    fresh: new Float32Array(MAX_PARTICLES),
    u: new Float32Array(CELLS),
    v: new Float32Array(CELLS),
    du: new Float32Array(CELLS),
    dv: new Float32Array(CELLS),
    prevU: new Float32Array(CELLS),
    prevV: new Float32Array(CELLS),
    s: new Float32Array(CELLS),
    type: new Int32Array(CELLS),
    density: new Float32Array(CELLS),
    restDensity: 0,
    bucketCount: new Int32Array(HASH_CELLS),
    bucketFirst: new Int32Array(HASH_CELLS + 1),
    bucketIds: new Int32Array(MAX_PARTICLES),
    mode: 'fill',
    modeT: 0,
    dropIn: 0.6,
    tilt: 0,
    // First jolt comes quickly, so the slosh shows within a moment of appearing.
    joltIn: 1.2,
    joltT: 0,
    joltAngle: 0,
    stir: null,
  }
  for (let i = 0; i < N; i++) {
    for (let j = 0; j < N; j++) {
      const wall = i === 0 || i === N - 1 || j === 0 || j === N - 1
      s.s[i * N + j] = wall ? 0 : 1
    }
  }
  // A settled pool on a hex lattice, so the first frame already has water to slosh.
  // Deterministic, so the server and client first paints match.
  const dy = (MIN_DIST * Math.sqrt(3)) / 2
  let row = 0
  for (let y = HI; y > GRID + 1 - START_DEPTH; y -= dy) {
    for (let x = LO + (row % 2) * RADIUS; x <= HI; x += MIN_DIST) {
      addParticle(s, x, y, 0, 0, 0)
    }
    row++
  }
  return s
}

function spawnDrop(s: Sim) {
  const rx = rand(DROP_RADIUS)
  const ry = rx * DROP_STRETCH
  const cx = rand([LO + rx + 1, HI - rx - 1])
  const cy = LO + ry
  const vx = rand([-4, 4])
  const vy = rand([4, 10])
  const dy = (MIN_DIST * Math.sqrt(3)) / 2
  let row = 0
  for (let y = -ry; y <= ry; y += dy) {
    for (let x = -rx + (row % 2) * RADIUS; x <= rx; x += MIN_DIST) {
      if ((x / rx) ** 2 + (y / ry) ** 2 <= 1) {
        addParticle(s, cx + x, cy + y, vx, vy, rand(FRESH))
      }
    }
    row++
  }
}

function setMode(s: Sim, mode: Mode) {
  s.mode = mode
  s.modeT = 0
  setFloorOpen(s, mode === 'drain')
}

/** Drops, jolts and the fill → hold → drain loop. */
function advanceLifecycle(s: Sim) {
  s.modeT += DT
  if (s.joltT > 0) s.joltT -= DT
  s.joltIn -= DT
  if (s.joltIn <= 0) {
    s.joltIn = rand(JOLT_GAP)
    // Not worth jolting a near-empty tank — there's nothing to slosh.
    if (s.n > 150) {
      s.joltAngle = (Math.random() < 0.5 ? -1 : 1) * rand(JOLT_ANGLE)
      s.joltT = rand(JOLT_HOLD)
    }
  }

  if (s.mode === 'fill') {
    s.dropIn -= DT
    if (s.dropIn <= 0) {
      spawnDrop(s)
      s.dropIn = rand(DROP_GAP)
    }
    if (s.n >= FILL_TARGET) setMode(s, 'hold')
  } else if (s.mode === 'hold') {
    if (s.modeT > HOLD_S) setMode(s, 'drain')
  } else if (s.n === 0 || s.modeT > DRAIN_MAX_S) {
    s.n = 0
    setMode(s, 'fill')
  }
}

function integrate(s: Sim, gx: number, gy: number) {
  const { pos, vel, fresh } = s
  const funnel = s.mode === 'drain'
  const drainMid = DRAIN_L + DRAIN_W / 2
  for (let i = 0; i < s.n; i++) {
    vel[2 * i] += DT * gx
    vel[2 * i + 1] += DT * gy
    if (funnel && pos[2 * i + 1] > HI - FUNNEL_BAND) {
      // Eased near the hole so water right over it doesn't jitter side to side.
      vel[2 * i] += DT * FUNNEL * clamp((drainMid - pos[2 * i]) / 2, -1, 1)
    }
    pos[2 * i] += vel[2 * i] * DT
    pos[2 * i + 1] += vel[2 * i + 1] * DT
    if (fresh[i] > 0) fresh[i] -= DT
  }
}

/** Drag particles near a moving cursor along with it and fling them outward. */
function stirParticles(s: Sim) {
  const c = s.stir
  if (c === null) return
  const speed = Math.hypot(c.vx, c.vy)
  if (speed < 1) return
  const { pos, vel } = s
  const r2 = STIR_RADIUS * STIR_RADIUS
  for (let i = 0; i < s.n; i++) {
    const dx = pos[2 * i] - c.x
    const dy = pos[2 * i + 1] - c.y
    const d2 = dx * dx + dy * dy
    if (d2 >= r2) continue
    const d = Math.sqrt(d2) || 1
    const falloff = 1 - d / STIR_RADIUS
    const tx = c.vx + (dx / d) * speed * STIR_FLING
    const ty = c.vy + (dy / d) * speed * STIR_FLING
    const k = falloff * STIR_GRIP
    vel[2 * i] += (tx - vel[2 * i]) * k
    vel[2 * i + 1] += (ty - vel[2 * i + 1]) * k
  }
}

/** Push overlapping particles apart, so the water keeps its volume and drops spread. */
function separateParticles(s: Sim) {
  const { pos, bucketCount, bucketFirst, bucketIds } = s
  bucketCount.fill(0)
  const bucketOf = (i: number) => {
    const xi = clamp(Math.floor(pos[2 * i] * HASH_INV), 0, HASH_N - 1)
    const yi = clamp(Math.floor(pos[2 * i + 1] * HASH_INV), 0, HASH_N - 1)
    return xi * HASH_N + yi
  }
  for (let i = 0; i < s.n; i++) bucketCount[bucketOf(i)]++
  let first = 0
  for (let b = 0; b < HASH_CELLS; b++) {
    first += bucketCount[b]
    bucketFirst[b] = first
  }
  bucketFirst[HASH_CELLS] = first
  for (let i = 0; i < s.n; i++) {
    const b = bucketOf(i)
    bucketFirst[b]--
    bucketIds[bucketFirst[b]] = i
  }

  const minDist2 = MIN_DIST * MIN_DIST
  for (let iter = 0; iter < SEPARATE_ITERS; iter++) {
    for (let i = 0; i < s.n; i++) {
      const px = pos[2 * i]
      const py = pos[2 * i + 1]
      const pxi = Math.floor(px * HASH_INV)
      const pyi = Math.floor(py * HASH_INV)
      const x0 = Math.max(pxi - 1, 0)
      const y0 = Math.max(pyi - 1, 0)
      const x1 = Math.min(pxi + 1, HASH_N - 1)
      const y1 = Math.min(pyi + 1, HASH_N - 1)
      for (let xi = x0; xi <= x1; xi++) {
        for (let yi = y0; yi <= y1; yi++) {
          const b = xi * HASH_N + yi
          for (let k = bucketFirst[b]; k < bucketFirst[b + 1]; k++) {
            const id = bucketIds[k]
            if (id === i) continue
            let dx = pos[2 * id] - pos[2 * i]
            let dy = pos[2 * id + 1] - pos[2 * i + 1]
            const d2 = dx * dx + dy * dy
            if (d2 > minDist2 || d2 === 0) continue
            const d = Math.sqrt(d2)
            const push = (0.5 * (MIN_DIST - d)) / d
            dx *= push
            dy *= push
            pos[2 * i] -= dx
            pos[2 * i + 1] -= dy
            pos[2 * id] += dx
            pos[2 * id + 1] += dy
          }
        }
      }
    }
  }
}

/** Keep particles inside the tank; while draining, let them fall out of the hole. */
function collideWalls(s: Sim) {
  const { pos, vel } = s
  const draining = s.mode === 'drain'
  let i = 0
  while (i < s.n) {
    let x = pos[2 * i]
    let y = pos[2 * i + 1]
    if (x < LO) {
      x = LO
      vel[2 * i] = 0
    } else if (x > HI) {
      x = HI
      vel[2 * i] = 0
    }
    if (y < LO) {
      y = LO
      vel[2 * i + 1] = 0
    } else if (y > HI) {
      if (draining && x > DRAIN_L && x < DRAIN_L + DRAIN_W) {
        if (y > GRID + 1) {
          removeParticle(s, i)
          continue
        }
      } else {
        y = HI
        vel[2 * i + 1] = 0
      }
    }
    pos[2 * i] = x
    pos[2 * i + 1] = y
    i++
  }
}

/** Bilinear weights of a sample point against the grid, offset (ox, oy) in cells. */
function weights(x: number, y: number, ox: number, oy: number) {
  const cx = clamp(x, 1, N - 1)
  const cy = clamp(y, 1, N - 1)
  const x0 = Math.min(Math.floor(cx - ox), N - 2)
  const y0 = Math.min(Math.floor(cy - oy), N - 2)
  const tx = cx - ox - x0
  const ty = cy - oy - y0
  const x1 = Math.min(x0 + 1, N - 2)
  const y1 = Math.min(y0 + 1, N - 2)
  return {
    nr0: x0 * N + y0,
    nr1: x1 * N + y0,
    nr2: x1 * N + y1,
    nr3: x0 * N + y1,
    d0: (1 - tx) * (1 - ty),
    d1: tx * (1 - ty),
    d2: tx * ty,
    d3: (1 - tx) * ty,
  }
}

/** Particle → grid: classify cells and splat particle velocities onto the faces. */
function transferToGrid(s: Sim) {
  const { pos, vel, u, v, du, dv, prevU, prevV, type } = s
  prevU.set(u)
  prevV.set(v)
  u.fill(0)
  v.fill(0)
  du.fill(0)
  dv.fill(0)
  for (let c = 0; c < CELLS; c++) type[c] = s.s[c] === 0 ? SOLID : AIR
  for (let i = 0; i < s.n; i++) {
    const xi = clamp(Math.floor(pos[2 * i]), 0, N - 1)
    const yi = clamp(Math.floor(pos[2 * i + 1]), 0, N - 1)
    const c = xi * N + yi
    if (type[c] === AIR) type[c] = FLUID
  }

  for (let comp = 0; comp < 2; comp++) {
    const f = comp === 0 ? u : v
    const d = comp === 0 ? du : dv
    for (let i = 0; i < s.n; i++) {
      const w = weights(
        pos[2 * i],
        pos[2 * i + 1],
        comp === 0 ? 0 : 0.5,
        comp === 0 ? 0.5 : 0
      )
      const pv = vel[2 * i + comp]
      f[w.nr0] += pv * w.d0
      d[w.nr0] += w.d0
      f[w.nr1] += pv * w.d1
      d[w.nr1] += w.d1
      f[w.nr2] += pv * w.d2
      d[w.nr2] += w.d2
      f[w.nr3] += pv * w.d3
      d[w.nr3] += w.d3
    }
    for (let c = 0; c < CELLS; c++) if (d[c] > 0) f[c] /= d[c]
  }

  // Faces touching a wall keep their previous (zero) velocity.
  for (let i = 0; i < N; i++) {
    for (let j = 0; j < N; j++) {
      const c = i * N + j
      const solid = type[c] === SOLID
      if (solid || (i > 0 && type[c - N] === SOLID)) u[c] = prevU[c]
      if (solid || (j > 0 && type[c - 1] === SOLID)) v[c] = prevV[c]
    }
  }
}

/** Particle density per cell, used to push back where particles have bunched up. */
function updateDensity(s: Sim) {
  const { pos, density, type } = s
  density.fill(0)
  for (let i = 0; i < s.n; i++) {
    const w = weights(pos[2 * i], pos[2 * i + 1], 0.5, 0.5)
    density[w.nr0] += w.d0
    density[w.nr1] += w.d1
    density[w.nr2] += w.d2
    density[w.nr3] += w.d3
  }
  // Calibrate once against the settled opening pool.
  if (s.restDensity === 0) {
    let sum = 0
    let cells = 0
    for (let c = 0; c < CELLS; c++) {
      if (type[c] === FLUID) {
        sum += density[c]
        cells++
      }
    }
    if (cells > 0) s.restDensity = sum / cells
  }
}

/** Gauss–Seidel pressure projection: make the velocity field divergence-free. */
function solveIncompressibility(s: Sim) {
  const { u, v, type, density, restDensity } = s
  const open = s.s
  s.prevU.set(u)
  s.prevV.set(v)
  for (let iter = 0; iter < PRESSURE_ITERS; iter++) {
    for (let i = 1; i < N - 1; i++) {
      for (let j = 1; j < N - 1; j++) {
        const c = i * N + j
        if (type[c] !== FLUID) continue
        const left = c - N
        const right = c + N
        const up = c - 1
        const down = c + 1
        const sx0 = open[left]
        const sx1 = open[right]
        const sy0 = open[up]
        const sy1 = open[down]
        const sum = sx0 + sx1 + sy0 + sy1
        if (sum === 0) continue
        let div = u[right] - u[c] + v[down] - v[c]
        if (restDensity > 0) {
          const compression = density[c] - restDensity
          if (compression > 0) div -= compression
        }
        const p = (-div / sum) * OVER_RELAX
        u[c] -= sx0 * p
        u[right] += sx1 * p
        v[c] -= sy0 * p
        v[down] += sy1 * p
      }
    }
  }
}

/** Grid → particle: blend the PIC velocity with the FLIP velocity change. */
function transferToParticles(s: Sim) {
  const { pos, vel, u, v, prevU, prevV, type } = s
  for (let comp = 0; comp < 2; comp++) {
    const f = comp === 0 ? u : v
    const prevF = comp === 0 ? prevU : prevV
    const offset = comp === 0 ? N : 1
    const valid = (c: number) =>
      type[c] !== AIR || type[c - offset] !== AIR ? 1 : 0
    for (let i = 0; i < s.n; i++) {
      const w = weights(
        pos[2 * i],
        pos[2 * i + 1],
        comp === 0 ? 0 : 0.5,
        comp === 0 ? 0.5 : 0
      )
      const v0 = valid(w.nr0) * w.d0
      const v1 = valid(w.nr1) * w.d1
      const v2 = valid(w.nr2) * w.d2
      const v3 = valid(w.nr3) * w.d3
      const d = v0 + v1 + v2 + v3
      if (d <= 0) continue
      const pic =
        (v0 * f[w.nr0] + v1 * f[w.nr1] + v2 * f[w.nr2] + v3 * f[w.nr3]) / d
      const corr =
        (v0 * (f[w.nr0] - prevF[w.nr0]) +
          v1 * (f[w.nr1] - prevF[w.nr1]) +
          v2 * (f[w.nr2] - prevF[w.nr2]) +
          v3 * (f[w.nr3] - prevF[w.nr3])) /
        d
      const flip = vel[2 * i + comp] + corr
      vel[2 * i + comp] = (1 - FLIP_RATIO) * pic + FLIP_RATIO * flip
    }
  }
}

function step(s: Sim) {
  advanceLifecycle(s)
  const target = s.joltT > 0 ? s.joltAngle : 0
  s.tilt += (target - s.tilt) * Math.min(1, TILT_EASE * DT)
  integrate(s, GRAVITY * Math.sin(s.tilt), GRAVITY * Math.cos(s.tilt))
  stirParticles(s)
  separateParticles(s)
  collideWalls(s)
  transferToGrid(s)
  updateDensity(s)
  solveIncompressibility(s)
  transferToParticles(s)
}

/** Rasterise the particles onto the GRID×GRID pixel grid as pixel kinds. */
function rasterise(s: Sim): Uint8Array {
  const count = new Uint16Array(GRID * GRID)
  const fresh = new Uint16Array(GRID * GRID)
  for (let i = 0; i < s.n; i++) {
    const px = Math.floor(s.pos[2 * i]) - 1
    const py = Math.floor(s.pos[2 * i + 1]) - 1
    if (px < 0 || px >= GRID || py < 0 || py >= GRID) continue
    const p = py * GRID + px
    count[p]++
    if (s.fresh[i] > 0) fresh[p]++
  }
  const kinds = new Uint8Array(GRID * GRID)
  const dense = DENSE * (s.restDensity || 3)
  for (let p = 0; p < kinds.length; p++) {
    const c = count[p]
    if (c === 0) continue
    if (fresh[p] * 2 > c) {
      kinds[p] = FRESH_WATER
      continue
    }
    const cell = ((p % GRID) + 1) * N + Math.floor(p / GRID) + 1
    kinds[p] = s.density[cell] >= dense || c >= 2 ? INK : SPRAY
  }
  return kinds
}

/**
 * A representative still for reduced motion, which never ticks: the pool caught
 * mid-slosh (its surface in the tank's first sloshing mode, high on the left and low
 * on the right) with a fresh drop falling toward it.
 */
function staticScene(): Uint8Array {
  const kinds = new Uint8Array(GRID * GRID)
  for (let x = 0; x < GRID; x++) {
    const depth = Math.round(12 + 4 * Math.cos((Math.PI * x) / (GRID - 1)))
    for (let k = 0; k < depth; k++) kinds[(GRID - 1 - k) * GRID + x] = INK
  }
  for (const [x, y] of [
    [21, 7],
    [22, 7],
    [21, 8],
    [22, 8],
    [21, 9],
    [22, 9],
  ]) {
    kinds[y * GRID + x] = FRESH_WATER
  }
  return kinds
}

/** One path per pixel kind — a single DOM node each, however much water there is. */
function pathOf(kinds: Uint8Array, kind: number): string {
  const size = (CELL - INSET * 2).toFixed(2)
  let d = ''
  for (let p = 0; p < kinds.length; p++) {
    if (kinds[p] !== kind) continue
    const x = ((p % GRID) * CELL + INSET).toFixed(2)
    const y = (Math.floor(p / GRID) * CELL + INSET).toFixed(2)
    d += `M${x} ${y}h${size}v${size}h-${size}z`
  }
  return d
}

export default function PixelWaterSimulation() {
  // Mutable sim state in a ref (lazy-initialised once per mount); a fresh mount after
  // unmount reseeds the pool, matching the runtime's reset-on-unmount.
  const sim = useRef<Sim | null>(null)
  if (sim.current === null) sim.current = newSim()
  const still = useRef<Uint8Array | null>(null)
  const svg = useRef<SVGSVGElement>(null)
  const accum = useRef(0)
  /** Latest cursor position (client px), and the previous frame's in sim coords. */
  const pointer = useRef<{ x: number; y: number } | null>(null)
  const lastStir = useRef<{ x: number; y: number } | null>(null)
  const [, render] = useReducer((n: number) => n + 1, 0)
  const active = useThingyActive()

  // The tile is pointer-events: none, so the cursor is read off the window instead —
  // passive, never captured, and only while the tile is live.
  useEffect(() => {
    if (!active) return
    const onMove = (e: PointerEvent) => {
      pointer.current = { x: e.clientX, y: e.clientY }
    }
    const onLeave = () => {
      pointer.current = null
    }
    window.addEventListener('pointermove', onMove, {
      passive: true,
      capture: true,
    })
    document.documentElement.addEventListener('pointerleave', onLeave)
    return () => {
      window.removeEventListener('pointermove', onMove, { capture: true })
      document.documentElement.removeEventListener('pointerleave', onLeave)
      pointer.current = null
      lastStir.current = null
    }
  }, [active])

  useThingyFrame((deltaMs) => {
    const s = sim.current as Sim
    const dt = deltaMs / 1000

    // Map the cursor into sim coords via the tile's on-screen box (which already
    // accounts for canvas pan and zoom), and derive its velocity from the last frame.
    const box = svg.current?.getBoundingClientRect()
    const ptr = pointer.current
    if (box && ptr && box.width > 0 && dt > 0) {
      const x = 1 + ((ptr.x - box.left) / box.width) * GRID
      const y = 1 + ((ptr.y - box.top) / box.height) * GRID
      const prev = lastStir.current
      if (prev) {
        let vx = (x - prev.x) / dt
        let vy = (y - prev.y) / dt
        const speed = Math.hypot(vx, vy)
        if (speed > STIR_MAX_SPEED) {
          vx *= STIR_MAX_SPEED / speed
          vy *= STIR_MAX_SPEED / speed
        }
        s.stir = { x, y, vx, vy }
      }
      lastStir.current = { x, y }
    } else {
      s.stir = null
      lastStir.current = null
    }

    // Fixed-step the sim; the frame delta is already clamped, so at most two steps.
    accum.current = Math.min(accum.current + dt, DT * 2)
    let stepped = false
    while (accum.current >= DT) {
      step(s)
      accum.current -= DT
      stepped = true
    }
    if (stepped) render()
  })

  // Reduced motion never ticks, so the opening pool would sit perfectly flat forever.
  // Swap in a still caught mid-slosh once on mount instead.
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      still.current = staticScene()
      render()
    }
  }, [])

  const kinds = still.current ?? rasterise(sim.current)

  return (
    <svg
      ref={svg}
      viewBox="0 0 100 100"
      className="h-full w-full text-foreground"
      aria-hidden="true"
    >
      <path d={pathOf(kinds, INK)} fill="currentColor" />
      <path
        d={pathOf(kinds, SPRAY)}
        fill="currentColor"
        opacity={SPRAY_OPACITY}
      />
      <path
        d={pathOf(kinds, FRESH_WATER)}
        className="text-thingy-blue"
        fill="currentColor"
      />
    </svg>
  )
}
