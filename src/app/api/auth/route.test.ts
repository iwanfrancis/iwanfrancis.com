import { afterEach, describe, expect, it, vi } from 'vitest'
import { SESSION_COOKIE_NAME, SESSION_MAX_AGE_SECONDS } from '@/config/auth'
import { verifySession } from '@/features/auth/utils/session'
import { POST } from './route'

const PASSWORD = 'test-admin-password'

function loginRequest(body: unknown, headers: Record<string, string> = {}) {
  return new Request('https://iwans.space/api/auth', {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...headers },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  })
}

function stubSecrets() {
  vi.stubEnv('ARTIFACTS_SECRET', PASSWORD)
  vi.stubEnv('SESSION_SECRET', 'test-session-secret')
}

afterEach(() => {
  vi.unstubAllEnvs()
})

describe('POST /api/auth', () => {
  it('sets a verifiable session cookie for the correct password', async () => {
    // Arrange
    stubSecrets()

    // Act
    const response = await POST(loginRequest({ password: PASSWORD }))

    // Assert
    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ ok: true })
    const cookie = response.cookies.get(SESSION_COOKIE_NAME)
    expect(cookie?.httpOnly).toBe(true)
    expect(cookie?.sameSite).toBe('lax')
    expect(cookie?.path).toBe('/')
    expect(cookie?.maxAge).toBe(SESSION_MAX_AGE_SECONDS)
    expect(await verifySession(cookie?.value)).toBe(true)
  })

  it('rejects a wrong password without setting a cookie', async () => {
    // Arrange
    stubSecrets()

    // Act
    const response = await POST(loginRequest({ password: 'nope' }))

    // Assert
    expect(response.status).toBe(401)
    expect(response.cookies.get(SESSION_COOKIE_NAME)).toBeUndefined()
  })

  it.each([
    ['a non-string password', { password: 123 }],
    ['a missing password', {}],
    ['an unparseable body', 'not json'],
  ])('rejects %s with a 401', async (_label, body) => {
    stubSecrets()
    const response = await POST(loginRequest(body))
    expect(response.status).toBe(401)
  })

  it('rejects a cross-site request before checking credentials', async () => {
    // Arrange
    stubSecrets()
    const request = loginRequest(
      { password: PASSWORD },
      { origin: 'https://evil.example' }
    )

    // Act
    const response = await POST(request)

    // Assert
    expect(response.status).toBe(403)
    expect(response.cookies.get(SESSION_COOKIE_NAME)).toBeUndefined()
  })
})
