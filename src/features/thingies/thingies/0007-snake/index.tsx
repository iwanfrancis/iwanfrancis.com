'use client'

import { useReducer, useRef } from 'react'
import { useThingyInterval } from '../../hooks/use-thingy-interval'

/**
 * A self-playing snake — the reference tile for the JS-loop runtime. A greedy AI
 * steers the snake toward the food, growing when it eats and starting a fresh round
 * if it traps itself. The step clock is `useThingyInterval`, so the whole game
 * freezes while the tile is off-screen or the tab is hidden and resumes mid-round
 * on return; panning far enough to unmount restarts it. Decorative and
 * non-interactive; drawn on a 0–100 viewBox so it scales with the tile. Reduced
 * motion sees the static opening position (the interval simply never ticks).
 */

type Cell = { x: number; y: number }
type Game = { snake: Cell[]; dir: Cell; food: Cell }

/** Cells per side. Odd, so the snake starts centred on a cell. */
const GRID = 11
/** Cell edge in viewBox units. */
const CELL = 100 / GRID
/** Step cadence in ms — one cell per tick. */
const STEP_MS = 160
/** Seam inset so adjacent segments read as separate, scaled rounded squares. */
const INSET = CELL * 0.12

const DIRS: Cell[] = [
  { x: 1, y: 0 },
  { x: -1, y: 0 },
  { x: 0, y: 1 },
  { x: 0, y: -1 },
]

const cellKey = (c: Cell) => `${c.x},${c.y}`

function spawnFood(snake: Cell[]): Cell {
  const taken = new Set(snake.map(cellKey))
  const free: Cell[] = []
  for (let x = 0; x < GRID; x++) {
    for (let y = 0; y < GRID; y++) {
      if (!taken.has(`${x},${y}`)) free.push({ x, y })
    }
  }
  // The board is never full at this size, but guard against an empty pick anyway.
  return free.length
    ? free[Math.floor(Math.random() * free.length)]
    : { x: 0, y: 0 }
}

function newGame(): Game {
  const mid = Math.floor(GRID / 2)
  const snake: Cell[] = [
    { x: mid + 1, y: mid },
    { x: mid, y: mid },
    { x: mid - 1, y: mid },
    { x: mid - 2, y: mid },
  ]
  return { snake, dir: { x: 1, y: 0 }, food: spawnFood(snake) }
}

function step(g: Game): Game {
  const head = g.snake[0]
  const tail = g.snake[g.snake.length - 1]
  const body = new Set(g.snake.map(cellKey))
  const dist = (d: Cell) =>
    Math.abs(head.x + d.x - g.food.x) + Math.abs(head.y + d.y - g.food.y)

  const safe = DIRS.filter((d) => {
    if (d.x === -g.dir.x && d.y === -g.dir.y) return false // never reverse
    const nx = head.x + d.x
    const ny = head.y + d.y
    if (nx < 0 || ny < 0 || nx >= GRID || ny >= GRID) return false
    const k = `${nx},${ny}`
    if (k === cellKey(g.food)) return true // about to eat
    if (k === cellKey(tail)) return true // tail vacates this cell as we move
    return !body.has(k)
  })
  if (safe.length === 0) return newGame() // trapped — start a fresh round

  // Greedy toward the food; ties keep the current heading so motion reads smoothly.
  safe.sort((a, b) => {
    const byDist = dist(a) - dist(b)
    if (byDist !== 0) return byDist
    const straight = (d: Cell) => (d.x === g.dir.x && d.y === g.dir.y ? 0 : 1)
    return straight(a) - straight(b)
  })

  const dir = safe[0]
  const next: Cell = { x: head.x + dir.x, y: head.y + dir.y }
  const ate = cellKey(next) === cellKey(g.food)
  const snake = ate ? [next, ...g.snake] : [next, ...g.snake.slice(0, -1)]
  return { snake, dir, food: ate ? spawnFood(snake) : g.food }
}

export default function Snake() {
  // Mutable game state in a ref (lazy-initialised once per mount); a fresh mount
  // after unmount starts a new round, matching the runtime's reset-on-unmount.
  const game = useRef<Game | null>(null)
  if (game.current === null) game.current = newGame()
  const [, render] = useReducer((n: number) => n + 1, 0)

  useThingyInterval(() => {
    game.current = step(game.current as Game)
    render()
  }, STEP_MS)

  const g = game.current
  const seg = CELL - INSET * 2

  return (
    <svg
      viewBox="0 0 100 100"
      className="h-full w-full text-foreground"
      aria-hidden="true"
    >
      {g.snake.map((c, i) => (
        <rect
          key={cellKey(c)}
          x={c.x * CELL + INSET}
          y={c.y * CELL + INSET}
          width={seg}
          height={seg}
          rx={seg * 0.3}
          fill="currentColor"
          opacity={i === 0 ? 1 : 0.65}
        />
      ))}
      {/* food — the single rose accent in an otherwise ink tile */}
      <circle
        className="text-thingy-rose"
        cx={g.food.x * CELL + CELL / 2}
        cy={g.food.y * CELL + CELL / 2}
        r={CELL * 0.3}
        fill="currentColor"
      />
    </svg>
  )
}
