## Context

This is change ③ of the artifact-hosting trio (see `openspec/notes/artifact-hosting-roadmap.md`).
① (`artifact-hosting`) and ② (`auth`) have shipped:

- **Storage contract** (`openspec/specs/artifact-hosting/spec.md`): each artifact is an object-key
  prefix `<slug>/` in a Railway Bucket holding `index.html`, any assets, and `meta.json`
  (`{ slug, title, createdAt }`, `createdAt` ISO-8601). Slug =
  `^[a-z0-9]+(-[a-z0-9]+)*$`. The bucket is the sole source of truth — **no database**. Content is
  served publicly, immutably-cached, from the separate `artifact-server` service at
  `artifacts.iwans.space`.
- **The gate** (`openspec/specs/auth/spec.md`): a signed, host-only `admin_session` cookie. The
  middleware (`src/middleware.ts`) already gates `/artifacts`, `/artifacts/:path*`, `/api/artifacts`
  and `/api/artifacts/:path*`. `src/app/api/artifacts/route.ts` is a stub returning `{ artifacts: [] }`
  and re-verifies the session belt-and-braces. `src/app/(admin)/artifacts/page.tsx` is an empty shell.

The `artifact-server` sibling repo already implements the S3 client and slug/path validation we
mirror here (`../artifact-server/src/{s3,paths,config}.ts`) — this change is the *write* side of the
same contract, living in the main app.

## Goals / Non-Goals

**Goals:**

- A gated `POST /api/artifacts` that accepts a single `.html` file **or** a `.zip` bundle plus a
  chosen slug and title, and writes a contract-conforming artifact (`index.html`, assets,
  `meta.json`) to the bucket.
- Safe zip extraction: a **zip-slip guard** and total-size / per-file / entry-count caps.
- A real `GET /api/artifacts` listing, read from the bucket, and a `DELETE /api/artifacts/<slug>`.
- A drag-and-drop `/artifacts` management UI: upload form + a list of hosted artifacts with share
  link, copy-link, and delete.

**Non-Goals:**

- Any change to `artifact-server` or the serving path — it already serves whatever lands in the
  bucket.
- Editing an artifact in place, versioning, or slug rename (slugs are immutable; re-upload under a
  new slug).
- Overwriting an existing slug or cache purge (rejected as a duplicate instead — see Decisions).
- Multi-user accounts, per-artifact permissions, or an audit log (single-admin tool).
- A test suite (repo has none yet).

## Decisions

### S3 access: reuse `artifact-server`'s Bucket + key, prefixed env vars on the main app only

The main app needs **write + list + delete**. Per ①, Railway issues a **single full-access** key
pair — there is no read-only scope — so the main app reuses the same key as `artifact-server`. The
server's read-only property is *code*-enforced (GET-only), not credential-enforced; that is
unchanged.

`artifact-server` reads bare Railway-injected names (`ENDPOINT`, `REGION`, `ACCESS_KEY_ID`,
`SECRET_ACCESS_KEY`, `BUCKET`). In a full Next.js app those generic names are collision-prone and
ambiguous, so the main app reads **prefixed** names instead:
`ARTIFACTS_S3_ENDPOINT`, `ARTIFACTS_S3_REGION`, `ARTIFACTS_S3_ACCESS_KEY_ID`,
`ARTIFACTS_S3_SECRET_ACCESS_KEY`, `ARTIFACTS_S3_BUCKET`, and optional `ARTIFACTS_S3_FORCE_PATH_STYLE`.
On Railway these are set as reference variables pointing at the shared Bucket (or copied from its
connection details) — **on the main app service only**. This keeps origin-isolation invariant #2:
no write credential is added to `artifact-server`.

Client construction mirrors `../artifact-server/src/s3.ts` (endpoint, region, `forcePathStyle`,
explicit credentials), lives in `src/features/artifact-management/`, and reads env at module load so
a misconfigured service fails fast. _Alternative rejected_: attaching the Bucket to the main app to
get the bare names — it pollutes the app's env namespace with generic keys and reads worse.

### `@aws-sdk/client-s3` for writes; `fflate` for unzip

Use `@aws-sdk/client-s3` (same major as `artifact-server`, `^3`): `PutObjectCommand` (writes),
`ListObjectsV2Command` (listing + duplicate check), `DeleteObjectsCommand` (delete). It's the same
SDK ① already depends on — consistent and well understood.

For zip extraction use **`fflate`** (`unzipSync`): tiny, dependency-free, pure-JS, no native build,
fast, works in the Node runtime. _Alternatives rejected_: `adm-zip` (larger, sync-only, less
maintained); `jszip` (heavier, promise-heavy API); `unzipper` (stream-based — overkill for small
in-memory bundles under our size cap). The zip-slip guard is ours regardless of library.

