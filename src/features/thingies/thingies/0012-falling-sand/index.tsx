'use client'

import { useEffect, useReducer, useRef } from 'react'
import { useThingyInterval } from '../../hooks/use-thingy-interval'

/**
 * An old-school falling-sand toy: a cellular automaton where each cell is a grain
 * obeying cheap, local rules. A thin stream pours from a point that wanders the top
 * edge on a random walk, holding one material for a stretch before switching: long
 * runs of ink SAND that pile into loose, slowly relaxing slopes; runs of blue WATER
 * that flow down and pool in the hollows; rose LAVA that burns the sand it touches into
 * more lava and flashes the water it meets into rising STEAM; and — rarely — a violet
 * infection that seeds low in the pile and creeps upward in branching tendrils, freezing
 * the sand and water it touches solid (lava, in turn, burns straight through it). Once
 * the box
 * fills, a hole opens in the middle of the floor and the floor creeps inward toward it,
 * so grains funnel out a few at a time rather than the floor dropping out all at once;
 * the infection thaws back to sand as it goes, then the box refills — a loop that never
 * goes static.
 *
 * The clock is `useThingyInterval`, so the whole sim freezes while the tile is
 * off-screen or the tab is hidden and resumes mid-pour on return; panning far enough
 * to unmount reseeds a fresh box. Drawn on a 0–100 viewBox so it scales with the
 * tile, and only non-empty grains are rendered, so the DOM tracks the amount of sand
 * rather than the whole grid. The animated sim starts from an empty box; reduced
 * motion, which never ticks, instead shows a representative still — a pond pooled in a
 * hollow of sand — rather than a blank square. Tile contract: ../README.md.
 */

/** Cells per side. */
const GRID = 32
/** Cell edge in viewBox units. */
const CELL = 100 / GRID
/** Step cadence in ms — chunky on purpose so it reads as old-school sand. */
const STEP_MS = 80
/** Seam inset so grains read as separate specks rather than a solid mass. */
const INSET = CELL * 0.07

/** Materials. EMPTY must stay 0 (a fresh Uint8Array is all-empty). */
const EMPTY = 0
const SAND = 1
const WATER = 2
const LAVA = 3
const STEAM = 4
const VIOLET = 5

/** Fill ratios that flip the box between filling and draining. FILL_MIN is 0, so the
 * board drains completely — an empty box — before any new sand starts to fall. */
const FILL_MAX = 0.46
const FILL_MIN = 0
/** Backstop: flip mode after this many ticks even if a threshold is never reached. */
const MAX_TICKS = 2500

/** A material run lasts a random number of ticks in this range before switching. */
const SAND_RUN = [120, 220]
const WATER_RUN = [50, 110]
const LAVA_RUN = [30, 80]
const VIOLET_RUN = [10, 25]

/** Once unlocked (after the board's second full drain), the odds a sand run is followed
 * by the violet infection rather than water/lava — kept low, a rare outbreak. */
const VIOLET_ODDS = 0.15
/** Otherwise (the non-violet case), the odds it is water rather than lava (an even
 * split). Raise it to make lava rarer, lower it for more lava. */
const WATER_VS_LAVA = 0.5

/** Emitter random walk: jitter, damping, and speed cap, kept clear of the walls. */
const EMIT_MARGIN = 3
const EMIT_ACCEL = 0.5
const EMIT_DAMP = 0.88
const EMIT_VMAX = 0.7

/** Per-tick chance a steam wisp dissipates as it rises off evaporated water. */
const STEAM_DECAY = 0.1

/** How readily resting sand tumbles sideways to relax a slope — far below water, which
 * settles flat every tick, so sand keeps a looser, grainier, gently sliding surface. */
const SAND_SLIDE = 0.2

/** Width of the drain hole in the centre of the floor. */
const DRAIN_W = 4

/** Burn fuel a fresh lava grain carries. Each grain it ignites gets one less, so a burn
 * spreads this many cells out (in every direction) before fizzling — big enough to eat a
 * decent crater into the pile, still bounded so it can't consume the whole board. */
const LAVA_FUEL = 6
/** Per-tick chance idle lava (landed, but touching nothing to burn yet) fizzles out, so
 * it lingers a moment to find fuel rather than vanishing, but never lasts forever. */
const LAVA_DECAY = 0.08

/** Per-tick chance a violet grain infects one of its touching neighbours. Low, so the
 * infection creeps out in branching tendrils before slowly filling the mass in. */
