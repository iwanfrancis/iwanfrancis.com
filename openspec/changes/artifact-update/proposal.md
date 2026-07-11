## Why

Hosted artifacts are currently write-once: a slug can be created and deleted, but never updated.
Fixing a typo or shipping a new version of an already-shared artifact means deleting and re-creating
under a new slug — which breaks the link you already handed out. Two earlier decisions deferred this
on purpose (③ rejects a re-used slug; ① serves everything `immutable`), and this change closes both.

## What Changes

- Add **update-in-place**: replace the files behind an existing slug so the already-shared link
  (`artifacts.iwans.space/<slug>/`) serves the new version, without changing the URL.
- New **`PUT /api/artifacts/[slug]`** endpoint = "replace this slug". `POST /api/artifacts` stays
  create-only (still 409 on an existing slug).
- Replace uses **write-new-then-prune** semantics (not a bare overwrite): validate the whole upload,
  write the new entries, rewrite `meta.json`, then delete any object under `<slug>/` not in the new
  set. No downtime; a failed update leaves the previous version intact.
- **Update action on each artifact card** → a dialog scoped to that slug (slug read-only, title
  prefilled, drop a new `.html`/`.zip`).
- `meta.json` preserves the original `createdAt` and gains an optional `updatedAt`. A blank title on
  update keeps the existing title (does not reset to slug).
- **BREAKING (serving contract):** switch `artifact-server` from `Cache-Control: … immutable` to
  **ETag validation caching** for the artifact entrypoint, so updates actually propagate to viewers
  instead of being pinned in their browser cache for up to a year.

## Capabilities

### New Capabilities
<!-- None — this extends two existing capabilities. -->

### Modified Capabilities
- `artifact-hosting`: the serving cache policy changes from long-lived `immutable` to `no-cache` (or
  short `max-age` + `must-revalidate`) plus a passed-through `ETag`, so a re-used slug can serve fresh
  content. (Code lives in the sibling `artifact-server` repo; the spec of record is here.)
- `artifact-management`: add update-in-place — the `PUT` endpoint, replace-then-prune write
  semantics, the `updatedAt` metadata field, and the card Update UI.

## Impact

- **New code (main app):** `PUT` handler in `src/app/api/artifacts/[slug]/route.ts`; a
  replace/prune helper in `src/features/artifact-management/utils/s3.ts`; an Update dialog component
  and card action in `src/features/artifact-management/components/`; `updatedAt` added to the
  `ArtifactMeta`/`Artifact` types.
- **Cross-repo:** a response-header change in `artifact-server` (immutable → ETag). No new secrets;
  the service stays public and read-only.
- **Ops:** verify the Cloudflare Cache Rule for `artifacts.iwans.space` revalidates against origin on
  `no-cache`/`max-age=0` and forwards conditional (`If-None-Match`) requests.
- **Sequencing:** the `artifact-server` ETag switch must land before update-in-place is relied on —
  until it does, updated bytes still serve stale to anyone who cached the old version.
