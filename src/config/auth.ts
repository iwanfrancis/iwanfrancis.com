/**
 * Name of the signed session cookie set on admin login. It is a host-only
 * cookie (set with no `Domain` attribute), so it is scoped to the primary site
 * host and never sent to the artifacts subdomain — an origin-isolation
 * invariant the artifact-hosting design depends on.
 */
export const SESSION_COOKIE_NAME = 'admin_session'

/**
 * Admin session lifetime, in seconds. Defaults to 7 days. The expiry is signed
 * into the session token itself, so this bounds how long a minted cookie stays
 * valid regardless of the client-controllable cookie `Max-Age`.
 */
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7
