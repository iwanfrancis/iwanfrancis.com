import { describe, expect, it } from 'vitest'
import { contentTypeForPath, DEFAULT_CONTENT_TYPE } from './mime'

describe('contentTypeForPath', () => {
  it.each([
    ['index.html', 'text/html'],
    ['assets/app.js', 'text/javascript'],
    ['assets/APP.JS', 'text/javascript'],
    ['style.css', 'text/css'],
    ['data.json', 'application/json'],
    ['logo.svg', 'image/svg+xml'],
    ['photo.jpeg', 'image/jpeg'],
    ['font.woff2', 'font/woff2'],
    ['module.wasm', 'application/wasm'],
  ])('maps %s to %s', (path, contentType) => {
    expect(contentTypeForPath(path)).toBe(contentType)
  })

  it.each([
    ['no extension', 'README'],
    ['unknown extension', 'archive.rar'],
    ['trailing dot', 'file.'],
    ['dotfile with unknown suffix', '.hidden'],
  ])('falls back to octet-stream for %s', (_label, path) => {
    expect(contentTypeForPath(path)).toBe(DEFAULT_CONTENT_TYPE)
  })
})
