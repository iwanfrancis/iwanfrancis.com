'use client'

import { useRouter } from 'next/navigation'
import { type FormEvent, useState } from 'react'
import { Button } from '@/components/inputs/button/button'
import { Input } from '@/components/inputs/input/input'

type LoginFormProps = {
  next: string
}

export default function LoginForm({ next }: LoginFormProps) {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [error, setError] = useState(false)
  const [pending, setPending] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setPending(true)
    setError(false)

    const response = await fetch('/api/auth', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ password }),
    })

    if (response.ok) {
      router.replace(next)
      router.refresh()
      return
    }

    setPending(false)
    setError(true)
    setPassword('')
  }

  return (
    <form onSubmit={handleSubmit} className="flex w-full flex-col gap-4">
      <label
        htmlFor="admin-password"
        className="flex flex-col gap-2 text-sm font-medium"
      >
        Password
        <Input
          id="admin-password"
          name="password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          aria-invalid={error}
        />
      </label>
      {error && (
        <p role="alert" className="text-destructive text-sm">
          Incorrect password.
        </p>
      )}
      <Button type="submit" disabled={pending || password.length === 0}>
        {pending ? 'Signing in…' : 'Sign in'}
      </Button>
    </form>
  )
}