### Upload transport: native `request.formData()`, no extra multipart dep

App Router route handlers parse `multipart/form-data` natively via `await request.formData()`; the
uploaded file arrives as a `File`/`Blob` we read with `.arrayBuffer()`. No `busboy`/`formidable`.
Fields: `file` (the `.html` or `.zip`), `slug`, `title`. All artifact API routes pin
`export const runtime = 'nodejs'` (AWS SDK + `fflate` + size checks need Node, not Edge), matching
the existing stub.

### Single `.html` → `index.html`; `.zip` → extracted tree

A lone `.html` is written straight to `<slug>/index.html` with `Content-Type: text/html`, no unzip.
A `.zip` is extracted in memory; every entry is written under `<slug>/<entry-path>` with its
`Content-Type` derived from extension. The bundle MUST contain an `index.html` at its root (or a
single top-level directory containing one) so the slug root resolves — reject otherwise. Then
`meta.json` is written last (`{ slug, title, createdAt: <now ISO-8601> }`); `title` defaults to the
slug if the field is blank.

Type is decided by the uploaded filename extension / MIME, not by trusting the client's declared
kind. Unknown extensions are rejected before any write.

### Zip-slip guard + hard caps (the security-critical bit)

For each zip entry, normalise its path and **reject the whole upload** if the entry:
is absolute, contains a `..` segment, contains a backslash or control character, or otherwise
normalises to a path escaping the `<slug>/` prefix. This mirrors `artifact-server`'s `paths.ts`
segment rules, applied at *write* time. Reject before writing **any** object (validate the whole
archive first), so a bad archive never leaves a partial artifact behind.

Caps (constants in the feature, easy to tune):

- Total uncompressed size ≤ **25 MB**
- Per-file size ≤ **10 MB**
- Entry count ≤ **200**

Enforce the total-size cap against the *uncompressed* total to defend against zip bombs, and reject
as soon as a cap is exceeded. The raw upload body is also bounded by the total cap before extraction.

### Re-used slug → reject (HTTP 409)

Slugs are immutable and served with `immutable` caching (① invariant). Before writing, check for any
existing object under `<slug>/` (`ListObjectsV2`, `MaxKeys: 1`); if present, reject with **409
Conflict** and change nothing. _Alternatives rejected_: auto-suffix (surprising share links) and
overwrite + cache purge (needs a purge path we don't have, and fights immutability). Reject is the
safe default the roadmap calls for; overwrite can come later if wanted.

### Delete: included

`DELETE /api/artifacts/<slug>` lists every object under `<slug>/` and removes them
(`DeleteObjectsCommand`, batched). It rounds out "management" cheaply and the route is already
gated by the existing middleware matcher (`/api/artifacts/:path*`). A new dynamic route
`src/app/api/artifacts/[slug]/route.ts` handles it.

### Extension→MIME map

A small shared table in the feature maps common web extensions to content types set on
`PutObject`: `html`→`text/html`, `css`→`text/css`, `js`/`mjs`→`text/javascript`, `json`→
`application/json`, `svg`→`image/svg+xml`, `png`/`jpg`/`jpeg`/`gif`/`webp`/`avif`/`ico`, `woff`/
`woff2`/`ttf`/`otf`, `txt`→`text/plain`, `map`→`application/json`, `wasm`→`application/wasm`,
`mp3`/`mp4`/`webm`, `pdf`. Fallback for anything not listed: `application/octet-stream`. This is the
writer's half of ①'s "responses carry the object's stored content type" requirement.

### Code layout (bulletproof-react)

- `src/features/artifact-management/`
  - `utils/s3.ts` — S3 client + `putObject`/`listArtifacts`/`slugExists`/`deleteArtifact` wrappers
    (reads env; no auth knowledge).
  - `utils/config.ts` — env reader + upload-cap constants + MIME map.
  - `utils/validate.ts` — slug validation, zip-slip-safe entry resolution, cap enforcement.
  - `types/` — `Artifact` (`{ slug, title, createdAt, url }`), upload result types.
  - `components/` — `upload-form.tsx` (drag-drop, `'use client'`), `artifact-list.tsx`,
    `artifact-card.tsx` (share link, copy-link, delete), `copy-link-button.tsx`.
- `src/app/api/artifacts/route.ts` — real `GET` (list) + `POST` (upload). App layer: does the
  session re-check (imports `@/features/auth`) and CSRF check (imports the new shared util), then
  calls feature utils.
- `src/app/api/artifacts/[slug]/route.ts` — `DELETE`.
- `src/app/(admin)/artifacts/page.tsx` — RSC that lists artifacts server-side and renders the UI.
- `src/utils/same-origin.ts` — **shared** util extracted from `src/app/api/auth/route.ts`'s inline
  `isSameOrigin`, so both the auth route and the new write endpoints use one implementation.

This respects unidirectional imports: session/CSRF live at the **app** layer (route handlers), which
may import features and shared code, so the `artifact-management` feature never imports the `auth`
feature. The S3/validation code is auth-agnostic feature code.

### Reusable UI primitives are shadcn/ui, not hand-rolled

Any generic, reusable UI primitive this change needs SHALL be a **shadcn/ui** (new-york) component
vendored into the shared layer at `src/components/<role>/<name>/`, matching the existing convention
(`inputs/button/`, `data-display/badge/`, `layout/separator/` …) and importing `cn` from
`@/utils/cn`. Only the feature-specific *composites* (the drop-zone upload form, the artifact card,
the list) live in `src/features/artifact-management/components/`, and they are built **out of** those
shared primitives rather than re-implementing inputs, cards, or buttons inline. This is why the
existing login form's raw `<input>` is a smell we don't repeat.

Primitives this change adds (none exist yet): **`input`** and **`label`** (slug/title fields — also
satisfies the enforced a11y lint), **`card`** (the artifact card), and **`alert-dialog`** (confirm
the destructive delete). `button` already exists and is reused. The login form's existing raw
`<input>` is migrated to the new `input` primitive in this change so no hand-rolled input is left
behind. Toast/progress are deliberately *not* added — upload/copy feedback uses local component state
to keep the dependency surface small.

**`components.json` alias fix (in scope)**: the config's `utils` alias points at `@/lib/utils`, but
this repo's `cn` lives at `@/utils/cn` (a known cleanup-backlog item — nothing imports the stale
path). We correct `utils` → `@/utils/cn` (and `lib` → `@/utils`) so `shadcn add` emits correct `cn`
imports, and drop the resolved item from the backlog. This does **not** eliminate the relocation
step: the shadcn CLI always writes to a flat `<components>/ui/` folder, whereas this repo groups
primitives by role (`inputs/`, `data-display/`, `layout/`). So each generated primitive is still
moved into `src/components/<role>/<name>/`, matching an existing primitive's file shape. _Not done
here_: switching the repo to a flat `ui/` layout — that's a larger, repo-wide restructure, out of
scope.