const VIOLET_SPREAD = 0.12
/** The infection may never occupy rows above this one (frozen violet can't fall, so it
 * must be kept clear of the stream's pour zone or it would jam, then stall the sim). */
const VIOLET_TOP = Math.round(GRID * 0.3)
/** Outbreaks seed only at or below this row — in the bottom quarter — so the infection
 * starts down in the base and creeps upward, rather than appearing high on the pile. */
const VIOLET_SPAWN_TOP = Math.floor(GRID * 0.75)

const MATERIAL_CLASS: Record<number, string> = {
  [SAND]: 'text-foreground',
  [WATER]: 'text-thingy-blue',
  [LAVA]: 'text-thingy-rose',
  [STEAM]: 'text-foreground',
  [VIOLET]: 'text-thingy-violet',
}
const MATERIAL_OPACITY: Record<number, number> = {
  [SAND]: 1,
  [WATER]: 0.85,
  [LAVA]: 1,
  [STEAM]: 0.35,
  [VIOLET]: 1,
}

type Mode = 'fill' | 'drain'
type Sim = {
  grid: Uint8Array
  /** Per-cell burn fuel, non-zero only for lava grains; rides with grains on swaps. */
  heat: Uint8Array
  mode: Mode
  /** Emitter column (float) and velocity, for a smooth wandering stream. */
  emitX: number
  emitV: number
  /** The material the stream is currently pouring, and ticks left on this run. */
  streamMat: number
  streamLeft: number
  ticks: number
  /** How many times the board has fully drained; gates lava (>= 1) and violet (>= 2). */
  drains: number
}

const idx = (x: number, y: number) => y * GRID + x
const runLength = ([min, max]: number[]) =>
  min + Math.floor(Math.random() * (max - min))

/**
 * A representative still for reduced motion, which never ticks and so can't build the
 * scene live: a low bed of sand with a pond pooled in a central hollow. Shown only as
 * a static fallback — the animated sim starts from an empty box.
 */
function staticScene(): Uint8Array {
  const g = new Uint8Array(GRID * GRID)
  const center = (GRID - 1) / 2
  for (let x = 0; x < GRID; x++) {
    // Valley profile: low in the middle, rising toward the walls.
    const d = Math.abs(x - center) / center
    const h = Math.round(3 + d * d * 8)
    for (let k = 0; k < h; k++) g[idx(x, GRID - 1 - k)] = SAND
  }
  // Flood the central hollow up to a level — a pond where the sand is low.
  const pondTop = GRID - 1 - 8
  for (let x = 0; x < GRID; x++) {
    for (let y = GRID - 1; y >= pondTop; y--) {
      const i = idx(x, y)
      if (g[i] === EMPTY) g[i] = WATER
    }
  }
  return g
}

function newSim(): Sim {
  return {
    // Start empty — the stream builds the scene from nothing.
    grid: new Uint8Array(GRID * GRID),
    heat: new Uint8Array(GRID * GRID),
    mode: 'fill',
    emitX: (GRID - 1) / 2,
    emitV: 0,
    streamMat: SAND,
    streamLeft: runLength(SAND_RUN),
    ticks: 0,
    drains: 0,
  }
}

function countFill(g: Uint8Array): number {
  let n = 0
  for (let i = 0; i < g.length; i++) if (g[i] !== EMPTY) n++
  return n / g.length
}

