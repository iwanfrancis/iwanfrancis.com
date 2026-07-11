import { afterEach, describe, expect, it, vi } from 'vitest'
import { SESSION_MAX_AGE_SECONDS } from '@/config/auth'
import { clearedSessionCookieOptions, sessionCookieOptions } from './cookie'

afterEach(() => {
  vi.unstubAllEnvs()
})

describe('session cookie options', () => {
  it('sets a locked-down cookie for the full session lifetime', () => {
    expect(sessionCookieOptions()).toEqual({
      httpOnly: true,
      secure: false,
      sameSite: 'lax',
      path: '/',
      maxAge: SESSION_MAX_AGE_SECONDS,
    })
  })

  it('marks the cookie Secure in production', () => {
    // Arrange
    vi.stubEnv('NODE_ENV', 'production')

    // Act / Assert
    expect(sessionCookieOptions().secure).toBe(true)
  })

  it('clears the session by expiring the cookie immediately', () => {
    expect(clearedSessionCookieOptions().maxAge).toBe(0)
  })

  it('never sets a Domain attribute, keeping the cookie host-only', () => {
    expect(sessionCookieOptions()).not.toHaveProperty('domain')
  })
})
