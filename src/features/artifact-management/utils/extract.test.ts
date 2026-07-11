import { strToU8, zipSync } from 'fflate'
import { describe, expect, it } from 'vitest'
import { UPLOAD_LIMITS } from './config'
import { extractZip, UploadError } from './extract'

/** Build an in-memory .zip; string values are UTF-8 encoded. */
function zip(entries: Record<string, string | Uint8Array>): Uint8Array {
  return zipSync(
    Object.fromEntries(
      Object.entries(entries).map(([name, content]) => [
        name,
        typeof content === 'string' ? strToU8(content) : content,
      ])
    ),
    // Stored (level 0) keeps the large size-cap fixtures fast to build.
    { level: 0 }
  )
}

const INDEX_HTML = '<!doctype html><h1>hi</h1>'

describe('extractZip', () => {
  it('extracts entries with slug-relative paths, bytes, and content types', () => {
    // Arrange
    const archive = zip({
      'index.html': INDEX_HTML,
      'assets/app.js': 'console.log(1)',
      'assets/data.bin': new Uint8Array([1, 2, 3]),
    })

    // Act
    const entries = extractZip(archive)

    // Assert
    expect(entries).toHaveLength(3)
    const byPath = new Map(entries.map((entry) => [entry.path, entry]))
    expect(byPath.get('index.html')?.contentType).toBe('text/html')
    expect(byPath.get('index.html')?.bytes).toEqual(strToU8(INDEX_HTML))
    expect(byPath.get('assets/app.js')?.contentType).toBe('text/javascript')
    expect(byPath.get('assets/data.bin')?.contentType).toBe(
      'application/octet-stream'
    )
  })

  it('strips a single wrapping top-level directory', () => {
    // Arrange
    const archive = zip({
      'bundle/index.html': INDEX_HTML,
      'bundle/assets/app.js': 'console.log(1)',
    })

    // Act
    const entries = extractZip(archive)

    // Assert
    expect(entries.map((entry) => entry.path).sort()).toEqual([
      'assets/app.js',
      'index.html',
    ])
  })

  it('does not strip a top-level directory that is not shared by every entry', () => {
    // Arrange — index.html sits inside `bundle/` but not at the root, and the
    // wrapper is not common, so the root-index requirement fails.
    const archive = zip({
      'bundle/index.html': INDEX_HTML,
      'other/app.js': 'console.log(1)',
    })

    // Act / Assert
    expect(() => extractZip(archive)).toThrow('index.html')
  })

  it('rejects a zip-slip entry before returning anything', () => {
    // Arrange
    const archive = zip({
      'index.html': INDEX_HTML,
      '../escape.html': '<script>alert(1)</script>',
    })

    // Act / Assert
    expect(() => extractZip(archive)).toThrow(/Unsafe path/)
  })

  it('rejects an absolute-path entry', () => {
    const archive = zip({
      'index.html': INDEX_HTML,
      '/evil.html': 'x',
    })
    expect(() => extractZip(archive)).toThrow(/Unsafe path/)
  })

  it('drops directory entries rather than treating them as files', () => {
    // Arrange
    const archive = zip({
      'assets/': new Uint8Array(0),
      'index.html': INDEX_HTML,
    })

    // Act
    const entries = extractZip(archive)

    // Assert
    expect(entries.map((entry) => entry.path)).toEqual(['index.html'])
  })

  it('rejects an archive with no files', () => {
    expect(() => extractZip(zip({}))).toThrow('no files')
  })

  it('rejects an archive with more entries than the cap', () => {
    // Arrange
    const archive = zip(
      Object.fromEntries(
        Array.from({ length: UPLOAD_LIMITS.maxEntries + 1 }, (_, i) => [
          `file-${i}.txt`,
          'x',
        ])
      )
    )

    // Act / Assert
    expect(() => extractZip(archive)).toThrow('Too many files')
  })

  it('rejects a single file over the per-file cap', () => {
    // Arrange
    const archive = zip({
      'index.html': INDEX_HTML,
      'big.bin': new Uint8Array(UPLOAD_LIMITS.maxFileBytes + 1),
    })

    // Act / Assert
    expect(() => extractZip(archive)).toThrow('per-file size limit')
  })

  it('rejects an archive whose total uncompressed size exceeds the cap', () => {
    // Arrange — each file is under the per-file cap; together they breach the total.
    const chunk = Math.ceil(UPLOAD_LIMITS.maxTotalBytes / 3) + 1
    const archive = zip({
      'index.html': INDEX_HTML,
      'a.bin': new Uint8Array(chunk),
      'b.bin': new Uint8Array(chunk),
      'c.bin': new Uint8Array(chunk),
    })

    // Act / Assert
    expect(() => extractZip(archive)).toThrow('total size limit')
  })

  it('requires an index.html at the archive root', () => {
    const archive = zip({ 'style.css': 'body {}' })
    expect(() => extractZip(archive)).toThrow('index.html')
  })

  it('rejects bytes that are not a readable zip', () => {
    expect(() => extractZip(new Uint8Array([1, 2, 3, 4]))).toThrow(
      'Could not read'
    )
  })

  it('throws UploadError carrying an HTTP status', () => {
    // Arrange
    const archive = zip({ 'style.css': 'body {}' })

    // Act
    let thrown: unknown
    try {
      extractZip(archive)
    } catch (error) {
      thrown = error
    }

    // Assert
    expect(thrown).toBeInstanceOf(UploadError)
    expect((thrown as UploadError).status).toBe(400)
    expect((thrown as UploadError).name).toBe('UploadError')
  })
})
