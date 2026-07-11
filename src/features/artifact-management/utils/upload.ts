import { UPLOAD_LIMITS } from './config'
import { type ExtractedEntry, extractZip, UploadError } from './extract'

/** Classify an upload by filename extension, never by the client's MIME type. */
function uploadKind(file: File): 'html' | 'zip' | 'unsupported' {
  const name = file.name.toLowerCase()
  if (name.endsWith('.html') || name.endsWith('.htm')) {
    return 'html'
  }
  if (name.endsWith('.zip')) {
    return 'zip'
  }
  return 'unsupported'
}

/**
 * Validate an uploaded file and resolve it to the slug-relative entries to
 * write. Shared by create (`POST`) and update (`PUT`) so both apply the same
 * rules — size cap, supported kind, and (for a `.zip`) the full zip-slip /
 * caps / root-`index.html` validation — before any object is written. Throws
 * `UploadError` (carrying the HTTP status) on any breach.
 */
export async function entriesFromUpload(file: File): Promise<ExtractedEntry[]> {
  if (file.size > UPLOAD_LIMITS.maxTotalBytes) {
    throw new UploadError('upload exceeds the total size limit', 413)
  }
  const kind = uploadKind(file)
  if (kind === 'unsupported') {
    throw new UploadError('file must be a .html file or a .zip bundle', 400)
  }
  const bytes = new Uint8Array(await file.arrayBuffer())
  return kind === 'html'
    ? [{ path: 'index.html', bytes, contentType: 'text/html' }]
    : extractZip(bytes)
}
