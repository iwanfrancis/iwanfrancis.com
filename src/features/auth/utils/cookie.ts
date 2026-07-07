import { SESSION_MAX_AGE_SECONDS } from '@/config/auth'

/**
 * Attributes for the session cookie. `secure` is only enforced in production so
 * the cookie still works over http on localhost during development; in every
 * deployed environment it is `Secure`. There is deliberately no `Domain`
 * attribute, which makes the cookie host-only (scoped to the primary site host
 * and never sent to the artifacts subdomain).
 */
function baseSessionCookieOptions(maxAge: number) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
    maxAge,
  }
}

/** Options for setting a fresh session cookie. */
export function sessionCookieOptions() {
  return baseSessionCookieOptions(SESSION_MAX_AGE_SECONDS)
}

/** Options for clearing the session cookie (immediate expiry). */
export function clearedSessionCookieOptions() {
  return baseSessionCookieOptions(0)
}
