/**
 * Extension → Content-Type mapping used when writing objects, so artifact-server
 * serves each with the correct MIME type (the writer's half of the
 * artifact-hosting serving contract). Anything unlisted falls back to
 * `application/octet-stream`.
 */

const MIME_BY_EXTENSION: Record<string, string> = {
  html: 'text/html',
  htm: 'text/html',
  css: 'text/css',
  js: 'text/javascript',
  mjs: 'text/javascript',
  json: 'application/json',
  map: 'application/json',
  xml: 'application/xml',
  txt: 'text/plain',
  svg: 'image/svg+xml',
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  gif: 'image/gif',
  webp: 'image/webp',
  avif: 'image/avif',
  ico: 'image/x-icon',
  woff: 'font/woff',
  woff2: 'font/woff2',
  ttf: 'font/ttf',
  otf: 'font/otf',
  wasm: 'application/wasm',
  mp3: 'audio/mpeg',
  mp4: 'video/mp4',
  webm: 'video/webm',
  pdf: 'application/pdf',
}

export const DEFAULT_CONTENT_TYPE = 'application/octet-stream'

/** Resolve the Content-Type for a path from its file extension. */
export function contentTypeForPath(path: string): string {
  const dot = path.lastIndexOf('.')
  if (dot === -1) {
    return DEFAULT_CONTENT_TYPE
  }
  const ext = path.slice(dot + 1).toLowerCase()
  return MIME_BY_EXTENSION[ext] ?? DEFAULT_CONTENT_TYPE
}
