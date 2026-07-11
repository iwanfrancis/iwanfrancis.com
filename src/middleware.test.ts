import { NextRequest } from 'next/server'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { SESSION_COOKIE_NAME } from '@/config/auth'
import { createSessionToken } from '@/features/auth/utils/session'
import { middleware } from './middleware'

const SECRET = 'test-session-secret'

function gatedRequest(path: string, cookie?: string): NextRequest {
  return new NextRequest(`https://iwans.space${path}`, {
    headers: cookie ? { cookie } : {},
  })
}

afterEach(() => {
  vi.unstubAllEnvs()
})

describe('middleware', () => {
  it('lets a valid session through', async () => {
    // Arrange
    vi.stubEnv('SESSION_SECRET', SECRET)
    const token = await createSessionToken()
    const request = gatedRequest(
      '/artifacts',
      `${SESSION_COOKIE_NAME}=${token}`
    )

    // Act
    const response = await middleware(request)

    // Assert — NextResponse.next() marks pass-through with this header.
    expect(response.headers.get('x-middleware-next')).toBe('1')
  })

  it('returns 401 JSON for an API path without a session', async () => {
    // Arrange
    vi.stubEnv('SESSION_SECRET', SECRET)
    const request = gatedRequest('/api/artifacts')

    // Act
    const response = await middleware(request)

    // Assert
    expect(response.status).toBe(401)
    expect(await response.json()).toEqual({ error: 'unauthorized' })
  })

  it('returns 401 for an API path with a tampered session cookie', async () => {
    // Arrange
    vi.stubEnv('SESSION_SECRET', SECRET)
    const token = await createSessionToken()
    const request = gatedRequest(
      '/api/artifacts',
      `${SESSION_COOKIE_NAME}=${token}tampered`
    )

    // Act
    const response = await middleware(request)

    // Assert
    expect(response.status).toBe(401)
  })

  it('redirects a page path without a session to /login with a next hint', async () => {
    // Arrange
    vi.stubEnv('SESSION_SECRET', SECRET)
    const request = gatedRequest('/artifacts')

    // Act
    const response = await middleware(request)

    // Assert
    expect(response.status).toBe(307)
    expect(response.headers.get('location')).toBe(
      'https://iwans.space/login?next=%2Fartifacts'
    )
  })

  it('drops any existing query string from the redirect but keeps the path hint', async () => {
    // Arrange
    vi.stubEnv('SESSION_SECRET', SECRET)
    const request = gatedRequest('/artifacts?tab=uploads')

    // Act
    const response = await middleware(request)

    // Assert
    expect(response.headers.get('location')).toBe(
      'https://iwans.space/login?next=%2Fartifacts'
    )
  })
})
