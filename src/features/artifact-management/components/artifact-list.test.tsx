import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { makeQueryClient } from '@/lib/react-query'
import { renderWithClient } from '@/testing/render-with-client'
import type { Artifact } from '../types/artifact'
import ArtifactList from './artifact-list'

const fetchMock = vi.fn()
const originalLocation = window.location

const artifactA: Artifact = {
  slug: 'a',
  title: 'Artifact A',
  createdAt: '2026-07-01T00:00:00.000Z',
  url: 'https://artifacts.iwans.space/a/',
}
const artifactB: Artifact = {
  slug: 'b',
  title: 'Artifact B',
  createdAt: '2026-07-02T00:00:00.000Z',
  url: 'https://artifacts.iwans.space/b/',
}

beforeEach(() => {
  vi.stubGlobal('fetch', fetchMock)
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.clearAllMocks()
  Object.defineProperty(window, 'location', {
    configurable: true,
    value: originalLocation,
  })
})

describe('ArtifactList', () => {
  it('renders the seeded listing on first paint without fetching', () => {
    // Arrange / Act
    renderWithClient(<ArtifactList initialData={[artifactA, artifactB]} />)

    // Assert
    expect(screen.getByText('Artifact A')).toBeInTheDocument()
    expect(screen.getByText('Artifact B')).toBeInTheDocument()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('shows the empty state when seeded with no artifacts', () => {
    // Arrange / Act
    renderWithClient(<ArtifactList initialData={[]} />)

    // Assert
    expect(
      screen.getByText('No artifacts yet. Upload one above to get started.')
    ).toBeInTheDocument()
  })

  it('removes a deleted card immediately, before the request resolves', async () => {
    // Arrange
    const user = userEvent.setup()
    fetchMock.mockImplementation((_url, init?: RequestInit) =>
      init?.method === 'DELETE'
        ? Promise.resolve({ ok: true, status: 200 })
        : Promise.resolve({
            ok: true,
            status: 200,
            json: async () => ({ artifacts: [artifactB] }),
          })
    )
    renderWithClient(<ArtifactList initialData={[artifactA, artifactB]} />)

    // Act
    await user.click(
      screen.getAllByRole('button', { name: 'Delete artifact' })[0]
    )
    await user.click(screen.getByRole('button', { name: 'Delete' }))

    // Assert
    await waitFor(() =>
      expect(screen.queryByText('Artifact A')).not.toBeInTheDocument()
    )
    expect(screen.getByText('Artifact B')).toBeInTheDocument()
  })

  it('restores the card when the delete request fails', async () => {
    // Arrange
    const user = userEvent.setup()
    fetchMock.mockImplementation((_url, init?: RequestInit) =>
      init?.method === 'DELETE'
        ? Promise.resolve({ ok: false, status: 500 })
        : Promise.resolve({
            ok: true,
            status: 200,
            json: async () => ({ artifacts: [artifactA, artifactB] }),
          })
    )
    renderWithClient(<ArtifactList initialData={[artifactA, artifactB]} />)

    // Act
    await user.click(
      screen.getAllByRole('button', { name: 'Delete artifact' })[0]
    )
    await user.click(screen.getByRole('button', { name: 'Delete' }))

    // Assert — the optimistic removal rolls back, so the card reappears.
    expect(await screen.findByText('Artifact A')).toBeInTheDocument()
  })

  it('redirects to login when a background listing fetch returns 401', async () => {
    // Arrange
    const assign = vi.fn()
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { pathname: '/artifacts', search: '', assign },
    })
    fetchMock.mockResolvedValue({ ok: false, status: 401 })

    // Act — no initialData, so the query fetches on mount and 401s.
    renderWithClient(<ArtifactList />, { client: makeQueryClient() })

    // Assert
    await waitFor(() =>
      expect(assign).toHaveBeenCalledWith('/login?next=%2Fartifacts')
    )
  })
})
