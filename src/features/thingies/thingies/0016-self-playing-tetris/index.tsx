'use client'

import { useEffect, useReducer, useRef } from 'react'
import { useThingyInterval } from '../../hooks/use-thingy-interval'

/**
 * Self-playing tetris — a 10×18 well with a next-piece preview and a line meter,
 * played by an AI that scores every drop (the classic height / holes / bumpiness
 * heuristic) looking one piece ahead. It stacks while holding the right-hand
 * column open, then drops an I down it for a four-line clear; once the stack gets
 * tall, or junk lands in that column, it plays safe and clears what it can. Each piece lines up (rotate, then
 * slide) at half gravity, then soft-drops. Cleared rows flash rose — the single
 * accent — before they collapse. Pieces come from a 7-bag; topping out starts a
 * fresh game.
 *
 * The clock is `useThingyInterval`, so the game freezes while the tile is
 * off-screen or the tab is hidden and resumes mid-drop on return; panning far
 * enough to unmount starts a new game. Drawn on a 0–100 viewBox so it scales with
 * the tile. Reduced motion, which never ticks, sees a still of a real mid-game
 * stack (pieces played instantly) with the next piece hovering above its spot. Tile contract: ../README.md.
 */

type Cell = { x: number; y: number }
type Piece = { type: number; rot: number; x: number; y: number }
type Action = 'cw' | 'ccw' | 'left' | 'right'
type Game = {
  /** Locked cells, row-major; 0 is empty, otherwise the piece type + 1. */
  board: Uint8Array
  piece: Piece
  next: number
  bag: number[]
  /** Moves still to make to reach the AI's chosen spot. */
  plan: Action[]
  /** Full rows flashing before they collapse; the piece is hidden meanwhile. */
  clearing: number[]
  clearTicks: number
  lines: number
  tick: number
}

const COLS = 10
const ROWS = 18
/** Cell edge in viewBox units. */
const CELL = 5
/** Top-left of the well's interior. */
const WELL_X = 11
const WELL_Y = 4
/** Wall stroke width. */
const WALL = 3
/** Seam inset so blocks read as separate rounded squares. */
const INSET = CELL * 0.1
/** Centre of the next-piece preview, right of the well. */
const PREVIEW_X = 82
const PREVIEW_Y = 12
/** Step cadence in ms. */
const STEP_MS = 60
/** How long cleared rows flash before they collapse, in ticks. */
const CLEAR_TICKS = 6
/** Stack height at which the AI stops holding the well open and plays safe. */
const DANGER = 10
/** The reduced-motion still plays pieces instantly until the stack is this tall
 * (or the cap runs out), so it never shows a near-empty well. */
const STILL_HEIGHT = 6
const STILL_MAX_PIECES = 40
/** The column kept open for four-line clears. */
const WELL = COLS - 1
/** Line-meter pip slots, bottom to top. */
const PIPS = Array.from({ length: 10 }, (_, i) => i)

/** Tetrominoes in their rotation boxes: I, O, T, S, Z, J, L. */
const SHAPES = [
  ['....', '####', '....', '....'],
  ['##', '##'],
  ['.#.', '###', '...'],
  ['.##', '##.', '...'],
  ['##.', '.##', '...'],
  ['#..', '###', '...'],
  ['..#', '###', '...'],
]

/** Locked-block opacity per piece type, so the stack keeps a little texture. */
const OPACITY = [0.8, 0.6, 0.7, 0.55, 0.65, 0.75, 0.6]

/** Every rotation of every piece, turning clockwise within its box. */
const ROTATIONS: Cell[][][] = SHAPES.map((rows) => {
  const n = rows.length
  let cells: Cell[] = []
  rows.forEach((row, y) => {
    for (let x = 0; x < n; x++) if (row[x] === '#') cells.push({ x, y })
  })
  const rots = [cells]
  for (let r = 1; r < 4; r++) {
    cells = cells.map(({ x, y }) => ({ x: n - 1 - y, y: x }))
    rots.push(cells)
  }
  return rots
})

