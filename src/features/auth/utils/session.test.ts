import { afterEach, describe, expect, it, vi } from 'vitest'
import { SESSION_MAX_AGE_SECONDS } from '@/config/auth'
import { createSessionToken, verifySession } from './session'

const SECRET = 'test-session-secret'
const NOW = 1_750_000_000_000

afterEach(() => {
  vi.unstubAllEnvs()
})

describe('session tokens', () => {
  it('verifies a token it minted', async () => {
    // Arrange
    vi.stubEnv('SESSION_SECRET', SECRET)
    const token = await createSessionToken(NOW)

    // Act
    const valid = await verifySession(token, NOW)

    // Assert
    expect(valid).toBe(true)
  })

  it('signs an expiry of now plus the session max age', async () => {
    // Arrange
    vi.stubEnv('SESSION_SECRET', SECRET)

    // Act
    const token = await createSessionToken(NOW)

    // Assert
    expect(token.startsWith(`${NOW + SESSION_MAX_AGE_SECONDS * 1000}.`)).toBe(
      true
    )
  })

  it('accepts a token right up to its signed expiry and rejects it after', async () => {
    // Arrange
    vi.stubEnv('SESSION_SECRET', SECRET)
    const token = await createSessionToken(NOW)
    const expiresAt = NOW + SESSION_MAX_AGE_SECONDS * 1000

    // Act / Assert
    expect(await verifySession(token, expiresAt)).toBe(true)
    expect(await verifySession(token, expiresAt + 1)).toBe(false)
  })

  it('rejects a token whose signature was tampered with', async () => {
    // Arrange
    vi.stubEnv('SESSION_SECRET', SECRET)
    const token = await createSessionToken(NOW)
    const flipped = token.slice(0, -1) + (token.endsWith('A') ? 'B' : 'A')

    // Act
    const valid = await verifySession(flipped, NOW)

    // Assert
    expect(valid).toBe(false)
  })

  it('rejects a token whose expiry was extended without re-signing', async () => {
    // Arrange
    vi.stubEnv('SESSION_SECRET', SECRET)
    const token = await createSessionToken(NOW)
    const signature = token.slice(token.indexOf('.') + 1)
    const extended = `${NOW + SESSION_MAX_AGE_SECONDS * 2000}.${signature}`

    // Act
    const valid = await verifySession(extended, NOW)

    // Assert
    expect(valid).toBe(false)
  })

  it('rejects a token signed with a different secret', async () => {
    // Arrange
    vi.stubEnv('SESSION_SECRET', 'secret-a')
    const token = await createSessionToken(NOW)

    // Act
    vi.stubEnv('SESSION_SECRET', 'secret-b')
    const valid = await verifySession(token, NOW)

    // Assert
    expect(valid).toBe(false)
  })

  it.each([
    ['undefined', undefined],
    ['empty string', ''],
    ['no separator', 'notatoken'],
    ['leading separator', '.signature-only'],
    ['non-numeric expiry', `soon.abc`],
    ['invalid base64url signature', `${NOW}.!!!not-base64!!!`],
  ])('rejects a malformed token: %s', async (_label, token) => {
    vi.stubEnv('SESSION_SECRET', SECRET)
    expect(await verifySession(token, NOW)).toBe(false)
  })

  it('cannot mint a token without SESSION_SECRET configured', async () => {
    vi.stubEnv('SESSION_SECRET', '')
    await expect(createSessionToken(NOW)).rejects.toThrow('SESSION_SECRET')
  })
})
