## Context

The artifact write path today (`POST /api/artifacts`, `PUT`/`DELETE`
`/api/artifacts/[slug]`) is gated two ways that both assume a browser: the
`middleware.ts` matcher 401s anything under `/api/artifacts*` without the signed
`admin_session` cookie, and each handler additionally runs `isSameOrigin` as a
CSRF check. A headless client (an iOS Shortcut fired from the share sheet) has no
cookie and is the wrong shape for that gate.

The trigger for this change: the Claude iOS app can "download HTML", which opens
the system share sheet carrying the artifact's **self-contained `.html` file**.
That is the ideal payload — real HTML bytes, no URL to resolve, no remote fetch.
We need a machine-facing endpoint a Shortcut can POST those bytes to.

Existing, reusable building blocks: `entriesFromUpload` (validates size/kind,
maps a lone `.html` → `index.html`), `putObject`, `slugExists`, `isValidSlug`,
`artifactUrl`, and the `verifyPassword` pattern (SHA-256 digest + `timingSafeEqual`
from `node:crypto`).

## Goals / Non-Goals

**Goals:**

- A token-authenticated `POST /api/ingest` that takes a single self-contained
  `.html` artifact and stores it via the existing write path.
- Zero-friction for the caller: no cookie, no slug to invent, no multipart to
  assemble by hand. Server auto-slugs and returns `{ slug, url }`.
- Keep the new machine auth fully independent of, and non-weakening to, the
  existing browser session auth and the origin-isolation invariants.

**Non-Goals:**

- **No server-side URL fetching.** The endpoint ingests posted bytes only; it
  never fetches a remote URL, so there is no SSRF surface. (This is possible only
  because Claude hands us the file directly.)
- **No update/delete/list over token auth.** Ingest is create-only. Managing or
  replacing artifacts stays in the cookie-gated admin surface.
- **No zip support on the raw-body path.** Bundles remain a drag-drop / multipart
  concern.
- **No repo code for the client.** The iOS Shortcut is built on-device and
  captured as a setup note; the macOS case reuses the existing UI / a curl alias.

## Decisions

### 1. Long-lived bearer token, not a reused session cookie

A new `ARTIFACTS_API_TOKEN` env secret, compared timing-safe in the Node route
handler (SHA-256 digest both sides, then `timingSafeEqual` — the exact pattern in
`password.ts`). The Shortcut sends `Authorization: Bearer <token>`.

- *Why:* a machine client needs a stable credential. The session cookie expires
  every ~7 days and would have to be extracted from Safari and re-pasted.
- *Alternative rejected — reuse the `admin_session` cookie:* weekly re-paste
  friction, and it conflates a browser credential with an automation one.

### 2. A separate route at `/api/ingest`, outside the middleware matcher

The new route lives at `/api/ingest`, deliberately **not** under `/api/artifacts`.

- *Why (auth layering):* the `middleware.ts` matcher gates `/api/artifacts*` on
  the cookie and would 401 a token request before it reached any handler. Putting
  ingest outside the matcher means middleware never runs for it and the handler
  owns its own (token) auth.
- *Why (runtime):* middleware runs on the **Edge** runtime, where `node:crypto`
  is unavailable. Keeping token verification in a Node-pinned route handler lets
  us reuse the `node:crypto` timing-safe compare rather than reimplementing it in
  Web Crypto or dragging Node crypto toward the Edge.
- *Alternative rejected — extend `POST /api/artifacts` to accept bearer-or-cookie:*
  one handler juggling two auth models, and the matcher would still block it
  unless middleware also learned the token — the worst of both.

### 3. Raw body is the primary contract; multipart is also accepted

Branch on `Content-Type`:

- `text/html` or `application/octet-stream` (or absent) → the whole request body
  is the HTML document, stored as `index.html`.
- `multipart/form-data` → read the `file` field and delegate to
  `entriesFromUpload` (which also yields free `.zip` support if a `.zip` file is
  posted this way).

Optional title via an `X-Artifact-Title` header (raw path) or a `title` form
field (multipart).

- *Why raw body:* it is the least fiddly thing to build in Shortcuts' "Get
  Contents of URL" — set the body to the shared file, add two headers, done.
- *Alternatives rejected:* multipart-only (awkward to assemble on-device);
  JSON `{ html }` (base64/escaping overhead for a whole document).

### 4. Server generates the slug; collisions get a short random suffix

Slugify the title into a `SLUG_PATTERN`-valid base (lowercase, non-alphanumeric
runs → single hyphens, trim/collapse hyphens, length-capped); fall back to a
constant base (e.g. `artifact`) when there is no usable title. Check `slugExists`;
on collision append a short random suffix and retry a bounded number of times.

- *Why:* the caller can't see existing slugs and shouldn't have to. `POST`'s
  "reject duplicate slug" behaviour would be a dead end for a one-tap flow.
- *Alternatives rejected:* reject-on-collision (dead end for the client);
  always-suffix (uglier URLs when the base is free). Randomness is fine here —
  this is a normal Node request handler, so `crypto` is available.

### 5. No same-origin / CSRF check on ingest

The endpoint does not call `isSameOrigin`.

- *Why:* CSRF is an ambient-credential problem — it matters because browsers
  auto-attach cookies. A bearer token is never auto-attached, so CSRF is
  inapplicable. Running the check would falsely imply cookie semantics.

## Risks / Trade-offs

- **Token leak grants write access to the public host** → keep it env-only and
  strong (≥32 random bytes), treat it like `ARTIFACTS_SECRET`, and constrain the
  endpoint to *create-only* (no list/delete/overwrite) so a leaked token can add
  artifacts but not read or destroy existing ones. Rotation = change the env var
  and update the Shortcut.
- **Fail-closed on misconfig** → if `ARTIFACTS_API_TOKEN` is unset, every request
  is rejected (mirrors `verifyPassword` returning `false` on an unset secret).
- **Matcher regression could silently break ingest** → if `/api/ingest` were ever
  pulled under the `/api/artifacts*` matcher, the cookie gate would 401 all token
  requests. A test asserts `/api/ingest` is reachable without a cookie and that it
  accepts a valid token / rejects a missing-or-wrong one.
- **Create-only means re-sharing mints a new URL each time** → intended: slugs are
  immutable and served with long cache lifetimes. No dedupe is attempted; each
  share yields a fresh link.
- **Content is trusted as HTML by contract** → consistent with `upload.ts`, which
  classifies by our own rules, never the client's MIME type. The size cap
  (`UPLOAD_LIMITS.maxTotalBytes`) still applies via `entriesFromUpload`.

## Migration Plan

1. Add `ARTIFACTS_API_TOKEN` to the Railway env for the main site service (not
   `artifact-server`). Generate with e.g. `openssl rand -base64 32`.
2. Ship the route + token util + tests. No data migration; the bucket contract is
   unchanged.
3. Build the iOS Shortcut per the setup note; store the token in it.

*Rollback:* remove/disable the route or rotate the token to invalidate the
Shortcut. Nothing else depends on it.

## Open Questions

- **Explicit slug override?** An optional `X-Artifact-Slug` header could let a
  caller pin a slug (still validated + duplicate-checked). Deferred — auto-slug
  covers the primary flow; add later if wanted.
- **Title source in the Shortcut** — the downloaded file's name vs an on-run
  prompt. A setup-note concern, not a server decision.
