## Why

Storage/serving (`artifact-hosting`, ①) and the admin gate (`auth`, ②) have shipped, but there
is still no way to actually put an artifact into the bucket from a browser — uploading is manual
S3-CLI work and the gated `/artifacts` page is an empty shell. This change adds the self-serve
surface: upload an artifact, pick its slug, and see/manage what's hosted, all behind the existing
gate. It's the last of the three sequenced changes in `openspec/notes/artifact-hosting-roadmap.md`.

## What Changes

- **Upload API** (`POST /api/artifacts`, gated): accept either a single `.html` file or a `.zip`
  bundle plus a chosen slug and title. Validate the slug against the storage contract, reject a
  slug already in use (safe default), then write the artifact's objects and a `meta.json` into the
  Railway Bucket under `<slug>/`.
- **Safe unzip**: extract `.zip` bundles in-memory with a **zip-slip guard** (reject any entry that
  escapes the `<slug>/` prefix) and total-size / per-file / entry-count caps. Set each object's
  `Content-Type` from its file extension on write.
- **Listing** (`GET /api/artifacts`, gated): replace the current stub with a real bucket listing —
  read `<slug>/meta.json` per prefix via `ListObjectsV2` and return title, slug, created date, and
  share link. No database; the bucket stays the source of truth.
- **Delete** (`DELETE /api/artifacts/<slug>`, gated): remove all objects under a slug prefix.
- **Management UI**: replace the empty `/artifacts` shell with a drag-and-drop upload form and a
  list of hosted artifacts (title, created date, share link + copy-link, delete).
- **Dependency**: add `@aws-sdk/client-s3` (write + list + delete) and a small in-memory unzip
  library to the main app.
- Small refactor: promote the auth route's inline same-origin CSRF check to a shared util so the
  new write endpoints reuse it rather than duplicating it.

## Capabilities

### New Capabilities
- `artifact-management`: authenticated upload (single-file and zip, with a zip-slip-safe extractor
  and size caps), server-side listing, and deletion of hosted artifacts — the browser-driven admin
  surface over the `artifact-hosting` storage contract.

### Modified Capabilities
<!-- None. The `auth` gate already covers /artifacts and /api/artifacts(/*), and the
     `artifact-hosting` storage contract and serving path are unchanged — this change only writes
     objects that conform to them. -->

## Impact

- **Code (main app, `iwanfrancis.com`)**: new `src/features/artifact-management/` (S3 client +
  config, slug/upload validation, zip-slip-safe extraction, extension→MIME map); real handlers at
  `src/app/api/artifacts/route.ts` (GET+POST) and a new `src/app/api/artifacts/[slug]/route.ts`
  (DELETE); management UI in `src/app/(admin)/artifacts/page.tsx`; a shared
  `src/utils/same-origin.ts` (extracted from `src/app/api/auth/route.ts`).
- **Dependencies**: `@aws-sdk/client-s3` and an unzip library (recommend `fflate`).
- **Environment (main app service only)**: S3/bucket connection variables so the app can write and
  list. Reuses the same Railway Bucket / key pair as `artifact-server`; the write credentials MUST
  NOT be added to the `artifact-server` service, and the admin cookie stays host-only — both
  origin-isolation invariants from ① / ② are preserved.
- **Unchanged**: `artifact-server` (already serves whatever lands in the bucket); the public site.
