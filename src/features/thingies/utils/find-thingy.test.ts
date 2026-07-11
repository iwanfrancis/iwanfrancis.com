import { describe, expect, it } from 'vitest'
import { findThingy } from './find-thingy'

describe('findThingy', () => {
  it('resolves a full id as canonical', () => {
    // Act
    const resolved = findThingy('0007-snake')

    // Assert
    expect(resolved?.entry.id).toBe('0007-snake')
    expect(resolved?.canonical).toBe(true)
  })

  it.each([
    ['7', '0007-snake'],
    ['0007', '0007-snake'],
    ['13', '0013-slinky-steps'],
  ])('resolves the bare number %j as non-canonical %s', (segment, id) => {
    const resolved = findThingy(segment)
    expect(resolved?.entry.id).toBe(id)
    expect(resolved?.canonical).toBe(false)
  })

  it.each([
    ['unknown number', '9999'],
    ['five digits', '00007'],
    ['slug without number', 'snake'],
    ['wrong full id', '0007-snek'],
    ['empty string', ''],
  ])('returns null for %s', (_label, segment) => {
    expect(findThingy(segment)).toBeNull()
  })
})
