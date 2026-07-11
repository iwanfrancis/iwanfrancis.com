## 1. Dependencies & environment

- [x] 1.1 Add `@aws-sdk/client-s3` (`^3`, matching `artifact-server`) and `fflate` to `package.json`; install with yarn.
- [x] 1.2 Add the `ARTIFACTS_S3_*` variables to `.env.example` (endpoint, region, access key id, secret, bucket, optional force-path-style) with a comment that they go on the **main app service only**, never `artifact-server`.
- [x] 1.3 Set the same variables in `.env.local` for local dev (pointing at the shared Railway Bucket). _(keys added; left blank for the user to populate with real bucket creds)_

## 2. Shared same-origin util (refactor)

- [x] 2.1 Create `src/utils/same-origin.ts` exporting the `isSameOrigin(request)` check (extracted verbatim from `src/app/api/auth/route.ts`).
- [x] 2.2 Update `src/app/api/auth/route.ts` to import and use it; remove the inline copy. Confirm login still works.

## 3. Feature core (S3 + config + validation)

- [x] 3.1 `src/features/artifact-management/utils/config.ts`: read the `ARTIFACTS_S3_*` env (lazily/memoised — not at module load, so `next build` stays green; still fails fast at request time); export upload caps (total 25 MB, per-file 10 MB, ≤200 entries) and the artifacts base URL.
- [x] 3.2 `src/features/artifact-management/utils/mime.ts`: extension→MIME map with an `application/octet-stream` fallback.
- [x] 3.3 `src/features/artifact-management/utils/s3.ts`: build the S3 client (mirror `../artifact-server/src/s3.ts`) and export `slugExists`, `putObject`, `listArtifacts`, `deleteArtifact` wrappers.
- [x] 3.4 `src/features/artifact-management/utils/validate.ts`: slug-format check (`^[a-z0-9]+(-[a-z0-9]+)*$`) and a zip-slip-safe entry resolver rejecting `..`/absolute/backslash/control-char paths and anything escaping `<slug>/`.
- [x] 3.5 `src/features/artifact-management/utils/extract.ts`: unzip with `fflate`, normalise a single wrapping top-level dir, enforce the caps against uncompressed size, require a resolvable root `index.html`, and return `{ path, bytes, contentType }[]` — validating the whole archive before any write.
- [x] 3.6 `src/features/artifact-management/types/artifact.ts`: `Artifact` (`{ slug, title, createdAt, url }`) and upload-result types.

## 4. Upload + listing API (`/api/artifacts`)

- [x] 4.1 In `src/app/api/artifacts/route.ts`, keep `runtime = 'nodejs'`; add the CSRF (`isSameOrigin`) + session re-check guards to a shared helper in the route.
- [x] 4.2 Implement `POST`: parse `formData` (`file`, `slug`, `title`); validate slug; reject duplicate via `slugExists` → 409; branch single-`.html` vs `.zip`; write objects then `meta.json` last; return `{ slug, url }`.
- [x] 4.3 Replace the stub `GET` with a real listing: `listArtifacts` reads each `<slug>/meta.json` and returns `Artifact[]`.
- [x] 4.4 Map validation/size/traversal failures to appropriate 4xx responses with a clear error body; ensure no partial write escapes on rejection.

## 5. Delete API (`/api/artifacts/[slug]`)

- [x] 5.1 Create `src/app/api/artifacts/[slug]/route.ts` (`runtime = 'nodejs'`) with the session + CSRF guards.
- [x] 5.2 Implement `DELETE`: validate slug, list objects under `<slug>/`, batch-delete them, return success (idempotent on an already-absent slug).

## 6. Shared shadcn primitives

- [x] 6.1 Fix `components.json` aliases to match the real layout so `shadcn add` emits correct imports: set `utils` → `@/utils/cn` and `lib` → `@/utils` (nothing imports the old `@/lib/utils`; `hooks` → `@/hooks` is already correct). Note the CLI still writes to a flat `ui/` folder, so role-folder relocation below stays manual.
- [x] 6.2 Add shadcn/ui (new-york) `input`, `label`, `card`, and `alert-dialog`; relocate each into `src/components/<role>/<name>/` (`inputs/input`, `inputs/label`, `data-display/card`, `layout/alert-dialog`) and confirm the `cn` import resolves to `@/utils/cn`, matching the existing `button`/`badge` file shape. Reuse the existing `button`.
- [x] 6.3 Swap the login form's raw `<input>` (`src/features/auth/components/login-form.tsx`) for the new `input` primitive, so no hand-rolled input remains. Confirm login still works.

## 7. Management UI (`/artifacts`)

- [x] 7.1 `features/artifact-management/components/upload-form.tsx` (`'use client'`): drag-and-drop + file picker built from the `input`/`label`/`button` primitives; slug and title fields; submit to `POST /api/artifacts` with pending/disabled state and inline error display.
- [x] 7.2 `components/artifact-card.tsx` + `copy-link-button.tsx`: built on the `card` primitive — title, created date, share link; copy-link (clipboard) and a delete action confirmed via the `alert-dialog` primitive (calls `DELETE`).
- [x] 7.3 `components/artifact-list.tsx`: render the list of `artifact-card`s with an empty state.
- [x] 7.4 Rewrite `src/app/(admin)/artifacts/page.tsx` (RSC): fetch the listing server-side, render `upload-form` + `artifact-list`, keep `ProtectedRoute` and `LogoutButton`; re-list after upload/delete.

## 8. Verify & tidy

- [x] 8.1 `yarn lint` and `yarn build` clean (don't build while `yarn dev` is running). _(lint, `tsc --noEmit`, and `yarn build` all clean — dev stopped for the build, then restarted. Smoke-tested: gate redirects/401s unauth, login sets the cookie, authed `/artifacts` renders, listing fails gracefully with blank creds.)_
- [x] 8.2 Manual: logged in, upload a single `.html` with a slug → appears in list, share link renders via `artifact-server` with correct MIME types. _(verified against the live bucket.)_
- [ ] 8.3 Manual: upload a `.zip` with assets → all assets load at the link with correct MIME types. _(needs real creds.)_
- [ ] 8.4 Manual: a `.zip` with a `../` entry is rejected (nothing written); an oversized / too-many-entry upload is rejected. _(needs real creds.)_
- [x] 8.5 Manual: re-using an existing slug → 409; delete removes it from the list and the link 404s. _(verified against the live bucket.)_
- [ ] 8.6 Confirm origin isolation: no `ARTIFACTS_S3_*` on the `artifact-server` service; admin cookie stays host-only. _(deploy-time check — for the user.)_
- [x] 8.7 Update `openspec/notes/artifact-hosting-roadmap.md` status line for ③; `CLAUDE.md` where it describes `/artifacts` as an empty shell; and remove the now-resolved `components.json` alias item from `CLAUDE.md`'s "Known cleanup backlog".
