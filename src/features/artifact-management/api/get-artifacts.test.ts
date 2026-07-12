import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { UnauthorizedError } from '@/lib/react-query'
import type { Artifact } from '../types/artifact'
import { fetchArtifacts } from './get-artifacts'

const fetchMock = vi.fn()

beforeEach(() => {
  vi.stubGlobal('fetch', fetchMock)
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.clearAllMocks()
})

const artifact: Artifact = {
  slug: 'my-demo',
  title: 'My Demo',
  createdAt: '2026-07-01T00:00:00.000Z',
  url: 'https://artifacts.iwans.space/my-demo/',
}

describe('fetchArtifacts', () => {
  it('returns the artifacts array from a successful response', async () => {
    // Arrange
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ artifacts: [artifact] }),
    })

    // Act
    const result = await fetchArtifacts()

    // Assert
    expect(result).toEqual([artifact])
  })

  it('throws UnauthorizedError on a 401 so the global handler can redirect', async () => {
    // Arrange
    fetchMock.mockResolvedValue({ ok: false, status: 401 })

    // Act / Assert
    await expect(fetchArtifacts()).rejects.toBeInstanceOf(UnauthorizedError)
  })

  it('throws a generic error on any other non-OK response', async () => {
    // Arrange
    fetchMock.mockResolvedValue({ ok: false, status: 500 })

    // Act / Assert
    await expect(fetchArtifacts()).rejects.toThrow('Could not load artifacts')
  })
})
