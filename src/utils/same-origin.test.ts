import { describe, expect, it } from 'vitest'
import { isSameOrigin } from './same-origin'

/**
 * `fetch` forbids setting the Host header on a real `Request` (servers set it
 * from the socket), so build the minimal shape the check reads: a `headers`
 * bag. Standalone `Headers` instances carry no such restriction.
 */
function requestWithHeaders(headers: Record<string, string>): Request {
  return { headers: new Headers(headers) } as Request
}

describe('isSameOrigin', () => {
  it('allows a request with no Origin header (same-origin posts, curl)', () => {
    expect(isSameOrigin(requestWithHeaders({}))).toBe(true)
  })

  it('allows an Origin whose host matches the request host', () => {
    // Arrange
    const request = requestWithHeaders({
      origin: 'https://iwans.space',
      host: 'iwans.space',
    })

    // Act / Assert
    expect(isSameOrigin(request)).toBe(true)
  })

  it('matches host including its port', () => {
    const request = requestWithHeaders({
      origin: 'http://localhost:3000',
      host: 'localhost:3000',
    })
    expect(isSameOrigin(request)).toBe(true)
  })

  it('rejects a cross-site Origin', () => {
    // Arrange
    const request = requestWithHeaders({
      origin: 'https://evil.example',
      host: 'iwans.space',
    })

    // Act / Assert
    expect(isSameOrigin(request)).toBe(false)
  })

  it('rejects a same-host Origin on a different port', () => {
    const request = requestWithHeaders({
      origin: 'https://iwans.space:8443',
      host: 'iwans.space',
    })
    expect(isSameOrigin(request)).toBe(false)
  })

  it.each([
    ['unparseable', 'not-a-url'],
    ['opaque null origin (sandboxed iframe)', 'null'],
  ])('rejects an Origin that is not a valid URL: %s', (_label, origin) => {
    expect(
      isSameOrigin(requestWithHeaders({ origin, host: 'iwans.space' }))
    ).toBe(false)
  })
})
