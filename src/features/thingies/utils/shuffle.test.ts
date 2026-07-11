import { describe, expect, it } from 'vitest'
import { shuffle } from './shuffle'

describe('shuffle', () => {
  it('returns a permutation of the input', () => {
    // Arrange
    const items = [1, 2, 3, 4, 5, 6, 7, 8]

    // Act
    const out = shuffle(items)

    // Assert
    expect(out).toHaveLength(items.length)
    expect([...out].sort((a, b) => a - b)).toEqual(items)
  })

  it('does not mutate the input', () => {
    // Arrange
    const items = ['a', 'b', 'c', 'd']
    const snapshot = [...items]

    // Act
    shuffle(items)

    // Assert
    expect(items).toEqual(snapshot)
  })

  it('handles empty and single-item arrays', () => {
    expect(shuffle([])).toEqual([])
    expect(shuffle([9])).toEqual([9])
  })
})
