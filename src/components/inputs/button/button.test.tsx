import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { Button } from './button'

describe('Button', () => {
  it('renders an accessible button and forwards clicks', async () => {
    // Arrange
    const user = userEvent.setup()
    const onClick = vi.fn()
    render(<Button onClick={onClick}>Save</Button>)

    // Act
    await user.click(screen.getByRole('button', { name: 'Save' }))

    // Assert
    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it('does not fire clicks while disabled', async () => {
    // Arrange
    const user = userEvent.setup()
    const onClick = vi.fn()
    render(
      <Button onClick={onClick} disabled>
        Save
      </Button>
    )

    // Act
    await user.click(screen.getByRole('button', { name: 'Save' }))

    // Assert
    expect(onClick).not.toHaveBeenCalled()
    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled()
  })

  it('renders its child element instead of a button when asChild is set', () => {
    // Arrange
    render(
      <Button asChild>
        <a href="/thingies">Thingies</a>
      </Button>
    )

    // Assert
    expect(screen.getByRole('link', { name: 'Thingies' })).toHaveAttribute(
      'href',
      '/thingies'
    )
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })
})
