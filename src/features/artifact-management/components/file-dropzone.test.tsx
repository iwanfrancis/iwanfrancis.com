import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import FileDropzone from './file-dropzone'

/**
 * The native file input is the dropzone's hidden plumbing — it deliberately has
 * no accessible handle (the button is the accessible surface), so tests reach
 * it directly to stand in for the OS file dialog.
 */
function fileInput(container: HTMLElement): HTMLInputElement {
  const input = container.querySelector('input[type="file"]')
  if (!(input instanceof HTMLInputElement)) {
    throw new Error('file input not rendered')
  }
  return input
}

const html = new File(['<!doctype html>'], 'demo.html', { type: 'text/html' })

describe('FileDropzone', () => {
  it('reports a file chosen through the file dialog', async () => {
    // Arrange
    const user = userEvent.setup()
    const onFile = vi.fn()
    const { container } = render(<FileDropzone file={null} onFile={onFile} />)

    // Act
    await user.upload(fileInput(container), html)

    // Assert
    expect(onFile).toHaveBeenCalledWith(html)
  })

  it('reports a dropped file', () => {
    // Arrange
    const onFile = vi.fn()
    render(<FileDropzone file={null} onFile={onFile} />)

    // Act — user-event cannot produce drag-and-drop, so fire the drop directly.
    fireEvent.drop(screen.getByRole('button'), {
      dataTransfer: { files: [html] },
    })

    // Assert
    expect(onFile).toHaveBeenCalledWith(html)
  })

  it('invites a choice when empty and shows the chosen file name', () => {
    // Arrange
    const { rerender } = render(<FileDropzone file={null} onFile={vi.fn()} />)

    // Assert (empty) / Act / Assert (chosen)
    expect(
      screen.getByRole('button', { name: /drag & drop/i })
    ).toBeInTheDocument()
    rerender(<FileDropzone file={html} onFile={vi.fn()} />)
    expect(screen.getByRole('button')).toHaveTextContent('demo.html')
  })

  it('clears the native input when the controlled file resets', async () => {
    // Arrange
    const user = userEvent.setup()
    const { container, rerender } = render(
      <FileDropzone file={null} onFile={vi.fn()} />
    )
    await user.upload(fileInput(container), html)
    expect(fileInput(container).files).toHaveLength(1)

    // Act — parent resets the controlled file (e.g. after a successful upload).
    rerender(<FileDropzone file={html} onFile={vi.fn()} />)
    rerender(<FileDropzone file={null} onFile={vi.fn()} />)

    // Assert — the same file can now be picked again.
    expect(fileInput(container).value).toBe('')
  })

  it('disables the dropzone while an upload is pending', () => {
    // Arrange
    render(<FileDropzone file={null} onFile={vi.fn()} disabled />)

    // Assert
    expect(screen.getByRole('button')).toBeDisabled()
  })
})
