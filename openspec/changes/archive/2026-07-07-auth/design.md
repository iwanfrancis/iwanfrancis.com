## Context

The site is currently 100% static/RSC — no API routes, no middleware, no session, no `process.env`
usage in app code. Change ③ will add an admin surface (`/artifacts`) holding write access to the
artifact bucket, so it must be gated first. This change adds the gate and an empty gated shell only.

Locked by exploration (see the roadmap note): a **password in a Railway env var + a signed httpOnly
cookie**, not Cloudflare Access — self-contained, portable, always enforced by the app. Two
origin-isolation invariants inherited from ① must hold: the session cookie is **host-only** (never
sent to `artifacts.iwans.space`), and no admin secret or write credential ever reaches the
`artifact-server`.

Stack facts that shape the design: Next.js 15 App Router; middleware runs on the **Edge runtime**
(no `node:crypto`), route handlers can opt into the **Node runtime**. Route groups already exist
(`(site)`, `(canvas)`); features live in `src/features/*`, shared config in `src/config/`.

## Goals / Non-Goals

**Goals:**

- One password unlocks the admin surface; wrong/absent password is turned away.
- A tamper-evident, httpOnly, host-only, `Secure` session cookie that expires.
- A single, narrow choke point that gates `/artifacts` and `/api/artifacts*` and touches nothing
  else (public site, `_next`, static assets, `/api/auth`).
- Prove the whole loop with an empty gated `/artifacts` page and a logout.
- No new runtime dependency; no database.

**Non-Goals:**

- Any upload, listing, delete, or management UI (③).
- Multi-user accounts, roles, password reset, rate-limiting infrastructure, "remember me" beyond a
  fixed session length.
- Touching the `artifact-server` service in any way.

## Decisions

### Session token: stateless signed cookie carrying its own expiry

The cookie value is `<expiresAt>.<sig>`, where `expiresAt` is an epoch-ms integer and `sig` is
`HMAC-SHA256(expiresAt, SESSION_SECRET)`, base64url-encoded. Verification recomputes the HMAC with a
**constant-time compare** and rejects if `now > expiresAt`. This is stateless (no session store,
honouring the no-database ethos) yet the client cannot extend its own session — the expiry is inside
the signed payload, so a captured cookie can't be replayed past `expiresAt` even though cookie
`Max-Age` is client-controllable.

- _Alternative — opaque cookie + server-side session store_: rejected, needs storage the site
  deliberately doesn't have.
- _Alternative — sign a constant and rely on cookie `Max-Age` for expiry_: rejected, expiry would be
  client-controlled and thus forgeable-by-omission.

### Crypto via the Web Crypto API — no new dependency

Signing/verification uses `crypto.subtle` (HMAC-SHA256), which is available in **both** the Edge
(middleware) and Node (route handler) runtimes — so the same verify helper runs everywhere and the
hot path (middleware, every gated request) needs no Node APIs. Constant-time comparison of the two
signatures is done byte-by-byte in JS (both are fixed 32-byte digests, so length never leaks).

- _Alternative — an HMAC/JWT dep (`jose`, `cookie-signature`)_: rejected as unnecessary; Web Crypto
  covers it and the project prefers minimal deps. `jose` would be the fallback if we later need JWT
  interop.

### Password check pinned to the Node runtime in `POST /api/auth`

The login route sets `export const runtime = 'nodejs'` and compares the submitted password to
`ARTIFACTS_SECRET` with `node:crypto.timingSafeEqual` over **SHA-256 digests of both** (fixed length
→ no length-leak, and `timingSafeEqual` requires equal-length buffers). On success it mints the
signed cookie and sets it. This keeps the raw password off the Edge path entirely.

### Two secrets, separated by role

- `ARTIFACTS_SECRET` — the admin password (the credential the user types). Name inherited from the
  roadmap.
- `SESSION_SECRET` — the HMAC key that signs cookies.

Separating them means the signing key is high-entropy regardless of password strength, and each can
rotate independently (rotating either simply invalidates live sessions — acceptable). _Alternative —
derive the signing key from the password (one env var)_: valid and simpler, rejected only for the
clean separation; noted as a fallback if managing two vars proves annoying.

### Dedicated `/login` page; middleware redirects to it

Unauthenticated page requests get a `307` redirect to `/login?next=<path>`; the login form POSTs to
`/api/auth` and on success redirects to `next` (default `/artifacts`). `/login` is public (outside
the matcher).

- _Alternative — inline password prompt rendered on `/artifacts` itself_: avoids an extra route but
  muddies the gate (the "protected" page must also render its own unauthenticated state). A separate
  public `/login` keeps the gate boolean: matched path + no valid session ⇒ turn away, full stop.

### Middleware is the gate; pages and API routes both re-verify (belt-and-braces)

