/**
 * Slug validation and the zip-slip guard. `safeEntryPath` is the security-
 * critical bit: it maps a raw archive entry name to a clean, slug-relative key
 * or rejects it, so nothing can escape the `<slug>/` prefix at write time.
 */

/** A slug is lowercase alphanumerics separated by single hyphens. */
const SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/

export function isValidSlug(slug: string): boolean {
  return SLUG_PATTERN.test(slug)
}

/** Reject control characters and backslashes anywhere in a path segment. */
function hasDisallowedChar(segment: string): boolean {
  for (const char of segment) {
    const code = char.codePointAt(0) ?? 0
    if (code < 0x20 || char === '\\') {
      return true
    }
  }
  return false
}

/**
 * Resolve an archive entry name to a safe, slug-relative path, or `null` if it
 * is unsafe. Rejects absolute paths and any `..` segment (traversal), plus
 * backslashes and control characters; collapses `.` and empty segments (e.g. a
 * trailing directory slash). Because `..` is never permitted and a leading `/`
 * is rejected, a non-null result always stays within the `<slug>/` prefix.
 */
export function safeEntryPath(entryPath: string): string | null {
  if (entryPath.startsWith('/')) {
    return null
  }
  const resolved: string[] = []
  for (const segment of entryPath.split('/')) {
    if (segment === '' || segment === '.') {
      continue
    }
    if (segment === '..' || hasDisallowedChar(segment)) {
      return null
    }
    resolved.push(segment)
  }
  if (resolved.length === 0) {
    return null
  }
  return resolved.join('/')
}
