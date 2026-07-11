import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import LoginForm from './login-form'

const { replace, refresh } = vi.hoisted(() => ({
  replace: vi.fn(),
  refresh: vi.fn(),
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace, refresh }),
}))

const fetchMock = vi.fn()

beforeEach(() => {
  vi.clearAllMocks()
  vi.stubGlobal('fetch', fetchMock)
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('LoginForm', () => {
  it('disables signing in until a password is entered', async () => {
    // Arrange
    const user = userEvent.setup()
    render(<LoginForm next="/artifacts" />)

    // Assert (initial) / Act / Assert
    expect(screen.getByRole('button', { name: 'Sign in' })).toBeDisabled()
    await user.type(screen.getByLabelText('Password'), 'hunter2')
    expect(screen.getByRole('button', { name: 'Sign in' })).toBeEnabled()
  })

  it('posts the password and navigates on to the next path on success', async () => {
    // Arrange
    const user = userEvent.setup()
    fetchMock.mockResolvedValue({ ok: true })
    render(<LoginForm next="/artifacts" />)

    // Act
    await user.type(screen.getByLabelText('Password'), 'hunter2')
    await user.click(screen.getByRole('button', { name: 'Sign in' }))

    // Assert
    expect(fetchMock).toHaveBeenCalledWith('/api/auth', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ password: 'hunter2' }),
    })
    await waitFor(() => expect(replace).toHaveBeenCalledWith('/artifacts'))
    expect(refresh).toHaveBeenCalled()
  })

  it('shows an error and clears the password on a failed attempt', async () => {
    // Arrange
    const user = userEvent.setup()
    fetchMock.mockResolvedValue({ ok: false })
    render(<LoginForm next="/artifacts" />)

    // Act
    await user.type(screen.getByLabelText('Password'), 'wrong-password')
    await user.click(screen.getByRole('button', { name: 'Sign in' }))

    // Assert
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Incorrect password.'
    )
    expect(screen.getByLabelText('Password')).toHaveValue('')
    expect(screen.getByLabelText('Password')).toHaveAttribute(
      'aria-invalid',
      'true'
    )
    expect(screen.getByRole('button', { name: 'Sign in' })).toBeDisabled()
    expect(replace).not.toHaveBeenCalled()
  })
})
