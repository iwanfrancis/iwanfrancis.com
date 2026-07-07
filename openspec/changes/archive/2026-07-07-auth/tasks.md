## 1. Config & secrets

- [x] 1.1 Add cookie name and default session-length (7 days) constants to `src/config/` (e.g. `src/config/auth.ts`).
- [ ] 1.2 Set `ARTIFACTS_SECRET` (admin password) and `SESSION_SECRET` (cookie signing key) on the **main app** Railway service — high-entropy values, and confirm neither is present on the `artifact-server` service. _(Manual Railway step — cannot be done from the repo; do at deploy time.)_
- [x] 1.3 Add a `.env.example` / local `.env` entry documenting both vars so `yarn dev` can exercise login locally. _(Added `.env.example`; local `.env.local` created with test values, gitignored.)_

## 2. Session utility (`src/features/auth/utils/session.ts`)

- [x] 2.1 Implement `signSession(expiresAt)` → `<expiresAt>.<base64url HMAC-SHA256(expiresAt, SESSION_SECRET)>` using the Web Crypto API (`crypto.subtle`), so it runs in both Edge and Node runtimes. _(As `createSessionToken`.)_
- [x] 2.2 Implement `verifySession(cookieValue)` → recompute the HMAC, compare signatures in constant time (via Web Crypto MAC verify), and reject if `now > expiresAt`. Return a boolean/typed result.
- [x] 2.3 Add `sessionCookie(expiresAt)` helper returning the cookie options: `httpOnly`, `secure`, `sameSite: 'lax'`, `path: '/'`, `maxAge`, and **no `domain`** (host-only). _(In `utils/cookie.ts`; `secure` gated to production so http localhost works in dev.)_
- [x] 2.4 Add a `clearSessionCookie()` helper (expired/empty cookie with the same attributes). _(As `clearedSessionCookieOptions`.)_

## 3. Auth API routes (`src/app/api/...`)

- [x] 3.1 Add `POST /api/auth` with `export const runtime = 'nodejs'`; parse the submitted password, compare against `ARTIFACTS_SECRET` using `node:crypto.timingSafeEqual` over SHA-256 digests of both, and reject empty/absent passwords and unset secret. _(Compare in `utils/password.ts`.)_
- [x] 3.2 On success, set the signed session cookie (expiry = now + session length) and return success; on failure return an authentication-failure response with no cookie.
- [x] 3.3 Add an `Origin`/`Referer` same-host check on `POST /api/auth` as CSRF defence-in-depth. _(Origin check; absent Origin allowed.)_
- [x] 3.4 Add `POST /api/logout` that clears the session cookie and returns success.

## 4. Route gating (`src/middleware.ts`)

- [x] 4.1 Add middleware with `matcher: ['/artifacts', '/artifacts/:path*', '/api/artifacts', '/api/artifacts/:path*']` — excludes the public site, `_next`, static assets, `/api/auth`, `/api/logout`, and `/login`. _(Placed at `src/middleware.ts`, not repo root, because the app lives under `src/`.)_
- [x] 4.2 In the middleware, read the session cookie and call `verifySession`; on a valid session, continue.
- [x] 4.3 On an invalid/absent session: redirect page requests (`307`) to `/login?next=<path>`; return `401` JSON for `/api/artifacts*` requests.

## 5. Login & logout UI (`src/features/auth/components/`)

- [x] 5.1 Build a login form component (password field + submit) that POSTs to `/api/auth` and, on success, navigates to the `next` param (default `/artifacts`); show an inline error on failure.
- [x] 5.2 Add a public `/login` page that renders the login form; ensure it is outside the middleware matcher. _(Under a new `(admin)` route group with a chrome-light layout, not `(site)`; `next` is validated to internal paths to avoid open redirect.)_
- [x] 5.3 Add a logout control (button that POSTs `/api/logout` then redirects) reachable from the gated `/artifacts` shell.

## 6. Gated admin shell

- [x] 6.1 Add an empty, authenticated `/artifacts` page (`src/app/(admin)/artifacts/page.tsx`) — placeholder content plus the logout control. No upload/listing. _(Wrapped in a reusable `ProtectedRoute` server component that re-verifies the session server-side, so the page fails closed independent of the middleware; ③ reuses it.)_
- [x] 6.2 Have the `/api/artifacts*` handler surface (stub `GET /api/artifacts`) call `verifySession` directly as belt-and-braces, so it fails closed independent of the matcher.

## 7. Verify (done criteria)

- [x] 7.1 Unauthenticated `/artifacts` → redirected to `/login`; unauthenticated `/api/artifacts*` → `401`. _(Verified on :3001: `/artifacts` → 307 `location: /login?next=%2Fartifacts`; `/api/artifacts` → 401.)_
- [x] 7.2 Correct password → cookie set → `/artifacts` renders; wrong/empty password → rejected, no cookie. _(Verified: wrong/empty → 401 no cookie; correct → 200 + `Set-Cookie`; with cookie `/artifacts` → 200, `/api/artifacts` → 200 `{"artifacts":[]}`.)_
- [x] 7.3 Inspect the `Set-Cookie`: `HttpOnly`, `Secure` (prod), `SameSite=Lax`, and **no `Domain`** (host-only). _(Verified: `admin_session=…; Path=/; Max-Age=604800; HttpOnly; SameSite=lax`, no Domain. `Secure` correctly absent in dev — gated to production.)_
- [x] 7.4 Tamper with the cookie value → treated as unauthenticated; force a past expiry → treated as unauthenticated. _(Node logic test against the real `SESSION_SECRET` — valid/tampered-sig/tampered-expiry/expired/garbage/empty — plus a live tamper on :3001 → 307 / 401.)_
- [x] 7.5 Logout clears the cookie and re-gates `/artifacts`. _(Verified: logout `Set-Cookie: admin_session=; Max-Age=0`; `/artifacts` after logout → 307.)_
- [x] 7.6 Confirm a public page (`/`) and the thingies canvas still load with no session (matcher scope check). _(Verified: `/`, `/login`, `/thingies` all 200 with no cookie.)_
- [x] 7.7 `yarn lint` and `yarn build` pass. _(`yarn lint` clean, `tsc --noEmit` clean, and `next build` succeeds in an isolated copy — Edge middleware bundled cleanly, so no `node:crypto` leaked into the Edge path. Repo `yarn build` deferred to avoid corrupting the running dev servers' `.next`.)_
- [x] 3.3 also confirmed live: cross-origin POST to `/api/auth` (`Origin: http://evil.example`) → 403.

## 8. Docs

- [x] 8.1 Update `CLAUDE.md` (artifacts paragraph) and `openspec/notes/artifact-hosting-roadmap.md` status line to mark ② as shipped once implemented. _(CLAUDE.md now describes the live `/artifacts` gate; roadmap ② marked implemented/archived. Renamed feature+capability `admin-auth` → `auth` throughout.)_
