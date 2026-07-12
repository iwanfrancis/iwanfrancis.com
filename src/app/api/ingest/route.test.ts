import { strToU8, zipSync } from 'fflate'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { UPLOAD_LIMITS } from '@/features/artifact-management/utils/config'
import { putObject, slugExists } from '@/features/artifact-management/utils/s3'
import { POST } from './route'

vi.mock('@/features/artifact-management/utils/s3', () => ({
  putObject: vi.fn(),
  slugExists: vi.fn(),
}))

const TOKEN = 'test-ingest-token'

function ingestRequest(
  body: BodyInit,
  headers: Record<string, string> = {}
): Request {
  return new Request('https://iwans.space/api/ingest', {
    method: 'POST',
    headers,
    body,
  })
}

/** A raw-HTML ingest request with a valid bearer token by default. */
function rawHtmlRequest(
  html: string,
  headers: Record<string, string> = {}
): Request {
  return ingestRequest(html, {
    authorization: `Bearer ${TOKEN}`,
    'content-type': 'text/html',
    ...headers,
  })
}

beforeEach(() => {
  vi.resetAllMocks()
  vi.stubEnv('ARTIFACTS_API_TOKEN', TOKEN)
  vi.mocked(slugExists).mockResolvedValue(false)
})

afterEach(() => {
  vi.unstubAllEnvs()
  vi.restoreAllMocks()
})

describe('POST /api/ingest', () => {
  it('stores a raw HTML body as index.html, writing meta.json last', async () => {
    // Arrange
    const html = '<!doctype html><h1>hi</h1>'

    // Act
    const response = await POST(
      rawHtmlRequest(html, { 'x-artifact-title': 'My Cool Thing' })
    )

    // Assert
    expect(response.status).toBe(201)
    expect(await response.json()).toEqual({
      slug: 'my-cool-thing',
      url: 'https://artifacts.iwans.space/my-cool-thing/',
    })

    const calls = vi.mocked(putObject).mock.calls
    expect(calls[0]).toEqual([
      'my-cool-thing/index.html',
      new TextEncoder().encode(html),
      'text/html',
    ])
    expect(calls.at(-1)?.[0]).toBe('my-cool-thing/meta.json')
    const meta = JSON.parse(new TextDecoder().decode(calls.at(-1)?.[1]))
    expect(meta).toEqual({
      slug: 'my-cool-thing',
      title: 'My Cool Thing',
      createdAt: expect.any(String),
    })
  })

  it('falls back to a default slug and title when none is supplied', async () => {
    // Act
    const response = await POST(rawHtmlRequest('<!doctype html>'))

    // Assert
    expect(await response.json()).toMatchObject({ slug: 'artifact' })
    const metaCall = vi.mocked(putObject).mock.calls.at(-1)
    const meta = JSON.parse(new TextDecoder().decode(metaCall?.[1]))
    expect(meta.title).toBe('artifact')
  })

  it('rejects a request with no Authorization header', async () => {
    // Act
    const response = await POST(
      ingestRequest('<!doctype html>', { 'content-type': 'text/html' })
    )

    // Assert
    expect(response.status).toBe(401)
    expect(vi.mocked(putObject)).not.toHaveBeenCalled()
  })

  it('rejects a non-Bearer Authorization scheme', async () => {
    const response = await POST(
      rawHtmlRequest('<!doctype html>', { authorization: `Basic ${TOKEN}` })
    )
    expect(response.status).toBe(401)
    expect(vi.mocked(putObject)).not.toHaveBeenCalled()
  })

  it('rejects a wrong bearer token', async () => {
    const response = await POST(
      rawHtmlRequest('<!doctype html>', { authorization: 'Bearer nope' })
    )
    expect(response.status).toBe(401)
    expect(vi.mocked(putObject)).not.toHaveBeenCalled()
  })

  it('fails closed when ARTIFACTS_API_TOKEN is unset', async () => {
    // Arrange
    vi.stubEnv('ARTIFACTS_API_TOKEN', '')

    // Act
    const response = await POST(rawHtmlRequest('<!doctype html>'))

    // Assert
    expect(response.status).toBe(401)
  })

  it('rejects an empty raw body', async () => {
    const response = await POST(rawHtmlRequest(''))
    expect(response.status).toBe(400)
    expect(vi.mocked(putObject)).not.toHaveBeenCalled()
  })

  it('accepts a multipart file field and stores it', async () => {
    // Arrange
    const form = new FormData()
    form.set('file', new File(['<!doctype html>'], 'demo.html'), 'demo.html')
    form.set('title', 'From Multipart')
    const request = ingestRequest(form, { authorization: `Bearer ${TOKEN}` })

    // Act
    const response = await POST(request)

    // Assert
    expect(response.status).toBe(201)
    expect(await response.json()).toMatchObject({ slug: 'from-multipart' })
    expect(vi.mocked(putObject).mock.calls[0][0]).toBe(
      'from-multipart/index.html'
    )
  })

  it('rejects a multipart submission without a file', async () => {
    // Arrange
    const form = new FormData()
    form.set('title', 'no file here')
    const request = ingestRequest(form, { authorization: `Bearer ${TOKEN}` })

    // Act
    const response = await POST(request)

    // Assert
    expect(response.status).toBe(400)
    expect(await response.json()).toEqual({ error: 'no file provided' })
  })

  it('maps an invalid zip to the UploadError status', async () => {
    // Arrange — a bundle with no root index.html is rejected.
    const archive = zipSync({ 'style.css': strToU8('body {}') })
    const form = new FormData()
    form.set(
      'file',
      new File([archive as BlobPart], 'bundle.zip'),
      'bundle.zip'
    )
    const request = ingestRequest(form, { authorization: `Bearer ${TOKEN}` })

    // Act
    const response = await POST(request)

    // Assert
    expect(response.status).toBe(400)
    expect((await response.json()).error).toMatch(/index\.html/)
    expect(vi.mocked(putObject)).not.toHaveBeenCalled()
  })

  it('rejects an oversized body with a 413 and no write', async () => {
    // Arrange — one byte over the total cap.
    const oversized = new Uint8Array(UPLOAD_LIMITS.maxTotalBytes + 1)
    const request = ingestRequest(oversized, {
      authorization: `Bearer ${TOKEN}`,
      'content-type': 'text/html',
    })

    // Act
    const response = await POST(request)

    // Assert
    expect(response.status).toBe(413)
    expect(vi.mocked(putObject)).not.toHaveBeenCalled()
  })

  it('does not reject a valid token request for a cross-site Origin or a missing cookie', async () => {
    // Arrange — a cross-site Origin and no admin_session cookie.
    const request = rawHtmlRequest('<!doctype html>', {
      origin: 'https://evil.example',
    })

    // Act
    const response = await POST(request)

    // Assert — the token path ignores Origin and needs no cookie.
    expect(response.status).toBe(201)
  })
})
