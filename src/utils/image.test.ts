import { describe, expect, it } from 'vitest'
import { generateImageSizes } from './image'

describe('generateImageSizes', () => {
  it('emits a max-width clause per breakpoint with the last as catch-all', () => {
    expect(generateImageSizes({ sizes: { sm: 100, md: 50, lg: 25 } })).toBe(
      '(max-width: 640px) 100vw, (max-width: 768px) 50vw, 25vw'
    )
  })

  it('emits a bare catch-all for a single breakpoint', () => {
    expect(generateImageSizes({ sizes: { xl: 40 } })).toBe('40vw')
  })

  it('returns an empty string when no sizes are provided', () => {
    expect(generateImageSizes({ sizes: {} })).toBe('')
  })
})
