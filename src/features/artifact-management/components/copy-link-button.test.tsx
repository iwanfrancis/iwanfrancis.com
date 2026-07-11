import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import CopyLinkButton from './copy-link-button'

const URL = 'https://artifacts.iwans.space/my-demo/'

describe('CopyLinkButton', () => {
  it('copies the share URL and flashes a confirmation that reverts', async () => {
    // Arrange
    const user = userEvent.setup()
    render(<CopyLinkButton url={URL} />)

    // Act
    await user.click(screen.getByRole('button', { name: 'Copy share link' }))

    // Assert
    expect(
      screen.getByRole('button', { name: 'Link copied' })
    ).toBeInTheDocument()
    expect(await window.navigator.clipboard.readText()).toBe(URL)

    // Assert — the confirmation flash reverts after its 1.5s timeout.
    expect(
      await screen.findByRole(
        'button',
        { name: 'Copy share link' },
        { timeout: 2500 }
      )
    ).toBeInTheDocument()
  })
})
