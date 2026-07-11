import { strToU8, zipSync } from 'fflate'
import { cookies } from 'next/headers'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { SESSION_COOKIE_NAME } from '@/config/auth'
import type { Artifact } from '@/features/artifact-management/types/artifact'
import {
  listArtifacts,
  putObject,
  slugExists,
} from '@/features/artifact-management/utils/s3'
import { createSessionToken } from '@/features/auth/utils/session'
import { GET, POST } from './route'

vi.mock('next/headers', () => ({ cookies: vi.fn() }))
vi.mock('@/features/artifact-management/utils/s3', () => ({
  listArtifacts: vi.fn(),
  putObject: vi.fn(),
  slugExists: vi.fn(),
}))

type CookieJar = Awaited<ReturnType<typeof cookies>>

async function signIn(): Promise<void> {
  const token = await createSessionToken()
  vi.mocked(cookies).mockResolvedValue({
    get: (name: string) =>
      name === SESSION_COOKIE_NAME ? { name, value: token } : undefined,
  } as unknown as CookieJar)
}

function signOut(): void {
  vi.mocked(cookies).mockResolvedValue({
    get: () => undefined,
  } as unknown as CookieJar)
}

function uploadRequest(
  fields: Record<string, string | File>,
  headers: Record<string, string> = {}
): Request {
  const body = new FormData()
  for (const [name, value] of Object.entries(fields)) {
    body.set(name, value)
  }
  return new Request('https://iwans.space/api/artifacts', {
    method: 'POST',
    headers,
    body,
  })
}

const htmlFile = (name = 'demo.html', contents = '<!doctype html>') =>
  new File([contents], name, { type: 'text/html' })

beforeEach(() => {
  vi.resetAllMocks()
  vi.stubEnv('SESSION_SECRET', 'test-session-secret')
})

afterEach(() => {
  vi.unstubAllEnvs()
  vi.restoreAllMocks()
})

describe('GET /api/artifacts', () => {
  it('rejects a request without a session', async () => {
    // Arrange
    signOut()

    // Act
    const response = await GET()

    // Assert
    expect(response.status).toBe(401)
    expect(vi.mocked(listArtifacts)).not.toHaveBeenCalled()
  })

  it('returns the artifact listing for a signed-in session', async () => {
    // Arrange
    await signIn()
    const artifacts: Artifact[] = [
      {
        slug: 'my-demo',
        title: 'My demo',
        createdAt: '2026-07-01T00:00:00.000Z',
        url: 'https://artifacts.iwans.space/my-demo/',
      },
    ]
    vi.mocked(listArtifacts).mockResolvedValue(artifacts)

    // Act
    const response = await GET()

    // Assert
    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ artifacts })
  })

  it('maps a listing failure to a 500', async () => {
    // Arrange
    await signIn()
    vi.mocked(listArtifacts).mockRejectedValue(new Error('bucket down'))
    vi.spyOn(console, 'error').mockImplementation(() => {})

    // Act
    const response = await GET()

    // Assert
    expect(response.status).toBe(500)
  })
})