/** Advance one tick in place, returning the same (mutated) sim with updated state. */
function step(s: Sim): Sim {
  const g = s.grid
  const heat = s.heat
  // Marks a cell as already settled this tick so a grain never moves twice.
  const moved = new Uint8Array(g.length)
  const swap = (i: number, j: number) => {
    const t = g[i]
    g[i] = g[j]
    g[j] = t
    // Burn fuel travels with the grain, so falling lava keeps its remaining fuel.
    const th = heat[i]
    heat[i] = heat[j]
    heat[j] = th
    moved[j] = 1
  }

  let { mode, emitX, emitV, streamMat, streamLeft, ticks, drains } = s
  ticks += 1
  const fill = countFill(g)
  if (mode === 'fill' && (fill >= FILL_MAX || ticks > MAX_TICKS)) {
    mode = 'drain'
    ticks = 0
    // The infection thaws: frozen violet reverts to sand so it drains away like the rest.
    for (let i = 0; i < g.length; i++) if (g[i] === VIOLET) g[i] = SAND
  } else if (mode === 'drain' && (fill <= FILL_MIN || ticks > MAX_TICKS)) {
    mode = 'fill'
    ticks = 0
    // A full drain just completed — this unlocks lava (after 1) and violet (after 2).
    drains += 1
  }

  if (mode === 'fill') {
    // Wander the emitter on a damped random walk, reflecting off the margins.
    emitV = emitV * EMIT_DAMP + (Math.random() - 0.5) * EMIT_ACCEL
    if (emitV > EMIT_VMAX) emitV = EMIT_VMAX
    if (emitV < -EMIT_VMAX) emitV = -EMIT_VMAX
    emitX += emitV
    const lo = EMIT_MARGIN
    const hi = GRID - 1 - EMIT_MARGIN
    if (emitX < lo) {
      emitX = lo
      emitV = Math.abs(emitV)
    } else if (emitX > hi) {
      emitX = hi
      emitV = -Math.abs(emitV)
    }

    // Pour one material for a stretch, then switch. Sand alternates with water, lava, or
    // (rarely) the violet infection; water/lava/violet all give way back to sand, so
    // terrain rebuilds for the next event.
    streamLeft -= 1
    if (streamLeft <= 0) {
      if (streamMat === SAND) {
        // Escalating reveal: water from the start, lava only after the first full drain,
        // the violet infection only after the second (and a touch more likely than lava
        // would be at its share).
        if (drains >= 2 && Math.random() < VIOLET_ODDS) {
          streamMat = VIOLET
        } else if (drains >= 1 && Math.random() < 1 - WATER_VS_LAVA) {
          streamMat = LAVA
        } else {
          streamMat = WATER
        }
      } else {
        streamMat = SAND
      }
      streamLeft = runLength(
        streamMat === SAND
          ? SAND_RUN
          : streamMat === WATER
            ? WATER_RUN
            : streamMat === LAVA
              ? LAVA_RUN
              : VIOLET_RUN
      )
    }

    const ex = Math.round(emitX)
    if (ex >= 0 && ex < GRID) {
      if (streamMat === VIOLET) {
        // The infection is frozen, so it can't pour from the top — seed it down in the
        // base (bottom quarter) of this column, infecting the topmost grain found there,
        // so outbreaks start low and creep upward.
        for (let y = VIOLET_SPAWN_TOP; y < GRID; y++) {
          if (g[idx(ex, y)] !== EMPTY) {
            g[idx(ex, y)] = VIOLET
            break
          }
        }
      } else if (g[idx(ex, 0)] === EMPTY) {
        const i = idx(ex, 0)
        g[i] = streamMat
        if (streamMat === LAVA) heat[i] = LAVA_FUEL
      }
    }
  } else {
    // Drain: a hole DRAIN_W wide in the middle of the floor swallows whatever sits over
    // it, and the floor creeps inward toward it. Processing inner-first lets a gap at
    // the centre propagate to the wall in one tick, so the whole floor slides toward the
    // hole a step at a time — a funnel, not the floor dropping out all at once.
    const bottom = GRID - 1
    const holeL = (GRID >> 1) - (DRAIN_W >> 1)
    const holeR = holeL + DRAIN_W - 1
    for (let x = holeL; x <= holeR; x++) g[idx(x, bottom)] = EMPTY
    for (let x = holeL - 1; x >= 0; x--) {
      const i = idx(x, bottom)
      if (g[i] !== EMPTY && g[idx(x + 1, bottom)] === EMPTY) {
        g[idx(x + 1, bottom)] = g[i]
        g[i] = EMPTY
      }
    }
    for (let x = holeR + 1; x < GRID; x++) {
      const i = idx(x, bottom)
      if (g[i] !== EMPTY && g[idx(x - 1, bottom)] === EMPTY) {
        g[idx(x - 1, bottom)] = g[i]
        g[i] = EMPTY
      }
    }
  }

  // Falling pass, bottom-up so a grain settles into the row below before that row is
  // scanned. Alternate the horizontal scan direction per row to avoid a drift bias.
  // The bottom row is owned by the drain step above, so skip it while draining.
  for (let y = GRID - 1; y >= 0; y--) {
    if (mode === 'drain' && y === GRID - 1) continue
    const ltr = y % 2 === 0
    for (let k = 0; k < GRID; k++) {
      const x = ltr ? k : GRID - 1 - k
      const i = idx(x, y)
      if (moved[i]) continue
      const m = g[i]
      // Empty, rising steam, and frozen violet never fall here.
      if (m === EMPTY || m === STEAM || m === VIOLET) continue

      if (m === SAND) {
        // Straight down, sinking through water; else slide diagonally down.
        if (y + 1 < GRID) {
          const below = idx(x, y + 1)
          if (g[below] === EMPTY || g[below] === WATER) {
            swap(i, below)
            continue
          }
          const order = Math.random() < 0.5 ? [-1, 1] : [1, -1]
          let done = false
          for (const dx of order) {
            const nx = x + dx
            if (nx < 0 || nx >= GRID) continue
            const j = idx(nx, y + 1)
            if (g[j] === EMPTY || g[j] === WATER) {
              swap(i, j)
              done = true
              break
            }
          }
          if (done) continue
          // Angle of repose: occasionally tumble sideways onto a lower neighbour, so
          // slopes relax loosely over time instead of freezing wherever a grain lands.
          // (Only reached above the floor, so a flat bed never spreads out like water.)
          if (Math.random() < SAND_SLIDE) {
            for (const dx of order) {
              const nx = x + dx
              if (nx < 0 || nx >= GRID) continue
              if (g[idx(nx, y)] === EMPTY) {
                swap(i, idx(nx, y))
                break
              }
            }
          }
        }
      } else if (m === WATER) {
        // Water: down, then diagonally down, then spread sideways into a flat pool.
        if (y + 1 < GRID && g[idx(x, y + 1)] === EMPTY) {
          swap(i, idx(x, y + 1))
          continue
        }
        const order = Math.random() < 0.5 ? [-1, 1] : [1, -1]
        let done = false
        if (y + 1 < GRID) {
          for (const dx of order) {
            const nx = x + dx
            if (nx < 0 || nx >= GRID) continue
            const j = idx(nx, y + 1)
            if (g[j] === EMPTY) {
              swap(i, j)
              done = true
              break
            }
          }
        }
        if (done) continue
        for (const dx of order) {
          const nx = x + dx
          if (nx < 0 || nx >= GRID) continue
          const j = idx(nx, y)
          if (g[j] === EMPTY) {
            swap(i, j)
            break
          }
        }
      } else if (m === LAVA) {
        // Molten rock falls like sand, into empty space only; it burns where it lands.
        if (y + 1 < GRID) {
          if (g[idx(x, y + 1)] === EMPTY) {
            swap(i, idx(x, y + 1))
            continue
          }
          const order = Math.random() < 0.5 ? [-1, 1] : [1, -1]
          for (const dx of order) {
            const nx = x + dx
            if (nx >= 0 && nx < GRID && g[idx(nx, y + 1)] === EMPTY) {
              swap(i, idx(nx, y + 1))
              break
            }
          }
        }
      }
    }
  }

  // Rising pass, top-down so a wisp settles into the row above before it is scanned.
  // Steam off evaporated water floats up and fades.
  for (let y = 0; y < GRID; y++) {
    for (let x = 0; x < GRID; x++) {
      const i = idx(x, y)
      if (moved[i] || g[i] !== STEAM) continue
      if (Math.random() < STEAM_DECAY || y === 0) {
        g[i] = EMPTY
        continue
      }
      if (g[idx(x, y - 1)] === EMPTY) {
        swap(i, idx(x, y - 1))
        continue
      }
      const order = Math.random() < 0.5 ? [-1, 1] : [1, -1]
      for (const dx of order) {
        const nx = x + dx
        if (nx < 0 || nx >= GRID) continue
        const j = idx(nx, y - 1)
        if (g[j] === EMPTY) {
          swap(i, j)
          break
        }
      }
    }
  }

  // Lava pass: resting lava evaporates the water it touches (into a rising steam wisp)
  // and ignites the sand it touches (handing each lit grain one less fuel, so a burn
  // fizzles after a few grains). A grain that burns something dies the same tick; a
  // spent grain cools; one that landed on bare ground and touched nothing yet lingers,
  // glowing, until it finds fuel or slowly fizzles. Newly lit grains are marked moved,
  // so a burn advances one ring per tick rather than all at once.
  for (let y = 0; y < GRID; y++) {
    for (let x = 0; x < GRID; x++) {
      const i = idx(x, y)
      if (moved[i] || g[i] !== LAVA) continue
      const h = heat[i]
      let acted = false
      for (const [nx, ny] of [
        [x, y - 1],
        [x, y + 1],
        [x - 1, y],
        [x + 1, y],
        [x - 1, y - 1],
        [x + 1, y - 1],
        [x - 1, y + 1],
        [x + 1, y + 1],
      ]) {
        if (nx < 0 || nx >= GRID || ny < 0 || ny >= GRID) continue
        const j = idx(nx, ny)
        if (g[j] === WATER) {
          g[j] = STEAM // flashes to a rising steam wisp
          acted = true
        } else if (g[j] === VIOLET) {
          // Melt through the infection: the new lava keeps FULL fuel (regardless of
          // this grain's own), so the front never loses steam and burns through all the
          // connected violet rather than fizzling after a few cells.
          g[j] = LAVA
          heat[j] = LAVA_FUEL
          moved[j] = 1
          acted = true
        } else if (g[j] === SAND && h > 1) {
          // Sand burns are bounded — each lit grain gets one less fuel, so it craters.
          g[j] = LAVA
          heat[j] = h - 1
          moved[j] = 1
          acted = true
        }
      }
      // Burned something → done; spent → cool; idle but still fuelled → linger, fizzling
      // only by chance, so it survives to meet sand the wandering stream missed.
      if (acted || h <= 1 || Math.random() < LAVA_DECAY) {
        g[i] = EMPTY
        heat[i] = 0
      }
    }
  }

  // Violet pass: the infection. A violet grain now and then turns one grain it touches
  // violet too — and frozen, since violet never moves in the falling pass. It can only
  // jump to a grain (not across empty space), so it creeps through the material in
  // branching tendrils, gradually filling the mass. Picking a single random neighbour
  // (and marking it moved) keeps the front ragged and advances it a step at a time.
  for (let y = 0; y < GRID; y++) {
    for (let x = 0; x < GRID; x++) {
      const i = idx(x, y)
      if (moved[i] || g[i] !== VIOLET) continue
      if (Math.random() >= VIOLET_SPREAD) continue
      const cands: number[] = []
      for (const [nx, ny] of [
        [x, y - 1],
        [x, y + 1],
        [x - 1, y],
        [x + 1, y],
        [x - 1, y - 1],
        [x + 1, y - 1],
        [x - 1, y + 1],
        [x + 1, y + 1],
      ]) {
        // Stay below the ceiling (clear of the stream); infect only sand and water —
        // lava is too hot to freeze and burns the infection instead.
        if (nx < 0 || nx >= GRID || ny < VIOLET_TOP || ny >= GRID) continue
        const t = g[idx(nx, ny)]
        if (t === SAND || t === WATER) cands.push(idx(nx, ny))
      }
      if (cands.length > 0) {
        const j = cands[Math.floor(Math.random() * cands.length)]
        g[j] = VIOLET
        heat[j] = 0
        moved[j] = 1
      }
    }
  }

  return {
    grid: g,
    heat,
    mode,
    emitX,
    emitV,
    streamMat,
    streamLeft,
    ticks,
    drains,
  }
}

