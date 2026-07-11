import { describe, expect, it } from 'vitest'
import { SESSION_COOKIE_NAME } from '@/config/auth'
import { POST } from './route'

describe('POST /api/logout', () => {
  it('clears the session cookie by expiring it immediately', async () => {
    // Act
    const response = await POST()

    // Assert
    expect(response.status).toBe(200)
    const cookie = response.cookies.get(SESSION_COOKIE_NAME)
    expect(cookie?.value).toBe('')
    expect(cookie?.maxAge).toBe(0)
  })
})
