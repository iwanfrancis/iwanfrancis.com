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
  listArtifacts,
  putObject,
  slugExists,
} from '@/features/artifact-management/utils/s3'
import { entriesFromUpload } from '@/features/artifact-management/utils/upload'
import { isValidSlug } from '@/features/artifact-management/utils/validate'
import { verifySession } from '@/features/auth/utils/session'
import { isSameOrigin } from '@/utils/same-origin'

// AWS SDK + fflate + size checks need Node, so pin off the Edge runtime.
export const runtime = 'nodejs'

/**
 * Belt-and-braces auth: the middleware already gates this path, but each handler
 * re-verifies the session so it fails closed even if the matcher is ever
 * misconfigured.
 */
async function hasSession(): Promise<boolean> {
  const token = (await cookies()).get(SESSION_COOKIE_NAME)?.value
  return verifySession(token)
}

/** List hosted artifacts. */
export async function GET() {
  if (!(await hasSession())) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }
  try {
    return NextResponse.json({ artifacts: await listArtifacts() })
  } catch (error) {
    console.error('Failed to list artifacts', error)
    return NextResponse.json({ error: 'listing failed' }, { status: 500 })
  }
}

/** Upload a single `.html` file or a `.zip` bundle under a chosen slug. */
export async function POST(request: Request) {
  if (!isSameOrigin(request)) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }
  if (!(await hasSession())) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
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
  const slug = String(form.get('slug') ?? '').trim()
  const title = String(form.get('title') ?? '').trim()

  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'no file provided' }, { status: 400 })
  }
  if (!isValidSlug(slug)) {
    return NextResponse.json(
      { error: 'slug must be lowercase letters, digits and single hyphens' },
      { status: 400 }
    )
  }

  try {
    if (await slugExists(slug)) {
      return NextResponse.json(
        { error: `slug "${slug}" is already in use` },
        { status: 409 }
      )
    }

    // Validate the whole upload (size, kind, zip-slip, caps, root index) before
    // any write, so a rejected upload never leaves a partial artifact behind.
    const entries = await entriesFromUpload(file)

    for (const entry of entries) {
      await putObject(`${slug}/${entry.path}`, entry.bytes, entry.contentType)
    }

    // meta.json is written LAST: listing keys off it, so a mid-upload failure
    // leaves the slug absent from the list rather than half-present.
    const meta: ArtifactMeta = {
      slug,
      title: title || slug,
      createdAt: new Date().toISOString(),
    }
    await putObject(
      `${slug}/meta.json`,
      new TextEncoder().encode(JSON.stringify(meta)),
      'application/json'
    )

    const success: UploadSuccess = { slug, url: artifactUrl(slug) }
    return NextResponse.json(success, { status: 201 })
  } catch (error) {
    if (error instanceof UploadError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status }
      )
    }
    console.error('Upload failed', error)
    return NextResponse.json({ error: 'upload failed' }, { status: 500 })
  }
}
