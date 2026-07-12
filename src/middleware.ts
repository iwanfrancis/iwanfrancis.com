import { type NextRequest, NextResponse } from 'next/server'
import { SESSION_COOKIE_NAME } from '@/config/auth'
import { verifySession } from '@/features/auth/utils/session'

/**
 * Gates the admin surface. A valid session passes through; otherwise API paths
 * get a 401 and page paths are redirected to /login with a `next` hint. The
 * matcher is deliberately narrow — it never touches the public site, framework
 * internals, static assets, or the auth/login endpoints.
 */
export async function middleware(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value
  if (await verifySession(token)) {
    return NextResponse.next()
  }

  const { pathname } = request.nextUrl
  if (pathname.startsWith('/api/')) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const loginUrl = request.nextUrl.clone()
  loginUrl.pathname = '/login'
  loginUrl.search = ''
  loginUrl.searchParams.set('next', pathname)
  return NextResponse.redirect(loginUrl)
}

export const config = {
  // NB: `/api/ingest` is deliberately absent. That route is token-authenticated
  // (bearer, not the admin session cookie) and must stay outside this cookie
  // gate — adding it here would 401 every ingest request. See
  // src/app/api/ingest/route.ts.
  matcher: [
    '/artifacts',
    '/artifacts/:path*',
    '/api/artifacts',
    '/api/artifacts/:path*',
  ],
}