describe('POST /api/artifacts', () => {
  it('rejects a cross-site request before anything else', async () => {
    // Arrange
    signOut()
    const request = uploadRequest(
      { file: htmlFile(), slug: 'my-demo' },
      { origin: 'https://evil.example' }
    )

    // Act
    const response = await POST(request)

    // Assert
    expect(response.status).toBe(403)
  })

  it('rejects a request without a session', async () => {
    // Arrange
    signOut()

    // Act
    const response = await POST(
      uploadRequest({ file: htmlFile(), slug: 'my-demo' })
    )

    // Assert
    expect(response.status).toBe(401)
    expect(vi.mocked(putObject)).not.toHaveBeenCalled()
  })

  it('rejects a body that is not multipart form data', async () => {
    // Arrange
    await signIn()
    const request = new Request('https://iwans.space/api/artifacts', {
      method: 'POST',
      body: 'plain text',
    })

    // Act
    const response = await POST(request)

    // Assert
    expect(response.status).toBe(400)
    expect(await response.json()).toEqual({
      error: 'expected multipart form data',
    })
  })

  it('rejects a submission without a file', async () => {
    // Arrange
    await signIn()

    // Act
    const response = await POST(uploadRequest({ slug: 'my-demo' }))

    // Assert
    expect(response.status).toBe(400)
    expect(await response.json()).toEqual({ error: 'no file provided' })
  })

  it.each([
    'My Demo',
    'my--demo',
    '-demo',
    '',
  ])('rejects the invalid slug %j', async (slug) => {
    await signIn()
    const response = await POST(uploadRequest({ file: htmlFile(), slug }))
    expect(response.status).toBe(400)
  })

  it('rejects a slug that is already in use without writing', async () => {
    // Arrange
    await signIn()
    vi.mocked(slugExists).mockResolvedValue(true)

    // Act
    const response = await POST(
      uploadRequest({ file: htmlFile(), slug: 'taken' })
    )

    // Assert
    expect(response.status).toBe(409)
    expect(vi.mocked(putObject)).not.toHaveBeenCalled()
  })

  it('rejects an unsupported file kind', async () => {
    // Arrange
    await signIn()
    vi.mocked(slugExists).mockResolvedValue(false)
    const file = new File(['notes'], 'notes.txt', { type: 'text/plain' })

    // Act
    const response = await POST(uploadRequest({ file, slug: 'my-demo' }))

    // Assert
    expect(response.status).toBe(400)
    expect(vi.mocked(putObject)).not.toHaveBeenCalled()
  })

  it('stores a single html upload as index.html, writing meta.json last', async () => {
    // Arrange
    await signIn()
    vi.mocked(slugExists).mockResolvedValue(false)
    const html = '<!doctype html><h1>hi</h1>'

    // Act
    const response = await POST(
      uploadRequest({
        file: htmlFile('My Demo.html', html),
        slug: 'my-demo',
        title: 'My demo',
      })
    )

    // Assert
    expect(response.status).toBe(201)
    expect(await response.json()).toEqual({
      slug: 'my-demo',
      url: 'https://artifacts.iwans.space/my-demo/',
    })

    const calls = vi.mocked(putObject).mock.calls
    expect(calls[0]).toEqual([
      'my-demo/index.html',
      new TextEncoder().encode(html),
      'text/html',
    ])
    expect(calls.at(-1)?.[0]).toBe('my-demo/meta.json')
    const meta = JSON.parse(new TextDecoder().decode(calls.at(-1)?.[1]))
    expect(meta).toEqual({
      slug: 'my-demo',
      title: 'My demo',
      createdAt: expect.any(String),
    })
  })

  it('extracts a zip upload and writes every entry under the slug', async () => {
    // Arrange
    await signIn()
    vi.mocked(slugExists).mockResolvedValue(false)
    const archive = zipSync({
      'index.html': strToU8('<!doctype html>'),
      'assets/app.js': strToU8('console.log(1)'),
    })
    const file = new File([archive as BlobPart], 'bundle.zip', {
      type: 'application/zip',
    })

    // Act
    const response = await POST(uploadRequest({ file, slug: 'my-demo' }))

    // Assert
    expect(response.status).toBe(201)
    const keys = vi.mocked(putObject).mock.calls.map((call) => call[0])
    expect(keys).toEqual([
      'my-demo/index.html',
      'my-demo/assets/app.js',
      'my-demo/meta.json',
    ])
  })

  it('falls back to the slug as title when none is given', async () => {
    // Arrange
    await signIn()
    vi.mocked(slugExists).mockResolvedValue(false)

    // Act
    await POST(uploadRequest({ file: htmlFile(), slug: 'my-demo' }))

    // Assert
    const metaCall = vi.mocked(putObject).mock.calls.at(-1)
    const meta = JSON.parse(new TextDecoder().decode(metaCall?.[1]))
    expect(meta.title).toBe('my-demo')
  })

  it('maps an invalid zip to the UploadError status', async () => {
    // Arrange
    await signIn()
    vi.mocked(slugExists).mockResolvedValue(false)
    const archive = zipSync({ 'style.css': strToU8('body {}') })
    const file = new File([archive as BlobPart], 'bundle.zip', {
      type: 'application/zip',
    })

    // Act
    const response = await POST(uploadRequest({ file, slug: 'my-demo' }))

    // Assert
    expect(response.status).toBe(400)
    expect((await response.json()).error).toMatch(/index\.html/)
    expect(vi.mocked(putObject)).not.toHaveBeenCalled()
  })
})
