import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { SESSION_COOKIE_NAME } from '@/config/auth'
import type {
  ArtifactMeta,
  UploadSuccess,
} from '@/features/artifact-management/types/artifact'
import { artifactUrl } from '@/features/artifact-management/utils/config'
import { UploadError } from '@/features/artifact-management/utils/extract'
import {
  deleteArtifact,
  getArtifactMeta,
  pruneArtifact,
  putObject,
  slugExists,
} from '@/features/artifact-management/utils/s3'
import { entriesFromUpload } from '@/features/artifact-management/utils/upload'
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

/**
 * Replace an existing artifact's files in place, keeping the same slug (and so
 * the same public share link). The whole new upload is validated before any
 * write; new entries and a fresh `meta.json` are written, then objects from the
 * previous version that the new upload no longer contains are pruned. A failure
 * before the prune therefore leaves the previous version servable. Creating a
 * new slug is `POST`'s job — a `PUT` to an absent slug is a 404.
 */
export async function PUT(
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

  let form: FormData
  try {
    form = await request.formData()
  } catch {
    return NextResponse.json(
      { error: 'expected multipart form data' },
      { status: 400 }
    )
  }

  const file = form.get('file')
  const title = String(form.get('title') ?? '').trim()

  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'no file provided' }, { status: 400 })
  }

  try {
    // Update targets an existing slug. Read its meta for createdAt/title; fall
    // back to a prefix check so a slug with objects but no readable meta still
    // updates rather than 404ing.
    const existing = await getArtifactMeta(slug)
    if (!existing && !(await slugExists(slug))) {
      return NextResponse.json({ error: 'artifact not found' }, { status: 404 })
    }

    // Validate the whole upload before touching the bucket, so an invalid
    // replacement leaves the existing artifact intact.
    const entries = await entriesFromUpload(file)

    for (const entry of entries) {
      await putObject(`${slug}/${entry.path}`, entry.bytes, entry.contentType)
    }

    // Preserve the original createdAt, stamp updatedAt, and keep the existing
    // title when none is supplied (a blank title must not wipe it).
    const now = new Date().toISOString()
    const metaKey = `${slug}/meta.json`
    const meta: ArtifactMeta = {
      slug,
      title: title || existing?.title || slug,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    }
    await putObject(
      metaKey,
      new TextEncoder().encode(JSON.stringify(meta)),
      'application/json'
    )

    // Remove any object from the previous version this upload no longer contains.
    const keep = new Set([
      ...entries.map((entry) => `${slug}/${entry.path}`),
      metaKey,
    ])
    await pruneArtifact(slug, keep)

    const success: UploadSuccess = { slug, url: artifactUrl(slug) }
    return NextResponse.json(success)
  } catch (error) {
    if (error instanceof UploadError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status }
      )
    }
    console.error('Update failed', error)
    return NextResponse.json({ error: 'update failed' }, { status: 500 })
  }
}
