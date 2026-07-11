import { describe, expect, it } from 'vitest'
import { cellNoise, mulberry32 } from './prng'

describe('mulberry32', () => {
  it('yields the same sequence for the same seed', () => {
    // Arrange
    const a = mulberry32(42)
    const b = mulberry32(42)

    // Act / Assert
    expect([a(), a(), a(), a()]).toEqual([b(), b(), b(), b()])
  })

  it('yields different sequences for different seeds', () => {
    expect(mulberry32(1)()).not.toBe(mulberry32(2)())
  })

  it('stays within [0, 1)', () => {
    const next = mulberry32(7)
    for (let i = 0; i < 1000; i++) {
      const value = next()
      expect(value).toBeGreaterThanOrEqual(0)
      expect(value).toBeLessThan(1)
    }
  })
})

describe('cellNoise', () => {
  it('is deterministic per cell, independent of call order', () => {
    // Arrange
    const first = cellNoise(3, 4)
    cellNoise(100, -7)
    cellNoise(0, 0)

    // Act / Assert
    expect(cellNoise(3, 4)).toBe(first)
  })

  it('distinguishes a cell from its transpose', () => {
    expect(cellNoise(3, 4)).not.toBe(cellNoise(4, 3))
  })

  it('stays within [0, 1)', () => {
    for (const [col, row] of [
      [0, 0],
      [-5, 12],
      [1000, -1000],
    ]) {
      const value = cellNoise(col, row)
      expect(value).toBeGreaterThanOrEqual(0)
      expect(value).toBeLessThan(1)
    }
  })
})