const idx = (x: number, y: number) => y * COLS + x

const cellsOf = (p: Piece): Cell[] =>
  ROTATIONS[p.type][p.rot].map((c) => ({ x: p.x + c.x, y: p.y + c.y }))

/** In bounds and clear of the stack; cells above the top edge are allowed. */
function fits(board: Uint8Array, p: Piece): boolean {
  return cellsOf(p).every(
    ({ x, y }) =>
      x >= 0 && x < COLS && y < ROWS && (y < 0 || board[idx(x, y)] === 0)
  )
}

/** A new piece, centred with its top row on the top edge. */
function spawn(type: number): Piece {
  const top = Math.min(...ROTATIONS[type][0].map((c) => c.y))
  return {
    type,
    rot: 0,
    x: Math.floor((COLS - SHAPES[type].length) / 2),
    y: -top,
  }
}

/** Next piece from a shuffled 7-bag, refilling when it runs dry. */
function draw(bag: number[]): number {
  if (bag.length === 0) {
    bag.push(0, 1, 2, 3, 4, 5, 6)
    for (let i = bag.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[bag[i], bag[j]] = [bag[j], bag[i]]
    }
  }
  return bag.pop() as number
}

function fullRows(board: Uint8Array): number[] {
  const rows: number[] = []
  for (let y = 0; y < ROWS; y++) {
    let full = true
    for (let x = 0; x < COLS && full; x++) full = board[idx(x, y)] !== 0
    if (full) rows.push(y)
  }
  return rows
}

/** Remove `rows` in place, dropping everything above them down. */
function collapse(board: Uint8Array, rows: number[]): void {
  let write = ROWS - 1
  for (let y = ROWS - 1; y >= 0; y--) {
    if (rows.includes(y)) continue
    if (write !== y) board.copyWithin(write * COLS, y * COLS, (y + 1) * COLS)
    write--
  }
  board.fill(0, 0, (write + 1) * COLS)
}

/** Column heights and the count of covered empty cells (holes). */
function profile(board: Uint8Array): { heights: number[]; holes: number } {
  const heights: number[] = []
  let holes = 0
  for (let x = 0; x < COLS; x++) {
    let h = 0
    for (let y = 0; y < ROWS; y++) {
      if (board[idx(x, y)] !== 0) {
        if (h === 0) h = ROWS - y
      } else if (h > 0) holes++
    }
    heights.push(h)
  }
  return { heights, holes }
}

/** Every resting spot a straight drop can reach, over all rotations. */
function drops(board: Uint8Array, type: number): Piece[] {
  const start = spawn(type)
  const spots: Piece[] = []
  for (let rot = 0; rot < 4; rot++) {
    for (let x = -2; x < COLS; x++) {
      const p = { ...start, rot, x }
      if (!fits(board, p)) continue
      while (fits(board, { ...p, y: p.y + 1 })) p.y++
      spots.push(p)
    }
  }
  return spots
}

type Outcome = { board: Uint8Array; lines: number; fouls: number }

/**
 * Lock `p` into a copy of the board and clear its rows; null if it would top
 * out. A foul is any use of the well that falls short of a four-line clear.
 */
function place(board: Uint8Array, p: Piece): Outcome | null {
  const b = board.slice()
  let inWell = false
  for (const { x, y } of cellsOf(p)) {
    if (y < 0) return null
    b[idx(x, y)] = p.type + 1
    if (x === WELL) inWell = true
  }
  const full = fullRows(b)
  collapse(b, full)
  return {
    board: b,
    lines: full.length,
    fouls: inWell && full.length < 4 ? 1 : 0,
  }
}

/** Score a resulting board; higher is better. */
function evaluate({ board, lines, fouls }: Outcome, building: boolean): number {
  const { heights, holes } = profile(board)
  let height = 0
  let bumps = 0
  for (let x = 0; x < COLS; x++) {
    height += heights[x]
    // While building, the open well is meant to be a cliff — don't count it.
    if (x + 1 < COLS && !(building && x + 1 === WELL))
      bumps += Math.abs(heights[x] - heights[x + 1])
  }
  return (
    -0.51 * height +
    0.76 * lines -
    1.5 * holes -
    0.18 * bumps -
    (building ? 50 * fouls : 0)
  )
}

