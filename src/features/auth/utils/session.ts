import { SESSION_MAX_AGE_SECONDS } from '@/config/auth'

/**
 * Session token helpers. Uses only the Web Crypto API (`crypto.subtle`,
 * `btoa`/`atob`, `TextEncoder`), so this module is safe to import from the Edge
 * runtime (middleware) as well as Node route handlers. It deliberately contains
 * no `node:` imports — the raw-password comparison lives in `password.ts`, which
 * is only imported from the Node-pinned auth route.
 *
 * A token has the form `<expiresAt>.<signature>` where `signature` is a
 * base64url HMAC-SHA256 of the `expiresAt` string. Because the expiry is part of
 * the signed payload, a client cannot extend its own session by editing the
 * cookie's `Max-Age`.
 */

const encoder = new TextEncoder()

function toBase64Url(bytes: Uint8Array): string {
  let binary = ''
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function fromBase64Url(value: string): Uint8Array<ArrayBuffer> {
  const normalised = value.replace(/-/g, '+').replace(/_/g, '/')
  const binary = atob(normalised)
  const bytes = new Uint8Array(new ArrayBuffer(binary.length))
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes
}

async function getSigningKey(): Promise<CryptoKey> {
  const secret = process.env.SESSION_SECRET
  if (!secret) {
    throw new Error('SESSION_SECRET is not configured')
  }
  return crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify']
  )
}

/**
 * Mint a signed session token whose expiry is `now + SESSION_MAX_AGE_SECONDS`.
 */
export async function createSessionToken(
  now: number = Date.now()
): Promise<string> {
  const expiresAt = now + SESSION_MAX_AGE_SECONDS * 1000
  const key = await getSigningKey()
  const signature = new Uint8Array(
    await crypto.subtle.sign('HMAC', key, encoder.encode(String(expiresAt)))
  )
  return `${expiresAt}.${toBase64Url(signature)}`
}

/**
 * Verify a session token: the signature must check out (constant-time, via the
 * Web Crypto MAC verify) and the signed expiry must not be in the past. Returns
 * `false` for any malformed, tampered, or expired token.
 */
export async function verifySession(
  token: string | undefined,
  now: number = Date.now()
): Promise<boolean> {
  if (!token) {
    return false
  }
  const separator = token.indexOf('.')
  if (separator <= 0) {
    return false
  }
  const expiresRaw = token.slice(0, separator)
  const signatureRaw = token.slice(separator + 1)
  const expiresAt = Number(expiresRaw)
  if (!Number.isFinite(expiresAt)) {
    return false
  }
  let signature: Uint8Array<ArrayBuffer>
  try {
    signature = fromBase64Url(signatureRaw)
  } catch {
    return false
  }
  const key = await getSigningKey()
  const valid = await crypto.subtle.verify(
    'HMAC',
    key,
    signature,
    encoder.encode(expiresRaw)
  )
  if (!valid) {
    return false
  }
  return now <= expiresAt
}
