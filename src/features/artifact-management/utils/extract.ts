import { unzipSync } from 'fflate'
import { UPLOAD_LIMITS } from './config'
import { contentTypeForPath } from './mime'
import { safeEntryPath } from './validate'

/** A single file resolved from an upload, ready to write under `<slug>/`. */
export type ExtractedEntry = {
  /** slug-relative path, e.g. `index.html`, `assets/app.js`. */
  path: string
  bytes: Uint8Array
  contentType: string
}

/** A rejected upload, carrying the HTTP status the route should return. */
export class UploadError extends Error {
  readonly status: number
  constructor(message: string, status = 400) {
    super(message)
    this.name = 'UploadError'
    this.status = status
  }
}

/**
 * If every entry sits under one shared top-level directory (a common "download
 * zip" wrapper), return that directory name so it can be stripped; otherwise
 * `null`.
 */
function commonTopLevelDir(names: string[]): string | null {
  const firstSegment = (name: string): string | null => {
    const slash = name.indexOf('/')
    return slash === -1 ? null : name.slice(0, slash)
  }
  const candidate = firstSegment(names[0])
  if (!candidate) {
    return null
  }
  return names.every((name) => firstSegment(name) === candidate)
    ? candidate
    : null
}

/**
 * Extract a `.zip` in memory into slug-relative entries, validating the WHOLE
 * archive before returning so the caller never writes a partial artifact. Guards
 * against zip-slip (`safeEntryPath`), enforces the size/count caps against
 * uncompressed content, normalises a single wrapping top-level directory, and
 * requires a resolvable root `index.html`. Throws `UploadError` on any breach.
 */
export function extractZip(data: Uint8Array): ExtractedEntry[] {
  let unzipped: Record<string, Uint8Array>
  try {
    unzipped = unzipSync(data)
  } catch {
    throw new UploadError('Could not read the .zip archive')
  }

  // Directory entries (keys ending in `/`) carry no content — drop them.
  const rawEntries = Object.entries(unzipped).filter(
    ([name]) => !name.endsWith('/')
  )

  if (rawEntries.length === 0) {
    throw new UploadError('The archive contains no files')
  }
  if (rawEntries.length > UPLOAD_LIMITS.maxEntries) {
    throw new UploadError(
      `Too many files in the archive (max ${UPLOAD_LIMITS.maxEntries})`
    )
  }

  const wrapper = commonTopLevelDir(rawEntries.map(([name]) => name))

  let total = 0
  const entries: ExtractedEntry[] = []
  for (const [name, bytes] of rawEntries) {
    const stripped = wrapper ? name.slice(wrapper.length + 1) : name
    const path = safeEntryPath(stripped)
    if (path === null) {
      throw new UploadError(`Unsafe path in archive: ${name}`)
    }
    if (bytes.length > UPLOAD_LIMITS.maxFileBytes) {
      throw new UploadError(`File exceeds the per-file size limit: ${path}`)
    }
    total += bytes.length
    if (total > UPLOAD_LIMITS.maxTotalBytes) {
      throw new UploadError('Archive contents exceed the total size limit')
    }
    entries.push({ path, bytes, contentType: contentTypeForPath(path) })
  }

  if (!entries.some((entry) => entry.path === 'index.html')) {
    throw new UploadError('The archive must contain an index.html at its root')
  }

  return entries
}
