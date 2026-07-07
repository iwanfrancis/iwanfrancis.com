import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { SESSION_COOKIE_NAME } from '@/config/auth'
import { verifySession } from '@/features/auth/utils/session'

export const runtime = 'nodejs'

/**
 * Stub for the artifact-management API. The middleware already gates this path;
 * re-verifying the session here is belt-and-braces so the handler fails closed
 * even if the matcher is ever misconfigured. Returns an empty list for now —
 * real listing/upload arrive in the artifact-management change.
 */
export async function GET() {
  const token = (await cookies()).get(SESSION_COOKIE_NAME)?.value
  if (!(await verifySession(token))) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }
  return NextResponse.json({ artifacts: [] })
}
