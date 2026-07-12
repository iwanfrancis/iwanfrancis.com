## Why

Publishing a Claude artifact to `artifacts.iwans.space` today means opening the
gated `/artifacts` admin UI in a browser and dragging in a file — fine on a Mac,
fiddly on a phone. The Claude iOS app can "download HTML", which opens the system
share sheet with the artifact's self-contained `.html` file. An iOS Shortcut can
register as a share-sheet target and POST that file somewhere — but the only
write path today is cookie-gated and browser-shaped, so there is nothing for a
headless client to call. This change adds the machine-facing endpoint that makes
a one-tap "share to my artifacts page" flow possible.

## What Changes

- Add a **long-lived bearer-token credential** (`ARTIFACTS_API_TOKEN`, a new
  Railway env secret) for machine clients, sitting alongside the existing browser
  session cookie — the two auth mechanisms are independent and neither replaces
  the other.
- Add a **token-authenticated ingest endpoint** at `POST /api/ingest` that
  accepts a raw `.html` body (Shortcut-native) or `multipart/form-data`, with an
  optional title, and stores it as a new hosted artifact — reusing the existing
  upload internals (`entriesFromUpload`, `putObject`, slug/meta writing).
- **Auto-generate the slug** server-side from the title (or a fallback), adding a
  short suffix on collision, so the caller never has to supply or guess a unique
  slug. The endpoint returns `{ slug, url }`.
- Place the route **outside the `/api/artifacts*` middleware matcher** so the
  cookie gate never intercepts it; authentication is by bearer token only, and
  the browser CSRF/same-origin check does not apply to a token request.
- Document (not code) the **iOS Shortcut** setup as a companion note; the macOS
  case is served by the same endpoint via the existing drag-drop UI or a curl
  alias and needs no new repo code.

## Capabilities

### New Capabilities

- `artifact-ingest`: A token-authenticated endpoint that ingests a single
  self-contained `.html` artifact from a headless client (e.g. an iOS Shortcut),
  auto-assigns a slug, stores it via the shared write path, and returns the
  public share link. Covers the bearer-token auth mechanism, the raw-body and
  multipart request contracts, auto-slug generation, and the origin-isolation
  invariants the write path must preserve.

### Modified Capabilities

<!-- None. The existing cookie-gated `artifact-management` behaviour is
     unchanged; this adds a parallel, independently-authenticated path. -->

## Impact

- **New env var**: `ARTIFACTS_API_TOKEN` (Railway) — a write credential for the
  public artifact host. Must be strong and treated like `ARTIFACTS_SECRET`; never
  added to the `artifact-server` service.
- **New route**: `src/app/api/ingest/route.ts` (Node runtime).
- **New auth util**: a bearer-token verifier (timing-safe), likely
  `src/features/auth/utils/token.ts`.
- **Middleware** (`src/middleware.ts`): its matcher must continue to *exclude*
  `/api/ingest` — no behavioural change to existing entries, but the invariant is
  now load-bearing and must be asserted by a test.
- **Reused, unchanged**: `entriesFromUpload`, `putObject`, `slugExists`,
  `artifactUrl`, `isValidSlug` from `features/artifact-management`.
- **Origin isolation invariants** (from the artifact-hosting roadmap) still hold:
  the session cookie stays host-only, and no write credential reaches
  `artifact-server`.
- **Off-repo**: an iOS Shortcut built on-device; a setup note in the change.
