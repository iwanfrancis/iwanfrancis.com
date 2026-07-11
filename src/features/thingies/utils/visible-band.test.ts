import { describe, expect, it } from 'vitest'
import { PITCH, TILE_SIZE } from '../constants'
import { computeBands, intersects, type Viewport } from './visible-band'

const viewport: Viewport = {
  vw: 1000,
  vh: 800,
  offsetX: 0,
  offsetY: 0,
  scale: 1,
}

describe('computeBands', () => {
  it('expands the visible world rect by each margin', () => {
    // Act
    const bands = computeBands(viewport, 50, 100)

    // Assert — world rect at scale 1, centred: ±vw/2 and ±vh/2.
    expect(bands.active).toEqual({
      left: -550,
      right: 550,
      top: -450,
      bottom: 450,
    })
    expect(bands.mount).toEqual({
      left: -600,
      right: 600,
      top: -500,
      bottom: 500,
    })
  })

  it('widens the bands when zoomed out', () => {
    // Arrange
    const zoomedOut = { ...viewport, scale: 0.5 }

    // Act
    const bands = computeBands(zoomedOut, 50, 100)

    // Assert — halving the scale doubles the world rect before margins.
    expect(bands.mount.right).toBe(1000 / 2 / 0.5 + 100)
  })

  it('shifts the bands opposite to the pan offset', () => {
    // Arrange
    const panned = { ...viewport, offsetX: 300 }

    // Act
    const bands = computeBands(panned, 50, 100)

    // Assert
    expect(bands.mount.left).toBe(-500 - 300 - 100)
    expect(bands.mount.right).toBe(500 - 300 + 100)
  })

  it('keeps the same key across a sub-cell pan and changes it after a full cell', () => {
    // Act
    const resting = computeBands(viewport, 50, 100)
    const subPixel = computeBands({ ...viewport, offsetX: 1 }, 50, 100)
    const fullCell = computeBands({ ...viewport, offsetX: PITCH }, 50, 100)

    // Assert
    expect(subPixel.key).toBe(resting.key)
    expect(fullCell.key).not.toBe(resting.key)
  })
})

describe('intersects', () => {
  const rect = { left: 0, right: 200, top: 0, bottom: 200 }

  it.each([
    ['inside', 50, 50],
    ['touching the left edge', -TILE_SIZE, 0],
    ['touching the bottom-right corner', 200, 200],
  ])('detects a tile %s', (_label, left, top) => {
    expect(intersects(rect, left, top)).toBe(true)
  })

  it.each([
    ['past the left edge', -TILE_SIZE - 1, 0],
    ['past the right edge', 201, 0],
    ['past the bottom edge', 0, 201],
  ])('excludes a tile %s', (_label, left, top) => {
    expect(intersects(rect, left, top)).toBe(false)
  })
})
