import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { SESSION_COOKIE_NAME } from '@/config/auth'
import { deleteArtifact } from '@/features/artifact-management/utils/s3'
import { isValidSlug } from '@/features/artifact-management/utils/validate'
import { verifySession } from '@/features/auth/utils/session'
import { isSameOrigin } from '@/utils/same-origin'

export const runtime = 'nodejs'

// Belt-and-braces auth (see the sibling route): the middleware gates this path,
// but the handler re-verifies so it fails closed regardless of the matcher.
async function hasSession(): Promise<boolean> {
  const token = (await cookies()).get(SESSION_COOKIE_NAME)?.value
  return verifySession(token)
}

/** Delete every object under `<slug>/`. Idempotent on an already-absent slug. */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  if (!isSameOrigin(request)) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }
  if (!(await hasSession())) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const { slug } = await params
  if (!isValidSlug(slug)) {
    return NextResponse.json({ error: 'invalid slug' }, { status: 400 })
  }

  try {
    await deleteArtifact(slug)
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Delete failed', error)
    return NextResponse.json({ error: 'delete failed' }, { status: 500 })
  }
}