export default function FallingSand() {
  // Mutable sim state in a ref (lazy-initialised once per mount); a fresh mount after
  // unmount reseeds the box, matching the runtime's reset-on-unmount.
  const sim = useRef<Sim | null>(null)
  if (sim.current === null) sim.current = newSim()
  const [, render] = useReducer((n: number) => n + 1, 0)

  useThingyInterval(() => {
    sim.current = step(sim.current as Sim)
    render()
  }, STEP_MS)

  // Reduced motion never ticks, so the sim would sit forever on the empty opening box.
  // Swap in a representative still once on mount instead, so those visitors see the
  // idea — a pond pooled in a hollow of sand — rather than a blank square.
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      sim.current = { ...(sim.current as Sim), grid: staticScene() }
      render()
    }
  }, [])

  const g = sim.current.grid
  const size = CELL - INSET * 2

  // Render only the grains that exist, keyed by their cell, so the DOM tracks the
  // amount of sand. No transition — grains snap between cells, the crisp old look.
  const grains = []
  for (let i = 0; i < g.length; i++) {
    const m = g[i]
    if (m === EMPTY) continue
    grains.push(
      <rect
        key={i}
        className={MATERIAL_CLASS[m]}
        x={(i % GRID) * CELL + INSET}
        y={Math.floor(i / GRID) * CELL + INSET}
        width={size}
        height={size}
        rx={size * 0.2}
        fill="currentColor"
        opacity={MATERIAL_OPACITY[m]}
      />
    )
  }

  return (
    <svg
      viewBox="0 0 100 100"
      className="h-full w-full text-foreground"
      aria-hidden="true"
    >
      {grains}
    </svg>
  )
}
