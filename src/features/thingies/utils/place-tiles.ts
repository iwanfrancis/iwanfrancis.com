import { cellNoise } from './prng'

export type Cell = { col: number; row: number }

/**
 * Amoeba dial. Jitter is added to each candidate's filled-neighbour count, so a
 * higher value lets lower-neighbour (edge-extending) cells occasionally win —
 * making the blob lobed and ragged rather than a tidy disc. Tuned "middle,
 * leaning amoeba". The filled-neighbour bias keeps the blob dense (no spindly
 * arms); the gap-free guard (below) keeps it hole-free.
 */
const JITTER = 5

const N4: ReadonlyArray<readonly [number, number]> = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
]
const N8: ReadonlyArray<readonly [number, number]> = [
  ...N4,
  [1, 1],
  [1, -1],
  [-1, 1],
  [-1, -1],
]

const key = (col: number, row: number) => `${col},${row}`

/**
 * Deterministically place `count` tiles on a square lattice as a single
 * edge-connected, gap-free blob that grows outward from the origin.
 *
 * Placement is a pure function of `count`: tile i's cell depends only on tiles
 * 0..i-1, so appending a tile never moves an existing one. The result reads as a
 * solid, ragged-edged amoeba — never a spiral, rows, or scattered islands.
 */
export function placeTiles(count: number): Cell[] {
  if (count <= 0) return []
  const occupied = new Set<string>([key(0, 0)])
  const cells: Cell[] = [{ col: 0, row: 0 }]
  for (let i = 1; i < count; i++) {
    const next = chooseCell(occupied)
    occupied.add(key(next.col, next.row))
    cells.push(next)
  }
  return cells
}

/** The highest-scoring frontier cell that doesn't seal off a gap. */
function chooseCell(occupied: Set<string>): Cell {
  const candidates = frontier(occupied)
  candidates.sort(
    (a, b) =>
      score(b, occupied) - score(a, occupied) || a.col - b.col || a.row - b.row
  )
  for (const cell of candidates) {
    if (!enclosesGap(occupied, cell)) return cell
  }
  // The outermost frontier never traps anything, so this is unreachable in
  // practice; fall back to the top candidate rather than throwing.
  return candidates[0]
}

/** Empty cells sharing a full edge with the occupied set. */
function frontier(occupied: Set<string>): Cell[] {
  const seen = new Set<string>()
  const cells: Cell[] = []
  for (const k of occupied) {
    const [col, row] = k.split(',').map(Number)
    for (const [dc, dr] of N4) {
      const nc = col + dc
      const nr = row + dr
      const nk = key(nc, nr)
      if (occupied.has(nk) || seen.has(nk)) continue
      seen.add(nk)
      cells.push({ col: nc, row: nr })
    }
  }
  return cells
}

/** Filled (8-)neighbour count plus deterministic jitter. */
function score(cell: Cell, occupied: Set<string>): number {
  let filled = 0
  for (const [dc, dr] of N8) {
    if (occupied.has(key(cell.col + dc, cell.row + dr))) filled++
  }
  return filled + JITTER * cellNoise(cell.col, cell.row)
}

/**
 * Would placing `cand` enclose any empty region? An empty cell is enclosed
 * unless it can reach outside the blob through edge-adjacent (4-connected) empty
 * cells — so a diagonal-only escape counts as enclosed. Any region newly sealed
 * by `cand` must touch `cand`, so we only flood-fill from `cand`'s empty
 * neighbours, bounded to the blob's bounding box + 1.
 */
function enclosesGap(occupied: Set<string>, cand: Cell): boolean {
  const filled = new Set(occupied)
  filled.add(key(cand.col, cand.row))

  let minC = Infinity
  let maxC = -Infinity
  let minR = Infinity
  let maxR = -Infinity
  for (const k of filled) {
    const [col, row] = k.split(',').map(Number)
    if (col < minC) minC = col
    if (col > maxC) maxC = col
    if (row < minR) minR = row
    if (row > maxR) maxR = row
  }
  const bounds = {
    minC: minC - 1,
    maxC: maxC + 1,
    minR: minR - 1,
    maxR: maxR + 1,
  }

  for (const [dc, dr] of N4) {
    const sc = cand.col + dc
    const sr = cand.row + dr
    if (filled.has(key(sc, sr))) continue
    if (!reachesOutside(sc, sr, filled, bounds)) return true
  }
  return false
}

type Bounds = { minC: number; maxC: number; minR: number; maxR: number }

/** Can an empty cell reach the bounding-box border via 4-connected empties? */
function reachesOutside(
  startC: number,
  startR: number,
  filled: Set<string>,
  bounds: Bounds
): boolean {
  const stack: Array<[number, number]> = [[startC, startR]]
  const visited = new Set<string>([key(startC, startR)])
  while (stack.length) {
    const [col, row] = stack.pop() as [number, number]
    if (
      col === bounds.minC ||
      col === bounds.maxC ||
      row === bounds.minR ||
      row === bounds.maxR
    ) {
      return true
    }
    for (const [dc, dr] of N4) {
      const nc = col + dc
      const nr = row + dr
      if (nc < bounds.minC || nc > bounds.maxC) continue
      if (nr < bounds.minR || nr > bounds.maxR) continue
      const nk = key(nc, nr)
      if (filled.has(nk) || visited.has(nk)) continue
      visited.add(nk)
      stack.push([nc, nr])
    }
  }
  return false
}
