import { createHash, timingSafeEqual } from 'node:crypto'

/**
 * Constant-time comparison of a submitted password against `ARTIFACTS_SECRET`.
 *
 * Both sides are first hashed to a fixed-length SHA-256 digest so the equal
 * lengths that `timingSafeEqual` requires are guaranteed and the raw lengths
 * never leak through timing. Uses `node:crypto`, so it must only be imported
 * from a Node-runtime route handler — never from Edge middleware.
 */
export function verifyPassword(submitted: string | undefined): boolean {
  const secret = process.env.ARTIFACTS_SECRET
  if (!secret || !submitted) {
    return false
  }
  const submittedDigest = createHash('sha256').update(submitted).digest()
  const secretDigest = createHash('sha256').update(secret).digest()
  return timingSafeEqual(submittedDigest, secretDigest)
}
