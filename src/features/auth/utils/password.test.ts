import { afterEach, describe, expect, it, vi } from 'vitest'
import { verifyPassword } from './password'

afterEach(() => {
  vi.unstubAllEnvs()
})

describe('verifyPassword', () => {
  it('accepts the configured password', () => {
    // Arrange
    vi.stubEnv('ARTIFACTS_SECRET', 'correct horse battery staple')

    // Act / Assert
    expect(verifyPassword('correct horse battery staple')).toBe(true)
  })

  it('rejects a wrong password, including one of a different length', () => {
    // Arrange
    vi.stubEnv('ARTIFACTS_SECRET', 'correct horse battery staple')

    // Act / Assert
    expect(verifyPassword('wrong')).toBe(false)
    expect(verifyPassword('correct horse battery staple ')).toBe(false)
  })

  it('rejects everything when no secret is configured', () => {
    vi.stubEnv('ARTIFACTS_SECRET', '')
    expect(verifyPassword('anything')).toBe(false)
  })

  it('rejects a missing or empty submission', () => {
    vi.stubEnv('ARTIFACTS_SECRET', 'secret')
    expect(verifyPassword(undefined)).toBe(false)
    expect(verifyPassword('')).toBe(false)
  })
})
