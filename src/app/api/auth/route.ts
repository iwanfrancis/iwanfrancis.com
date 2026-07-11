import { NextResponse } from 'next/server'
import { SESSION_COOKIE_NAME } from '@/config/auth'
import { sessionCookieOptions } from '@/features/auth/utils/cookie'
import { verifyPassword } from '@/features/auth/utils/password'
import { createSessionToken } from '@/features/auth/utils/session'
import { isSameOrigin } from '@/utils/same-origin'

// Pinned to the Node runtime so the raw-password comparison can use node:crypto
// and never touches the Edge (middleware) path.
export const runtime = 'nodejs'

export async function POST(request: Request) {
  if (!isSameOrigin(request)) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }

  let password: unknown
  try {
    password = (await request.json())?.password
  } catch {
    password = undefined
  }

  if (typeof password !== 'string' || !verifyPassword(password)) {
    return NextResponse.json({ error: 'invalid credentials' }, { status: 401 })
  }

  const response = NextResponse.json({ ok: true })
  response.cookies.set(
    SESSION_COOKIE_NAME,
    await createSessionToken(),
    sessionCookieOptions()
  )
  return response
}