A single `middleware.ts` with matcher `['/artifacts', '/artifacts/:path*', '/api/artifacts',
'/api/artifacts/:path*']` is the choke point: page misses → `307` to `/login`; `/api/artifacts*`
misses → `401` JSON. `/api/auth` is deliberately **not** matched.

The gate must never rest on the matcher alone. The shared `verifySession()` helper is *also* called
server-side inside **both** the gated page and the `/api/artifacts*` handlers, so each fails closed
even if the matcher is misconfigured or the middleware is bypassed. Pages use a reusable
`ProtectedRoute` server component (`features/auth/components/protected-route.tsx`): it wraps a
page's content, re-verifies the cookie, and `redirect()`s to `/login` before rendering children when
the session is missing or invalid. This matters because Next.js middleware auth has been bypassable
before (CVE-2025-29927, the `x-middleware-subrequest` header, fixed in 15.2.3): a page-gate resting
solely on middleware is the fragile part, and a server-side re-verify removes that single point of
failure at negligible cost. ③ reuses `ProtectedRoute` for its additional gated pages (or lifts it
into a shared layout over the gated area).

### Cookie attributes (origin-isolation invariant #1)

`HttpOnly; Secure; SameSite=Lax; Path=/;` **no `Domain` attribute** (host-only ⇒ scoped to
`iwans.space`, never sent to `artifacts.iwans.space`); `Max-Age` = session length. Session length
defaults to **7 days**, read from an optional env var so it's tunable without a code change.

`SameSite=Lax` protects ③'s state-changing POSTs from cross-site forgery (a cross-site `fetch`
won't carry a Lax cookie), and the login form is same-origin. `POST /api/auth` also checks the
`Origin` host matches the request host — but note this is *not* load-bearing: login CSRF is largely
meaningless here (one shared password, and logging in only mints a fresh session rather than acting
on an existing one). It stays as cheap, harmless defence-in-depth; ③'s write endpoints must not lean
on it and should rely on `SameSite=Lax` plus their own session re-verify.

### Code layout

New `src/features/auth/` feature: `api/` (auth route handlers), a `utils/session.ts`
(sign/verify/cookie helpers, importable by both Edge middleware and Node routes), `components/`
(login form), `types/`. Session length / cookie name constants go in `src/config/`. `middleware.ts`
sits at `src/middleware.ts` (Next.js requires it inside `src/` when the app lives there) and imports
the shared verify helper. This respects the unidirectional import rule (`middleware`/`app` → feature
→ shared).

## Risks / Trade-offs

- **Edge runtime lacks `node:crypto`** → verify path uses Web Crypto only; `node:crypto` is confined
  to the Node-pinned `/api/auth` route.
- **Misconfigured matcher** (gates the public site, or leaves `/artifacts` open) → narrow explicit
  matcher, per-route `verifySession()` as a second line, and an explicit verify step in tasks
  covering both "public page still public" and "gated page still gated".
- **Middleware auth bypass (CVE-2025-29927)** → the page and API routes re-verify the session
  server-side (above), so the gate never rests on the matcher alone. Additionally, Next.js must stay
  pinned **≥ 15.2.3** (currently `^15.5.19`, so a fresh install can't resolve below the fix); a
  future downgrade past 15.2.3 would reopen the middleware-bypass hole and must not happen.
- **Stolen cookie replay** → `Secure` (HTTPS-only) + `HttpOnly` (no JS/XSS read) + signed short-ish
  expiry bound the window; acceptable for a single-user, low-value admin. No revocation list (would
  need storage); rotating `SESSION_SECRET` is the kill-switch.
- **Brute-forcing the password** → single-user, high-entropy secret + timing-safe compare. No
  built-in rate limiting; Cloudflare in front is the mitigation if ever needed (noted, not built).
- **Second secret to manage** → the single-secret (derive-from-password) fallback is documented
  above if it proves not worth it.

## Migration Plan

1. Set `ARTIFACTS_SECRET` and `SESSION_SECRET` (and optionally the session-length var) on the **main
   app** Railway service — **not** on `artifact-server`.
2. Deploy the middleware, `/api/auth`, `/api/logout`, `/login`, and the empty `/artifacts` shell.
3. Verify the done-criteria (turn-away, login, logout, cookie attributes, host-only scope).

**Rollback**: delete `middleware.ts`, the auth routes, and the `/artifacts`/`login` pages, then
redeploy. No data migration, no DB, so rollback is code-only and clean. The env vars can be left in
place harmlessly or removed.

## Open Questions

- Confirm the exact session-length env var name and whether it ships in ② or is hard-coded to 7 days
  until ③ needs it (default: ship the constant now, promote to env only if tuning is wanted).
- Whether `/api/logout` should be `POST` (CSRF-clean, needs a form/button) or accept `GET` for a
  plain link — default `POST` for consistency with the SameSite posture.
