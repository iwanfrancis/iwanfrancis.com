import { afterEach, describe, expect, it, vi } from 'vitest'
import { verifyBearerToken } from './token'

const TOKEN = 'a-long-random-ingest-token'

afterEach(() => {
  vi.unstubAllEnvs()
})

describe('verifyBearerToken', () => {
  it('accepts the configured token in a Bearer header', () => {
    // Arrange
    vi.stubEnv('ARTIFACTS_API_TOKEN', TOKEN)

    // Act / Assert
    expect(verifyBearerToken(`Bearer ${TOKEN}`)).toBe(true)
  })

  it('accepts a case-insensitive scheme with extra whitespace', () => {
    vi.stubEnv('ARTIFACTS_API_TOKEN', TOKEN)
    expect(verifyBearerToken(`bearer   ${TOKEN}`)).toBe(true)
  })

  it('rejects a wrong token, including one of a different length', () => {
    // Arrange
    vi.stubEnv('ARTIFACTS_API_TOKEN', TOKEN)

    // Act / Assert
    expect(verifyBearerToken('Bearer nope')).toBe(false)
    expect(verifyBearerToken(`Bearer ${TOKEN}x`)).toBe(false)
  })

  it('trims insignificant surrounding whitespace on the header', () => {
    vi.stubEnv('ARTIFACTS_API_TOKEN', TOKEN)
    expect(verifyBearerToken(`Bearer ${TOKEN}  `)).toBe(true)
  })

  it('rejects a non-Bearer scheme or a bare token', () => {
    vi.stubEnv('ARTIFACTS_API_TOKEN', TOKEN)
    expect(verifyBearerToken(`Basic ${TOKEN}`)).toBe(false)
    expect(verifyBearerToken(TOKEN)).toBe(false)
  })

  it('rejects a missing header', () => {
    vi.stubEnv('ARTIFACTS_API_TOKEN', TOKEN)
    expect(verifyBearerToken(undefined)).toBe(false)
    expect(verifyBearerToken(null)).toBe(false)
    expect(verifyBearerToken('')).toBe(false)
  })

  it('fails closed when no token is configured', () => {
    vi.stubEnv('ARTIFACTS_API_TOKEN', '')
    expect(verifyBearerToken(`Bearer ${TOKEN}`)).toBe(false)
  })
})