/**
 * The AI's pick for `type`, looking one piece ahead: each spot is scored by the
 * best follow-up for `next`. It holds the well open while the well is empty and
 * the stack is low. Null when every spot tops out.
 */
function bestPlacement(
  board: Uint8Array,
  type: number,
  next: number
): Piece | null {
  const { heights } = profile(board)
  const building = heights[WELL] === 0 && Math.max(...heights) < DANGER
  let best: Piece | null = null
  let bestScore = -Infinity
  for (const p of drops(board, type)) {
    const a = place(board, p)
    if (!a) continue
    for (const q of drops(a.board, next)) {
      const b = place(a.board, q)
      if (!b) continue
      const score = evaluate(
        { board: b.board, lines: a.lines + b.lines, fouls: a.fouls + b.fouls },
        building
      )
      if (score > bestScore) {
        best = p
        bestScore = score
      }
    }
  }
  return best
}

/** Rotate first (one counter-clockwise turn beats three clockwise), then slide. */
function planFor(from: Piece, to: Piece): Action[] {
  const plan: Action[] =
    to.rot === 3 ? ['ccw'] : Array.from({ length: to.rot }, () => 'cw')
  const dx = to.x - from.x
  for (let i = 0; i < Math.abs(dx); i++) plan.push(dx > 0 ? 'right' : 'left')
  return plan
}

function act(p: Piece, a: Action): Piece {
  if (a === 'cw') return { ...p, rot: (p.rot + 1) % 4 }
  if (a === 'ccw') return { ...p, rot: (p.rot + 3) % 4 }
  return { ...p, x: p.x + (a === 'right' ? 1 : -1) }
}

/** Bring on the next piece and plan its moves; a blocked spawn is a top-out. */
function spawnNext(g: Game): Game {
  g.piece = spawn(g.next)
  g.next = draw(g.bag)
  if (!fits(g.board, g.piece)) return newGame()
  const target = bestPlacement(g.board, g.piece.type, g.next)
  g.plan = target ? planFor(g.piece, target) : []
  return g
}

function newGame(): Game {
  const bag: number[] = []
  const first = draw(bag)
  return spawnNext({
    board: new Uint8Array(COLS * ROWS),
    piece: spawn(first),
    next: first,
    bag,
    plan: [],
    clearing: [],
    clearTicks: 0,
    lines: 0,
    tick: 0,
  })
}

/** Lock the piece into the stack, then flash any full rows or spawn the next. */
function lock(g: Game): Game {
  for (const { x, y } of cellsOf(g.piece)) {
    if (y < 0) return newGame() // locked above the top edge — topped out
    g.board[idx(x, y)] = g.piece.type + 1
  }
  const full = fullRows(g.board)
  if (full.length === 0) return spawnNext(g)
  g.clearing = full
  g.clearTicks = CLEAR_TICKS
  return g
}

/** Advance one tick in place, returning the (mutated) game. */
function step(g: Game): Game {
  g.tick++
  if (g.clearing.length > 0) {
    if (--g.clearTicks > 0) return g
    collapse(g.board, g.clearing)
    g.lines += g.clearing.length
    g.clearing = []
    return spawnNext(g)
  }
  const a = g.plan.shift()
  if (a) {
    const moved = act(g.piece, a)
    // Blocked on the way (the stack got in the path) — abandon the plan and let
    // it fall where it is, like a fumbled move.
    if (fits(g.board, moved)) g.piece = moved
    else g.plan = []
  }
  // Half gravity while lining up, then soft-drop every tick.
  if (g.plan.length > 0 && g.tick % 2 === 1) return g
  const down = { ...g.piece, y: g.piece.y + 1 }
  if (!fits(g.board, down)) return lock(g)
  g.piece = down
  return g
}

/**
 * A real mid-game still for reduced motion: play pieces instantly (rows clear on
 * the spot) until the stack has some height, then hover the next piece a few
 * rows above where the AI means to drop it.
 */
