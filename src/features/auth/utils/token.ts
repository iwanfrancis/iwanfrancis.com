import { createHash, timingSafeEqual } from 'node:crypto'

/**
 * Constant-time verification of a bearer token from an `Authorization` header
 * against `ARTIFACTS_API_TOKEN` — the credential a headless client (the iOS
 * share Shortcut) presents to `POST /api/ingest`. It is independent of the
 * browser admin session cookie and of `ARTIFACTS_SECRET`.
 *
 * Both sides are hashed to a fixed-length SHA-256 digest so the equal lengths
 * `timingSafeEqual` requires are guaranteed and the raw lengths never leak
 * through timing (the same approach as `verifyPassword`). Uses `node:crypto`,
 * so this must only be imported from a Node-runtime route handler — never from
 * Edge middleware. That constraint is exactly why the ingest route lives outside
 * the middleware matcher and authenticates itself.
 *
 * Fails closed: returns `false` when `ARTIFACTS_API_TOKEN` is unset, the header
 * is absent, or it is not a well-formed `Bearer <token>`.
 */
export function verifyBearerToken(header: string | null | undefined): boolean {
  const secret = process.env.ARTIFACTS_API_TOKEN
  if (!secret || !header) {
    return false
  }
  const match = /^Bearer\s+(.+)$/i.exec(header.trim())
  if (!match) {
    return false
  }
  const submittedDigest = createHash('sha256').update(match[1]).digest()
  const secretDigest = createHash('sha256').update(secret).digest()
  return timingSafeEqual(submittedDigest, secretDigest)
}
