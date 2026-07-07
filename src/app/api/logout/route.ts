import { NextResponse } from 'next/server'
import { SESSION_COOKIE_NAME } from '@/config/auth'
import { clearedSessionCookieOptions } from '@/features/auth/utils/cookie'

export const runtime = 'nodejs'

export async function POST() {
  const response = NextResponse.json({ ok: true })
  response.cookies.set(SESSION_COOKIE_NAME, '', clearedSessionCookieOptions())
  return response
}
