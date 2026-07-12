import { describe, expect, it } from 'vitest'
import { shouldDismiss } from './should-dismiss'

describe('shouldDismiss', () => {
  it.each([
    // Long drag dismisses regardless of speed (distance > 35% of 600 = 210).
    {
      name: 'long slow drag dismisses',
      distance: 400,
      velocity: 0,
      expected: true,
    },
    // Fast flick dismisses despite a short drag (velocity > 0.5).
    {
      name: 'fast flick on a short drag dismisses',
      distance: 20,
      velocity: 1.2,
      expected: true,
    },
    // Short, slow drag snaps back (below both thresholds).
    {
      name: 'short slow drag snaps back',
      distance: 50,
      velocity: 0.1,
      expected: false,
    },
  ])('$name', ({ distance, velocity, expected }) => {
    expect(shouldDismiss({ distance, height: 600, velocity })).toBe(expected)
  })

  it('does not dismiss when the sheet height is unknown', () => {
    // Arrange
    const release = { distance: 999, height: 0, velocity: 999 }

    // Act
    const result = shouldDismiss(release)

    // Assert
    expect(result).toBe(false)
  })

  it('treats an upward drag as snap-back', () => {
    expect(shouldDismiss({ distance: -300, height: 600, velocity: 0 })).toBe(
      false
    )
  })
})
