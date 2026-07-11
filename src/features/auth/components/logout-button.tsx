'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Button } from '@/components/inputs/button/button'

export default function LogoutButton() {
  const router = useRouter()
  const [pending, setPending] = useState(false)

  async function handleLogout() {
    setPending(true)
    await fetch('/api/logout', { method: 'POST' })
    router.replace('/login')
    router.refresh()
  }

  return (
    <Button
      variant="outline"
      className="min-w-32"
      onClick={handleLogout}
      disabled={pending}
    >
      {pending ? 'Signing out…' : 'Sign out'}
    </Button>
  )
}