## Risks / Trade-offs

- **Shared full-access key** → If it leaks, both read and write are exposed. Mitigation: key lives
  only in the (gated) main app and the read-only server; never on a public write surface; rotate via
  Railway if suspected. Revisit if Railway adds scoped keys.
- **Zip-slip / zip-bomb** → a crafted archive escaping the prefix or exhausting memory. Mitigation:
  validate the whole archive (paths + uncompressed size + count) *before* writing anything; hard
  caps; in-memory only.
- **Body-size / timeout on large uploads** → a 25 MB upload through a Node route handler is fine but
  not instant. Mitigation: cap enforced early; UI shows progress/disabled state; numbers are tunable
  constants.
- **Non-atomic multi-object write** → a mid-upload failure could leave a partial `<slug>/` tree (no
  `meta.json`). Mitigation: write `meta.json` **last** so listing (which keys off `meta.json`) skips
  partials; delete-then-retry is safe since the slug isn't yet "complete". Full transactional upload
  is out of scope for a single-admin tool.
- **Client-declared type spoofing** → decide type from the filename extension and validate every
  entry, never trust a client-supplied "kind" field.
- **Duplicate slug race** (two uploads, same slug, near-simultaneous) → the check-then-write isn't
  atomic. Accepted: single admin, negligible in practice; worst case the second write interleaves and
  is caught on next listing.

## Migration Plan

1. Add deps (`@aws-sdk/client-s3`, `fflate`); add the `ARTIFACTS_S3_*` vars to `.env.example` and to
   the **main app** Railway service (reference the shared Bucket).
2. Ship the code. `artifact-server` and its env are untouched.
3. Verify end-to-end (see tasks' verify): upload a single `.html`, upload a `.zip` with assets,
   confirm both render via `artifact-server`; confirm a `../` entry and an oversized archive are
   rejected; confirm duplicate slug → 409; confirm delete → link 404s.
4. Rollback: revert the code; artifacts already in the bucket keep serving (no schema/DB migration to
   unwind). The env vars can stay (harmless) or be removed.

## Open Questions

- Exact cap numbers (25 MB / 10 MB / 200) — reasonable defaults; adjust if real artifacts need more.
- Whether the `.zip` must have `index.html` at the archive root or may have a single wrapping
  top-level folder (many "download zip" flows wrap). Recommend: accept both, normalising a single
  top-level dir away; reject anything ambiguous.
- `ARTIFACTS_S3_FORCE_PATH_STYLE` default — inherit ①'s finding (Railway Buckets are virtual-hosted,
  so default off) unless testing shows otherwise.
