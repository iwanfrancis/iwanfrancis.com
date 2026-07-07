## Why

The artifact effort needs a management surface (change ③ — upload, listing, delete at `/artifacts`),
but that surface must never be public: it holds write access to the artifact bucket. Before building
it, the site needs a way to prove a request is from me and nobody else. Today the site is entirely
static/RSC with no notion of a session.

This change builds that gate and nothing more: a **self-contained password login** that sets a
signed, httpOnly cookie and protects the admin routes. It is deliberately independent of the storage
substrate (①) — it can be built and verified on its own, ending when an empty `/artifacts` page is
reachable only after logging in.

**This is change ② of three.** The wider effort:

1. **`artifact-hosting`** (shipped) — storage + public serving substrate on `artifacts.iwans.space`.
2. **`auth`** (this change) — self-contained password + httpOnly cookie gate for the admin
   surface, in the main site repo.
3. **`artifact-management`** (later) — upload API (safe unzip) + drag-and-drop UI + listing at
   `/artifacts`, behind this gate.

Both later phases are documented in
[`openspec/notes/artifact-hosting-roadmap.md`](../../notes/artifact-hosting-roadmap.md).

**Why a password, not Cloudflare Access** (locked in exploration): Access keeps auth config in a
Cloudflare dashboard rather than in-repo, isn't portable off Cloudflare, and adds an edge-bypass
concern. A password in a Railway env var is fully self-contained, portable, and always enforced by
the app itself — matching the project's "self-contained / one platform" preference.

## What Changes

- Add a **login endpoint** (`POST /api/auth`) that timing-safe-compares a submitted password against
  `process.env.ARTIFACTS_SECRET` and, on success, sets a **signed httpOnly session cookie**
  (`SameSite=Lax`, `Secure`, **host-only** — no `Domain` attribute).
- Add a **logout endpoint** that clears the session cookie.
- Add a **login surface** where the password is entered.
- **Gate `/artifacts` and `/api/artifacts*`** so an unauthenticated request is turned away
  (redirect to login for pages, 401 for API), and a request bearing a valid signed cookie passes.
  The rest of the site, `_next`, and static assets stay public and untouched.
- Ship an **empty, gated `/artifacts` shell page** — just enough to prove log in / log out /
  turn-away. No upload, no listing (those are ③).
- Add the two required secrets to the main app's Railway env: the admin password and the cookie
  signing key.

Non-goals (deferred to ③): any upload mechanism, artifact listing, delete, and the management UI.
The `artifact-server` service is **not** touched — it stays public, read-only, and never receives
the admin secret.

## Capabilities

### New Capabilities

- `auth`: Password-based authentication for the site's admin surface — the login/logout
  endpoints, the signed host-only httpOnly session cookie and its verification, and the requirement
  that `/artifacts` and `/api/artifacts*` are reachable only with a valid session while the rest of
  the site stays public.

### Modified Capabilities

<!-- None. This is net-new surface. It does not change any existing spec's requirements;
     artifact-hosting (①) is a separate service and is untouched. -->

## Impact

- **Repo**: all code lands in the main site repo (`iwanfrancis.com`) — a login surface, the auth API
  routes, a session utility, and route gating (middleware and/or per-route checks). The archived
  `artifact-hosting` spec/service is unaffected.
- **Dependencies**: none required — cookie signing can use the Web Crypto API already available in
  the Next.js runtime. (A small HMAC helper dep is an option the design will weigh; default is no new
  dep.)
- **Configuration**: two new Railway env vars on the **main app only** — `ARTIFACTS_SECRET` (the
  admin password) and a cookie signing secret. Neither is ever added to the `artifact-server`
  service.
- **Security/privacy**: introduces the first authenticated surface on the site. Two origin-isolation
  invariants from ① must hold — the session cookie is **host-only** (scoped to `iwans.space`, never
  sent to `artifacts.iwans.space`), and no write credential or admin secret reaches the read-only
  artifact-server. Getting these right here is the point of splitting ② out.
- **Runtime**: adds Next.js middleware on a **scoped matcher** (`/artifacts`, `/api/artifacts*`) so
  the public site pays no per-request cost; and a small always-available API surface for login/logout.
