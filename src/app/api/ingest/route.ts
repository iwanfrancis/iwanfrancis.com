import { NextResponse } from 'next/server'
import type {
  ArtifactMeta,
  UploadSuccess,
} from '@/features/artifact-management/types/artifact'
import { artifactUrl } from '@/features/artifact-management/utils/config'
import { UploadError } from '@/features/artifact-management/utils/extract'
import { putObject, slugExists } from '@/features/artifact-management/utils/s3'
import {
  generateUniqueSlug,
  slugify,
} from '@/features/artifact-management/utils/slug'
import { entriesFromUpload } from '@/features/artifact-management/utils/upload'
import { verifyBearerToken } from '@/features/auth/utils/token'

// AWS SDK + fflate + the node:crypto token compare need Node, so pin off the
// Edge runtime. This route lives OUTSIDE the /api/artifacts* middleware matcher
// on purpose: it authenticates by bearer token, not the admin session cookie, so
// the cookie gate must never intercept it (see src/middleware.ts).
export const runtime = 'nodejs'

const TITLE_HEADER = 'x-artifact-title'

/**
 * Token-authenticated ingest for headless clients — the iOS share Shortcut that
 * fires on Claude's "download HTML". Accepts either a raw HTML body (the
 * Shortcut-native path) or a `multipart/form-data` `file` field, auto-assigns a
 * slug, stores the artifact via the same write path as the admin upload, and
 * returns the public share link.
 *
 * Create-only by design: no listing, update, or delete over token auth. There is
 * deliberately no same-origin/CSRF check — a bearer token is never sent
 * ambiently by a browser, so CSRF cannot apply, and requiring it would falsely
 * imply cookie semantics.
 */
export async function POST(request: Request) {
  if (!verifyBearerToken(request.headers.get('authorization'))) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const contentType = request.headers.get('content-type') ?? ''
  let file: File
  let title: string

  try {
    if (contentType.includes('multipart/form-data')) {
      const form = await request.formData()
      const field = form.get('file')
      if (!(field instanceof File)) {
        return NextResponse.json({ error: 'no file provided' }, { status: 400 })
      }
      file = field
      title = String(form.get('title') ?? '').trim()
    } else {
      // Any non-multipart body is treated as a single HTML document. Naming it
      // `.html` lets the shared upload path map it to index.html.
      const bytes = new Uint8Array(await request.arrayBuffer())
      if (bytes.byteLength === 0) {
        return NextResponse.json(
          { error: 'empty request body' },
          { status: 400 }
        )
      }
      file = new File([bytes], 'index.html', { type: 'text/html' })
      title = (request.headers.get(TITLE_HEADER) ?? '').trim()
    }
  } catch {
    return NextResponse.json(
      { error: 'could not read request body' },
      { status: 400 }
    )
  }

  try {
    // Validate the whole upload (size, kind, and — for a .zip — zip-slip / caps /
    // root-index) before any write, so a rejected upload leaves nothing behind.
    const entries = await entriesFromUpload(file)

    const slug = await generateUniqueSlug(slugify(title), slugExists)

    for (const entry of entries) {
      await putObject(`${slug}/${entry.path}`, entry.bytes, entry.contentType)
    }

    // meta.json is written LAST (as in the admin POST): the listing keys off it,
    // so a mid-upload failure leaves the slug absent rather than half-present.
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
    console.error('Ingest failed', error)
    return NextResponse.json({ error: 'ingest failed' }, { status: 500 })
  }
}
