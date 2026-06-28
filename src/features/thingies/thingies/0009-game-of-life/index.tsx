'use client'

import { useReducer, useRef } from 'react'
import { useThingyInterval } from '../../hooks/use-thingy-interval'

/**
 * Conway's Game of Life on a wrapping (toroidal) grid, so patterns drift off one
 * edge and re-enter the other instead of dying at a wall. The step clock is
 * `useThingyInterval`, so the simulation freezes while the tile is off-screen or the
 * tab is hidden and resumes mid-generation on return; panning far enough to unmount
 * seeds a fresh soup. When the board goes extinct, settles, or falls into a short
 * cycle (and as a long-run backstop) it reseeds itself, so it never stalls. Drawn on
 * a 0–100 viewBox so it scales with the tile; living cells are ink, cells born this
 * generation pop rose as a minority birth accent, and births/deaths cross-fade
 * (motion-safe) so the board eases between generations instead of snapping. Reduced
 * motion sees the static opening seed (the interval simply never ticks). Tile
 * contract: ../README.md.
 */

/** Cells per side. */
const GRID = 16
/** Cell edge in viewBox units. */
const CELL = 100 / GRID
/** Generation cadence in ms — slow enough to read each step; the cross-fade below
 * (~2s) smooths the transition between them. */
const STEP_MS = 3000
/** Seam inset so live cells read as separate rounded squares. */
const INSET = CELL * 0.1
/** Live fraction of a fresh random seed. */
const DENSITY = 0.36
/** Reseed if the board repeats any state within this many recent generations. */
const HISTORY = 12
/** Reseed once a round has run this long, so even long oscillators stay fresh. */
const MAX_GEN = 360

type Game = { grid: Uint8Array; born: number[]; gen: number; history: number[] }

const index = (x: number, y: number) => y * GRID + x

function seed(): Uint8Array {
  const grid = new Uint8Array(GRID * GRID)
  for (let i = 0; i < grid.length; i++)
    grid[i] = Math.random() < DENSITY ? 1 : 0
  return grid
}

/** FNV-1a over the cells — a compact fingerprint for cycle detection. */
function hash(grid: Uint8Array): number {
  let h = 2166136261
  for (let i = 0; i < grid.length; i++) {
    h ^= grid[i]
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

/** One Conway generation with toroidal wrapping; tracks cells born this step. */
function nextGrid(grid: Uint8Array): { grid: Uint8Array; born: number[] } {
  const next = new Uint8Array(GRID * GRID)
  const born: number[] = []
  for (let y = 0; y < GRID; y++) {
    for (let x = 0; x < GRID; x++) {
      let n = 0
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          if (dx === 0 && dy === 0) continue
          const nx = (x + dx + GRID) % GRID
          const ny = (y + dy + GRID) % GRID
          n += grid[index(nx, ny)]
        }
      }
      const i = index(x, y)
      const alive = grid[i] === 1
      if (alive ? n === 2 || n === 3 : n === 3) {
        next[i] = 1
        if (!alive) born.push(i)
      }
    }
  }
  return { grid: next, born }
}

function newGame(): Game {
  const grid = seed()
  return { grid, born: [], gen: 0, history: [hash(grid)] }
}

function advance(g: Game): Game {
  const { grid, born } = nextGrid(g.grid)
  let pop = 0
  for (let i = 0; i < grid.length; i++) pop += grid[i]
  const h = hash(grid)
  // Reseed on extinction, on a cycle within recent history (still lifes, blinkers,
  // short oscillators), or once a round has run long enough.
  if (pop === 0 || g.history.includes(h) || g.gen >= MAX_GEN) return newGame()
  return {
    grid,
    born,
    gen: g.gen + 1,
    history: [h, ...g.history].slice(0, HISTORY),
  }
}

export default function GameOfLife() {
  // Mutable game state in a ref (lazy-initialised once per mount); a fresh mount
  // after unmount seeds a new soup, matching the runtime's reset-on-unmount.
  const game = useRef<Game | null>(null)
  if (game.current === null) game.current = newGame()
  const [, render] = useReducer((n: number) => n + 1, 0)

  useThingyInterval(() => {
    game.current = advance(game.current as Game)
    render()
  }, STEP_MS)

  const g = game.current
  const bornSet = new Set(g.born)
  const size = CELL - INSET * 2

  // Render every cell as a persistent rect, keyed by its fixed grid position, and
  // toggle opacity between 0 and alive rather than adding/removing nodes — a removed
  // node can't fade. The motion-safe transition then cross-fades births and deaths
  // (and the rose→ink colour settle) instead of snapping.
  const positions = Array.from({ length: GRID * GRID }, (_, i) => i)
  return (
    <svg
      viewBox="0 0 100 100"
      className="h-full w-full text-foreground"
      aria-hidden="true"
    >
      {positions.map((i) => {
        const alive = g.grid[i] === 1
        const isBorn = bornSet.has(i)
        return (
          <rect
            key={i}
            className={`motion-safe:transition motion-safe:duration-2000 motion-safe:ease-out ${
              isBorn ? 'text-thingy-rose' : 'text-foreground'
            }`}
            x={(i % GRID) * CELL + INSET}
            y={Math.floor(i / GRID) * CELL + INSET}
            width={size}
            height={size}
            rx={size * 0.25}
            fill="currentColor"
            opacity={alive ? (isBorn ? 1 : 0.8) : 0}
          />
        )
      })}
    </svg>
  )
}