function staticScene(): Game {
  let g = newGame()
  for (let i = 0; i < STILL_MAX_PIECES; i++) {
    if (Math.max(...profile(g.board).heights) >= STILL_HEIGHT) break
    const target = bestPlacement(g.board, g.piece.type, g.next)
    const out = target && place(g.board, target)
    if (!out) break
    g.board = out.board
    g.lines += out.lines
    g = spawnNext(g)
  }
  const target = bestPlacement(g.board, g.piece.type, g.next)
  if (target) g.piece = { ...target, y: g.piece.y + 3 }
  g.plan = []
  return g
}

export default function SelfPlayingTetris() {
  // Mutable game state in a ref (lazy-initialised once per mount); a fresh mount
  // after unmount starts a new game, matching the runtime's reset-on-unmount.
  const game = useRef<Game | null>(null)
  if (game.current === null) game.current = newGame()
  const [, render] = useReducer((n: number) => n + 1, 0)

  useThingyInterval(() => {
    game.current = step(game.current as Game)
    render()
  }, STEP_MS)

  // Reduced motion never ticks, so the game would sit on its opening drop. Swap
  // in a mid-game still once on mount instead.
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      game.current = staticScene()
      render()
    }
  }, [])

  const g = game.current
  const size = CELL - INSET * 2
  const block = (x: number, y: number) => ({
    x: x + INSET,
    y: y + INSET,
    width: size,
    height: size,
    rx: size * 0.25,
    fill: 'currentColor',
  })

  const stack = []
  for (let i = 0; i < g.board.length; i++) {
    const t = g.board[i]
    if (t === 0) continue
    const y = Math.floor(i / COLS)
    const flash = g.clearing.includes(y)
    stack.push(
      <rect
        key={i}
        className={flash ? 'text-thingy-rose' : undefined}
        {...block(WELL_X + (i % COLS) * CELL, WELL_Y + y * CELL)}
        opacity={flash ? 1 : OPACITY[t - 1]}
      />
    )
  }

  // The falling piece, hidden while rows flash (it's already in the stack).
  const falling =
    g.clearing.length > 0
      ? []
      : cellsOf(g.piece)
          .filter((c) => c.y >= 0)
          .map((c) => (
            <rect
              key={`p${c.x},${c.y}`}
              {...block(WELL_X + c.x * CELL, WELL_Y + c.y * CELL)}
            />
          ))

  // The next piece, centred on the preview point.
  const nextCells = ROTATIONS[g.next][0]
  const xs = nextCells.map((c) => c.x)
  const ys = nextCells.map((c) => c.y)
  const ox = PREVIEW_X - ((Math.min(...xs) + Math.max(...xs) + 1) * CELL) / 2
  const oy = PREVIEW_Y - ((Math.min(...ys) + Math.max(...ys) + 1) * CELL) / 2

  // Line meter: ten pips stacked up from the floor, one lit per line cleared.
  const lit = g.lines % PIPS.length
  const floor = WELL_Y + ROWS * CELL

  return (
    <svg
      viewBox="0 0 100 100"
      className="h-full w-full text-foreground"
      aria-hidden="true"
    >
      <path
        d={`M${WELL_X - WALL / 2} ${WELL_Y}V${floor + WALL / 2}H${
          WELL_X + COLS * CELL + WALL / 2
        }V${WELL_Y}`}
        fill="none"
        stroke="currentColor"
        strokeWidth={WALL}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {stack}
      {falling}
      {nextCells.map((c) => (
        <rect
          key={`n${c.x},${c.y}`}
          {...block(ox + c.x * CELL, oy + c.y * CELL)}
          opacity={OPACITY[g.next]}
        />
      ))}
      {PIPS.map((i) => (
        <rect
          key={`m${i}`}
          {...block(PREVIEW_X - CELL / 2, floor - (i + 1) * CELL)}
          opacity={i < lit ? 0.8 : 0.15}
        />
      ))}
    </svg>
  )
}
