import { cookies } from 'next/headers'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { SESSION_COOKIE_NAME } from '@/config/auth'
import {
  deleteArtifact,
  getArtifactMeta,
  pruneArtifact,
  putObject,
  slugExists,
} from '@/features/artifact-management/utils/s3'
import { createSessionToken } from '@/features/auth/utils/session'
import { DELETE, PUT } from './route'

vi.mock('next/headers', () => ({ cookies: vi.fn() }))
vi.mock('@/features/artifact-management/utils/s3', () => ({
  deleteArtifact: vi.fn(),
  getArtifactMeta: vi.fn(),
  pruneArtifact: vi.fn(),
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

const params = (slug: string) => ({ params: Promise.resolve({ slug }) })

function deleteRequest(headers: Record<string, string> = {}): Request {
  return new Request('https://iwans.space/api/artifacts/my-demo', {
    method: 'DELETE',
    headers,
  })
}

function putRequest(
  fields: Record<string, string | File>,
  headers: Record<string, string> = {}
): Request {
  const body = new FormData()
  for (const [name, value] of Object.entries(fields)) {
    body.set(name, value)
  }
  return new Request('https://iwans.space/api/artifacts/my-demo', {
    method: 'PUT',
    headers,
    body,
  })
}

const htmlFile = (contents = '<!doctype html>') =>
  new File([contents], 'new.html', { type: 'text/html' })

beforeEach(() => {
  vi.resetAllMocks()
  vi.stubEnv('SESSION_SECRET', 'test-session-secret')
})

afterEach(() => {
  vi.unstubAllEnvs()
  vi.restoreAllMocks()
})

describe('DELETE /api/artifacts/[slug]', () => {
  it('rejects a cross-site request', async () => {
    // Arrange
    signOut()

    // Act
    const response = await DELETE(
      deleteRequest({ origin: 'https://evil.example' }),
      params('my-demo')
    )

    // Assert
    expect(response.status).toBe(403)
  })

  it('rejects a request without a session', async () => {
    // Arrange
    signOut()

    // Act
    const response = await DELETE(deleteRequest(), params('my-demo'))

    // Assert
    expect(response.status).toBe(401)
    expect(vi.mocked(deleteArtifact)).not.toHaveBeenCalled()
  })

  it('rejects an invalid slug', async () => {
    // Arrange
    await signIn()

    // Act
    const response = await DELETE(deleteRequest(), params('Bad Slug'))

    // Assert
    expect(response.status).toBe(400)
    expect(vi.mocked(deleteArtifact)).not.toHaveBeenCalled()
  })

  it('deletes the slug prefix and reports ok', async () => {
    // Arrange
    await signIn()

    // Act
    const response = await DELETE(deleteRequest(), params('my-demo'))

    // Assert
    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ ok: true })
    expect(vi.mocked(deleteArtifact)).toHaveBeenCalledWith('my-demo')
  })

  it('maps a storage failure to a 500', async () => {
    // Arrange
    await signIn()
    vi.mocked(deleteArtifact).mockRejectedValue(new Error('bucket down'))
    vi.spyOn(console, 'error').mockImplementation(() => {})

    // Act
    const response = await DELETE(deleteRequest(), params('my-demo'))

    // Assert
    expect(response.status).toBe(500)
  })
})

describe('PUT /api/artifacts/[slug]', () => {
  it('returns 404 for a slug that does not exist at all', async () => {
    // Arrange
    await signIn()
    vi.mocked(getArtifactMeta).mockResolvedValue(null)
    vi.mocked(slugExists).mockResolvedValue(false)

    // Act
    const response = await PUT(
      putRequest({ file: htmlFile() }),
      params('my-demo')
    )

    // Assert
    expect(response.status).toBe(404)
    expect(vi.mocked(putObject)).not.toHaveBeenCalled()
  })

  it('rejects a submission without a file', async () => {
    // Arrange
    await signIn()

    // Act
    const response = await PUT(putRequest({}), params('my-demo'))

    // Assert
    expect(response.status).toBe(400)
    expect(await response.json()).toEqual({ error: 'no file provided' })
  })

  it('replaces the files, preserves createdAt, and prunes stale objects last', async () => {
    // Arrange
    await signIn()
    vi.mocked(getArtifactMeta).mockResolvedValue({
      slug: 'my-demo',
      title: 'Original title',
      createdAt: '2026-01-01T00:00:00.000Z',
    })

    // Act
    const response = await PUT(
      putRequest({ file: htmlFile('<h1>v2</h1>') }),
      params('my-demo')
    )

    // Assert
    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({
      slug: 'my-demo',
      url: 'https://artifacts.iwans.space/my-demo/',
    })

    const putCalls = vi.mocked(putObject).mock.calls
    expect(putCalls.map((call) => call[0])).toEqual([
      'my-demo/index.html',
      'my-demo/meta.json',
    ])
    const meta = JSON.parse(new TextDecoder().decode(putCalls.at(-1)?.[1]))
    expect(meta).toEqual({
      slug: 'my-demo',
      title: 'Original title',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: expect.any(String),
    })

    expect(vi.mocked(pruneArtifact)).toHaveBeenCalledWith(
      'my-demo',
      new Set(['my-demo/index.html', 'my-demo/meta.json'])
    )
    // The prune must come after the fresh meta.json write, so a failure
    // in between leaves the previous version servable.
    const metaOrder = vi.mocked(putObject).mock.invocationCallOrder.at(-1)
    const pruneOrder = vi.mocked(pruneArtifact).mock.invocationCallOrder[0]
    expect(pruneOrder).toBeGreaterThan(metaOrder ?? Infinity)
  })

  it('takes a newly supplied title over the stored one', async () => {
    // Arrange
    await signIn()
    vi.mocked(getArtifactMeta).mockResolvedValue({
      slug: 'my-demo',
      title: 'Original title',
      createdAt: '2026-01-01T00:00:00.000Z',
    })

    // Act
    await PUT(
      putRequest({ file: htmlFile(), title: 'New title' }),
      params('my-demo')
    )

    // Assert
    const meta = JSON.parse(
      new TextDecoder().decode(vi.mocked(putObject).mock.calls.at(-1)?.[1])
    )
    expect(meta.title).toBe('New title')
  })

  it('still updates a slug whose meta.json is unreadable, titling it by slug', async () => {
    // Arrange
    await signIn()
    vi.mocked(getArtifactMeta).mockResolvedValue(null)
    vi.mocked(slugExists).mockResolvedValue(true)

    // Act
    const response = await PUT(
      putRequest({ file: htmlFile() }),
      params('my-demo')
    )

    // Assert
    expect(response.status).toBe(200)
    const meta = JSON.parse(
      new TextDecoder().decode(vi.mocked(putObject).mock.calls.at(-1)?.[1])
    )
    expect(meta.title).toBe('my-demo')
    expect(meta.createdAt).toEqual(expect.any(String))
  })

  it('maps an unsupported replacement file to a 400 without writing', async () => {
    // Arrange
    await signIn()
    vi.mocked(getArtifactMeta).mockResolvedValue({
      slug: 'my-demo',
      title: 'Original title',
      createdAt: '2026-01-01T00:00:00.000Z',
    })
    const file = new File(['notes'], 'notes.txt', { type: 'text/plain' })

    // Act
    const response = await PUT(putRequest({ file }), params('my-demo'))

    // Assert
    expect(response.status).toBe(400)
    expect(vi.mocked(putObject)).not.toHaveBeenCalled()
    expect(vi.mocked(pruneArtifact)).not.toHaveBeenCalled()
  })
})
