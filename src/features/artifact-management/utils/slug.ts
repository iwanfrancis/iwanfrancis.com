import { isValidSlug } from './validate'

/** Used when a title slugifies to nothing (empty or punctuation-only). */
const FALLBACK_BASE = 'artifact'

/** Keep generated slugs (and so URLs) tidy. */
const MAX_SLUG_LENGTH = 60

/**
 * Slugify free-text into a value matching the artifact slug pattern
 * (`^[a-z0-9]+(-[a-z0-9]+)*$`): decompose accents and drop the diacritic marks
 * so they fold to their ASCII base, lowercase, collapse every run of
 * non-alphanumerics to a single hyphen, trim hyphens, and length-cap. Falls back
 * to a constant base when nothing usable remains, so the result is always a
 * valid slug.
 */
export function slugify(title: string): string {
  const base = title
    .normalize('NFKD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, MAX_SLUG_LENGTH)
    .replace(/-+$/g, '')
  return base || FALLBACK_BASE
}

/** A short, slug-safe suffix (hex is all lowercase-alphanumeric). */
function randomSuffix(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(3))
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join(
    ''
  )
}

/**
 * Resolve a base slug to one not already taken. Returns `base` when it is free;
 * on collision, appends a short random suffix and retries up to `maxAttempts`
 * times. Every returned value satisfies `isValidSlug`. Throws if a free slug
 * cannot be found within the attempt budget (practically never, given the
 * suffix entropy).
 */
export async function generateUniqueSlug(
  base: string,
  exists: (slug: string) => Promise<boolean>,
  maxAttempts = 5
): Promise<string> {
  if (!(await exists(base))) {
    return base
  }
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const candidate = `${base}-${randomSuffix()}`
    if (isValidSlug(candidate) && !(await exists(candidate))) {
      return candidate
    }
  }
  throw new Error(`could not generate a unique slug for "${base}"`)
}
