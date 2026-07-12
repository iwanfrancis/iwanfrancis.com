## 1. Bearer-token auth

- [x] 1.1 Add `src/features/auth/utils/token.ts`: `verifyBearerToken(header: string | undefined)` that parses `Bearer <token>` and constant-time compares against `process.env.ARTIFACTS_API_TOKEN` (SHA-256 digest both sides, then `timingSafeEqual`, mirroring `password.ts`); returns `false` when the header is absent/malformed or the env var is unset. Pin to `node:crypto`.
- [x] 1.2 Colocate `token.test.ts`: accepts the correct token; rejects missing header, non-`Bearer` scheme, wrong token, and (via `vi.stubEnv`) an unset `ARTIFACTS_API_TOKEN`. Never use a real secret.
- [x] 1.3 Add `ARTIFACTS_API_TOKEN` to `.env.example`/local env notes with a one-line comment (generate with `openssl rand -base64 32`; main-site service only, never `artifact-server`).

## 2. Slug generation

- [x] 2.1 Add a slug helper (e.g. `src/features/artifact-management/utils/slug.ts`): `slugify(title)` → `SLUG_PATTERN`-valid base (lowercase, non-alphanumeric runs → single hyphens, trim/collapse hyphens, length-capped), with a constant fallback base (e.g. `artifact`) when the result is empty.
- [x] 2.2 Add `generateUniqueSlug(base, exists)` that returns `base` when free, else appends a short random suffix and retries a bounded number of times; the result MUST satisfy `isValidSlug`.
- [x] 2.3 Colocate `slug.test.ts`: slugifies titles; empty/punctuation-only title falls back to the base; collision path yields a distinct valid slug (inject a fake `exists`).

## 3. Ingest endpoint

- [x] 3.1 Add `src/app/api/ingest/route.ts` (`export const runtime = 'nodejs'`), `POST` only.
- [x] 3.2 Authenticate via `verifyBearerToken(request.headers.get('authorization'))`; return `401` on failure. Do NOT call `isSameOrigin`.
- [x] 3.3 Branch on `Content-Type`: `multipart/form-data` → read the `file` field + `title`, delegate to `entriesFromUpload`; otherwise treat the raw body as one HTML document (read `X-Artifact-Title`), wrapping the bytes so `entriesFromUpload` maps them to `index.html`.
- [x] 3.4 Derive the slug via `slugify(title)` + `generateUniqueSlug(base, slugExists)`; write entries with `putObject`, then write `meta.json` last (`{ slug, title: title || slug, createdAt }`), matching the ordering in the admin `POST`.
- [x] 3.5 Return `201` `{ slug, url: artifactUrl(slug) }`; map `UploadError` to its carried status (e.g. oversized → `413`); log and `500` on unexpected errors.

## 4. Middleware invariant

- [x] 4.1 Confirm `src/middleware.ts` `matcher` does not (and must never) cover `/api/ingest`; add a short comment noting ingest is token-authenticated and deliberately outside the cookie gate.

## 5. Endpoint tests

- [x] 5.1 `route.test.ts`: valid token + raw HTML body → `201` `{ slug, url }` and an `index.html` write (mock `s3` utils); assert `meta.json` is written last.
- [x] 5.2 Auth: missing/malformed/wrong token → `401` with no write; unset `ARTIFACTS_API_TOKEN` → `401`.
- [x] 5.3 Multipart `file` field is validated and stored; oversized body → `413`.
- [x] 5.4 A request with a cross-site `Origin` header still succeeds (no same-origin rejection); a request with no `admin_session` cookie succeeds.

## 6. Docs & setup note

- [x] 6.1 Add an iOS Shortcut setup note (in the change, e.g. `notes/ios-shortcut.md`): share-sheet target accepting a file → `POST https://iwans.space/api/ingest` with `Authorization: Bearer <token>` + `X-Artifact-Title`, body = the shared file; on `201`, copy `url` to the clipboard and notify. Note the macOS options (existing drag-drop UI / curl alias).
- [x] 6.2 Update `CLAUDE.md` (artifact hosting paragraph) and `openspec/notes/artifact-hosting-roadmap.md` to record the token-authenticated ingest path (change ⑤).

## 7. Verify

- [x] 7.1 `yarn lint`, `yarn typecheck`, `yarn test` all pass.
- [ ] 7.2 (post-deploy, manual) After `ARTIFACTS_API_TOKEN` is set on Railway: `curl -X POST https://<deploy>/api/ingest -H "Authorization: Bearer $TOKEN" -H "Content-Type: text/html" --data-binary @sample.html` returns `201` and the returned URL serves the artifact; a bad/absent token returns `401`. Blocked until deployed — cannot run locally.
