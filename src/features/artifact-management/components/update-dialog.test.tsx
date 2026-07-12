import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { renderWithClient } from '@/testing/render-with-client'
import type { Artifact } from '../types/artifact'
import UpdateDialog from './update-dialog'

const fetchMock = vi.fn()

beforeEach(() => {
  vi.clearAllMocks()
  vi.stubGlobal('fetch', fetchMock)
})

afterEach(() => {
  vi.unstubAllGlobals()
})

const artifact: Artifact = {
  slug: 'my-demo',
  title: 'My Demo',
  createdAt: '2026-07-01T00:00:00.000Z',
  url: 'https://artifacts.iwans.space/my-demo/',
}

const htmlFile = () =>
  new File(['<!doctype html>'], 'new.html', { type: 'text/html' })

/** The dialog's dropzone renders its file input into a portal on document. */
function fileInput(): HTMLInputElement {
  const input = document.querySelector('input[type="file"]')
  if (!(input instanceof HTMLInputElement)) {
    throw new Error('file input not rendered')
  }
  return input
}

describe('UpdateDialog', () => {
  it('replaces the files via PUT to the fixed slug and closes on success', async () => {
    // Arrange
    const user = userEvent.setup()
    fetchMock.mockResolvedValue({ ok: true })
    renderWithClient(<UpdateDialog artifact={artifact} />)
    await user.click(screen.getByRole('button', { name: 'Update artifact' }))
    await user.upload(fileInput(), htmlFile())

    // Act
    await user.click(screen.getByRole('button', { name: 'Replace files' }))

    // Assert
    await waitFor(() =>
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    )
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('/api/artifacts/my-demo')
    expect(init.method).toBe('PUT')
  })

  it('surfaces the server error and stays open on failure', async () => {
    // Arrange
    const user = userEvent.setup()
    fetchMock.mockResolvedValue({
      ok: false,
      json: async () => ({ error: 'update failed' }),
    })
    renderWithClient(<UpdateDialog artifact={artifact} />)
    await user.click(screen.getByRole('button', { name: 'Update artifact' }))
    await user.upload(fileInput(), htmlFile())

    // Act
    await user.click(screen.getByRole('button', { name: 'Replace files' }))

    // Assert
    expect(await screen.findByRole('alert')).toHaveTextContent('update failed')
  })
})
