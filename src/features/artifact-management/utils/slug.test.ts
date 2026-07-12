import { describe, expect, it } from 'vitest'
import { generateUniqueSlug, slugify } from './slug'
import { isValidSlug } from './validate'

describe('slugify', () => {
  it.each([
    ['My Cool Thing', 'my-cool-thing'],
    ['Hello, World!', 'hello-world'],
    ['  spaced  out  ', 'spaced-out'],
    ['already-a-slug', 'already-a-slug'],
    ['Trailing punctuation!!!', 'trailing-punctuation'],
    ['Café Crème', 'cafe-creme'],
    ['', 'artifact'],
    ['@#$%', 'artifact'],
  ])('slugifies %j to %j', (title, expected) => {
    expect(slugify(title)).toBe(expected)
  })

  it('always returns a valid, length-capped slug for long input', () => {
    // Arrange
    const title = 'word '.repeat(40)

    // Act
    const slug = slugify(title)

    // Assert
    expect(isValidSlug(slug)).toBe(true)
    expect(slug.length).toBeLessThanOrEqual(60)
  })
})

describe('generateUniqueSlug', () => {
  it('returns the base when it is free', async () => {
    // Arrange
    const exists = async () => false

    // Act / Assert
    expect(await generateUniqueSlug('my-demo', exists)).toBe('my-demo')
  })

  it('appends a valid suffix when the base is taken', async () => {
    // Arrange — only the bare base is taken.
    const exists = async (slug: string) => slug === 'my-demo'

    // Act
    const slug = await generateUniqueSlug('my-demo', exists)

    // Assert
    expect(slug).not.toBe('my-demo')
    expect(slug.startsWith('my-demo-')).toBe(true)
    expect(isValidSlug(slug)).toBe(true)
  })

  it('throws when no free slug is found within the attempt budget', async () => {
    // Arrange
    const exists = async () => true

    // Act / Assert
    await expect(generateUniqueSlug('my-demo', exists, 3)).rejects.toThrow(
      /unique slug/
    )
  })
})
