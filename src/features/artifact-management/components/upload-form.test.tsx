import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import UploadForm from './upload-form'

const { refresh } = vi.hoisted(() => ({ refresh: vi.fn() }))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh }),
}))

const fetchMock = vi.fn()

beforeEach(() => {
  vi.clearAllMocks()
  vi.stubGlobal('fetch', fetchMock)
})

afterEach(() => {
  vi.unstubAllGlobals()
})

/** See file-dropzone.test.tsx — the input is the dropzone's hidden plumbing. */
function fileInput(container: HTMLElement): HTMLInputElement {
  const input = container.querySelector('input[type="file"]')
  if (!(input instanceof HTMLInputElement)) {
    throw new Error('file input not rendered')
  }
  return input
}

const htmlFile = (name = 'My Demo!.html') =>
  new File(['<!doctype html>'], name, { type: 'text/html' })

describe('UploadForm', () => {
  it('disables uploading until a file is chosen and a slug is set', async () => {
    // Arrange
    const user = userEvent.setup()
    const { container } = render(<UploadForm />)

    // Assert (initial) / Act / Assert
    expect(
      screen.getByRole('button', { name: 'Upload artifact' })
    ).toBeDisabled()
    await user.upload(fileInput(container), htmlFile())
    expect(
      screen.getByRole('button', { name: 'Upload artifact' })
    ).toBeEnabled()
  })

  it('suggests a contract-valid slug from the chosen filename', async () => {
    // Arrange
    const user = userEvent.setup()
    const { container } = render(<UploadForm />)

    // Act
    await user.upload(fileInput(container), htmlFile('My Demo!.html'))

    // Assert
    expect(screen.getByLabelText('Slug')).toHaveValue('my-demo')
  })

  it('keeps a manually entered slug when a file is chosen after it', async () => {
    // Arrange
    const user = userEvent.setup()
    const { container } = render(<UploadForm />)

    // Act
    await user.type(screen.getByLabelText('Slug'), 'hand-picked')
    await user.upload(fileInput(container), htmlFile())

    // Assert
    expect(screen.getByLabelText('Slug')).toHaveValue('hand-picked')
  })

  it('posts the form data and resets on success', async () => {
    // Arrange
    const user = userEvent.setup()
    fetchMock.mockResolvedValue({ ok: true })
    const { container } = render(<UploadForm />)
    await user.upload(fileInput(container), htmlFile())
    await user.type(screen.getByLabelText('Title'), 'My demo')

    // Act
    await user.click(screen.getByRole('button', { name: 'Upload artifact' }))

    // Assert
    await waitFor(() => expect(refresh).toHaveBeenCalled())
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('/api/artifacts')
    expect(init.method).toBe('POST')
    expect(init.body).toBeInstanceOf(FormData)
    expect(init.body.get('slug')).toBe('my-demo')
    expect(init.body.get('title')).toBe('My demo')
    expect(screen.getByLabelText('Slug')).toHaveValue('')
    expect(screen.getByLabelText('Title')).toHaveValue('')
  })

  it('surfaces the server error message on a failed upload', async () => {
    // Arrange
    const user = userEvent.setup()
    fetchMock.mockResolvedValue({
      ok: false,
      json: async () => ({ error: 'slug "my-demo" is already in use' }),
    })
    const { container } = render(<UploadForm />)
    await user.upload(fileInput(container), htmlFile())

    // Act
    await user.click(screen.getByRole('button', { name: 'Upload artifact' }))

    // Assert
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'slug "my-demo" is already in use'
    )
    expect(refresh).not.toHaveBeenCalled()
  })

  it('falls back to a generic message when the error body is unreadable', async () => {
    // Arrange
    const user = userEvent.setup()
    fetchMock.mockResolvedValue({
      ok: false,
      json: async () => {
        throw new Error('not json')
      },
    })
    const { container } = render(<UploadForm />)
    await user.upload(fileInput(container), htmlFile())

    // Act
    await user.click(screen.getByRole('button', { name: 'Upload artifact' }))

    // Assert
    expect(await screen.findByRole('alert')).toHaveTextContent('Upload failed.')
  })
})
