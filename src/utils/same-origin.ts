/**
 * Defence-in-depth CSRF check shared by the state-changing API routes (auth,
 * artifact upload/delete): reject cross-site POST/DELETE requests. A browser
 * always sends `Origin` on a cross-site request; when it is present it must
 * match the request host. An absent `Origin` (same-origin form posts, curl) is
 * allowed. This pairs with the `SameSite=Lax` session cookie.
 */
export function isSameOrigin(request: Request): boolean {
  const origin = request.headers.get('origin')
  if (!origin) {
    return true
  }
  try {
    return new URL(origin).host === request.headers.get('host')
  } catch {
    return false
  }
}
