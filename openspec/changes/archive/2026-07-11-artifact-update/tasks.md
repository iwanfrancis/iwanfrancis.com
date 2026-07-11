## 1. artifact-server: validation caching (sibling repo — land first)

- [x] 1.1 Replace the served `Cache-Control: public, max-age=31536000, immutable` with a revalidatable
  header (`max-age=60, must-revalidate`, or `no-cache`) on successful artifact responses
- [x] 1.2 Emit a strong `ETag` on 200 responses, passed through from the S3 object's ETag
- [x] 1.3 Honour conditional requests: return `304 Not Modified` (no body) when `If-None-Match` matches
  the current object's ETag
- [x] 1.4 Deploy artifact-server; confirm response headers show the new `Cache-Control` + `ETag` and no
  `immutable` — _verified: origin serves `public, max-age=60, must-revalidate` + strong `ETag`, no `immutable`_
- [x] 1.5 Verify the Cloudflare Cache Rule revalidates against origin (inspect `cf-cache-status`) and
  forwards `If-None-Match` — i.e. an unchanged re-request 304s and an updated object serves fresh —
  _verified: `cf-cache-status: REVALIDATED`, conditional GET returns `304` through the CDN. Required
  three Cloudflare settings: purge; Browser Cache TTL = "Respect Existing Headers" (was forcing 4h);
  and enabling the ETag pass-through setting (was disabled, which had been stripping the ETag)_

## 2. Main app: metadata & types

- [x] 2.1 Add optional `updatedAt` (ISO-8601) to `ArtifactMeta` and `Artifact` in
  `src/features/artifact-management/types/artifact.ts`
- [x] 2.2 Surface `updatedAt` when reading meta in `s3.ts` `readArtifactMeta` (fall through to `createdAt`
  when absent)

## 3. Main app: replace-then-prune write helper

- [x] 3.1 Add a helper in `src/features/artifact-management/utils/s3.ts` that reads the current
  `<slug>/meta.json` (for `createdAt` and existing title), returning null when the slug does not exist
- [x] 3.2 Add a prune step that deletes every key under `<slug>/` not present in a provided keep-set
  (the newly written entry keys plus `meta.json`), reusing the paginated list/delete logic
- [x] 3.3 Ensure ordering is validate → write new entries → write meta → prune, so a failure before the
  prune leaves the previous version servable

## 4. Main app: PUT endpoint

- [x] 4.1 Add `PUT` to `src/app/api/artifacts/[slug]/route.ts` with the same guards as POST/DELETE
  (same-origin check, session check, `runtime = 'nodejs'`)
- [x] 4.2 Validate the slug and require it to already exist; return 404 when it does not, writing nothing
- [x] 4.3 Parse the multipart body (file + optional title), classify by extension, and run the same
  validation as create (single-`.html` path or `extractZip`, caps, root `index.html`)
- [x] 4.4 Write new entries, then rewrite `meta.json` preserving the original `createdAt`, setting
  `updatedAt`, and keeping the existing title when the submitted title is blank
- [x] 4.5 Prune superseded keys, then respond with the slug and unchanged share URL
- [x] 4.6 Map `UploadError` to its status and other failures to 500, matching the POST handler

## 5. Main app: update UI

- [x] 5.1 Extract the drag/drop + file-picker dropzone out of `UploadForm` into a shared component used
  by both the create form and the update dialog (no behaviour change to create) — `file-dropzone.tsx`
- [x] 5.2 Build an update dialog scoped to one artifact: slug shown read-only, current title prefilled,
  new-file dropzone; submits via `PUT /api/artifacts/[slug]` — `update-dialog.tsx` (+ new `Dialog` primitive)
- [x] 5.3 Add an Update action to `artifact-card.tsx` that opens the dialog; relayout the action row for a
  4th action (2×2 grid or overflow menu) — 2×2 grid; card now shows "Updated <date>" when present
- [x] 5.4 On success, `router.refresh()` the listing; show inline errors on failure (mirroring the upload
  form) and a pending state on the submit button

## 6. Verify

- [x] 6.1 Upload v1, open the link, update to v2 → the same link serves v2 on next load (confirm via the
  `If-None-Match`/304 round-trip, not just a bucket diff) — _confirmed working (user-verified end-to-end)_
- [x] 6.2 Update a multi-file artifact to a version with a file removed → the orphaned key is gone and the
  link still renders — _confirmed working (user-verified)_
- [x] 6.3 A failed/invalid update (zip-slip or no root `index.html`) leaves v1 intact and still served —
  _confirmed working (user-verified)_
- [x] 6.4 Blank title on update keeps the existing title; `createdAt` unchanged and `updatedAt` set —
  _confirmed working (user-verified)_
- [x] 6.5 `PUT` is refused without a valid same-origin + session, and 404s on a non-existent slug —
  _auth-refusal (401) verified against dev; the 404 path needs an admin session_
- [x] 6.6 `yarn lint` passes
