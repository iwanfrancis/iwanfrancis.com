import { describe, expect, it } from 'vitest'
import { type Cell, placeTiles } from './place-tiles'

const key = (cell: Cell) => `${cell.col},${cell.row}`

const N4: ReadonlyArray<readonly [number, number]> = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
]

/** Every cell reachable from the origin via shared edges. */
function connectedComponent(cells: Cell[]): Set<string> {
  const all = new Set(cells.map(key))
  const seen = new Set<string>(['0,0'])
  const stack: Cell[] = [{ col: 0, row: 0 }]
  while (stack.length) {
    const cell = stack.pop() as Cell
    for (const [dc, dr] of N4) {
      const next = { col: cell.col + dc, row: cell.row + dr }
      const k = key(next)
      if (all.has(k) && !seen.has(k)) {
        seen.add(k)
        stack.push(next)
      }
    }
  }
  return seen
}

/** Empty cells inside the blob's bounding box that cannot reach its border. */
function enclosedEmptyCells(cells: Cell[]): string[] {
  const filled = new Set(cells.map(key))
  const cols = cells.map((cell) => cell.col)
  const rows = cells.map((cell) => cell.row)
  const minC = Math.min(...cols) - 1
  const maxC = Math.max(...cols) + 1
  const minR = Math.min(...rows) - 1
  const maxR = Math.max(...rows) + 1

  // Flood the outside in from the expanded border; anything empty and
  // unreached afterwards is an enclosed gap.
  const outside = new Set<string>()
  const stack: Array<[number, number]> = [[minC, minR]]
  outside.add(`${minC},${minR}`)
  while (stack.length) {
    const [col, row] = stack.pop() as [number, number]
    for (const [dc, dr] of N4) {
      const nc = col + dc
      const nr = row + dr
      if (nc < minC || nc > maxC || nr < minR || nr > maxR) continue
      const k = `${nc},${nr}`
      if (filled.has(k) || outside.has(k)) continue
      outside.add(k)
      stack.push([nc, nr])
    }
  }

  const enclosed: string[] = []
  for (let col = minC; col <= maxC; col++) {
    for (let row = minR; row <= maxR; row++) {
      const k = `${col},${row}`
      if (!filled.has(k) && !outside.has(k)) {
        enclosed.push(k)
      }
    }
  }
  return enclosed
}

describe('placeTiles', () => {
  it('returns no cells for zero or negative counts', () => {
    expect(placeTiles(0)).toEqual([])
    expect(placeTiles(-3)).toEqual([])
  })

  it('starts the blob at the origin', () => {
    expect(placeTiles(1)).toEqual([{ col: 0, row: 0 }])
  })

  it('places exactly count tiles on distinct cells', () => {
    // Act
    const cells = placeTiles(60)

    // Assert
    expect(cells).toHaveLength(60)
    expect(new Set(cells.map(key)).size).toBe(60)
  })

  it('is prefix-stable: appending a tile never moves an existing one', () => {
    // Act
    const shorter = placeTiles(20)
    const longer = placeTiles(21)

    // Assert
    expect(longer.slice(0, 20)).toEqual(shorter)
  })

  it('keeps the blob edge-connected at every size', () => {
    for (const count of [2, 5, 15, 50]) {
      const cells = placeTiles(count)
      expect(connectedComponent(cells).size).toBe(count)
    }
  })

  it('never encloses an empty cell', () => {
    for (const count of [10, 25, 50]) {
      expect(enclosedEmptyCells(placeTiles(count))).toEqual([])
    }
  })
})
