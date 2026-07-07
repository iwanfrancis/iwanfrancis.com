import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import type { ReactNode } from 'react'
import { SESSION_COOKIE_NAME } from '@/config/auth'
import { verifySession } from '../utils/session'

type ProtectedRouteProps = {
  children: ReactNode
  /**
   * Where to send an unauthenticated visitor. Defaults to the login page. Pass
   * a `next` hint (e.g. `/login?next=/artifacts`) to return them afterwards.
   */
  redirectTo?: string
}

/**
 * Server-side gate for a page's content. The middleware already turns away
 * unauthenticated requests to gated routes, but wrapping a page in
 * `ProtectedRoute` re-verifies the session here too, so the page fails closed
 * even if the matcher is misconfigured or the middleware is bypassed — the gate
 * never rests on a single mechanism. Async server component: it awaits the
 * check before any wrapped content renders, and `redirect()` short-circuits
 * before `children` are rendered when the session is missing or invalid.
 */
export default async function ProtectedRoute({
  children,
  redirectTo = '/login',
}: ProtectedRouteProps) {
  const token = (await cookies()).get(SESSION_COOKIE_NAME)?.value
  if (!(await verifySession(token))) {
    redirect(redirectTo)
  }
  return <>{children}</>
}
