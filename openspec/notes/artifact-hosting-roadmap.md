# Artifact hosting — roadmap (changes ②–④)

Hosting for shareable Claude artifacts is being built as a **sequence of OpenSpec changes**. ①②③④
are all shipped; this note captures **④ artifact-update** (in-place updates behind an existing slug)
alongside the original ②③ exploration, kept for history. Another agent can pick up a not-yet-proposed
section and run `/opsx:propose` without re-deriving the decisions we already made.

```
① artifact-hosting      storage + public serving substrate   ← SHIPPED (specs/artifact-hosting/; archive/2026-07-07-artifact-hosting)
② auth                  self-contained gate for the admin UI  ← SHIPPED (specs/auth/; archive/2026-07-07-auth); deploy = set Railway env
③ artifact-management   upload API + drag-drop UI + listing   ← SHIPPED (specs/artifact-management/; archive/2026-07-11-artifact-management)
④ artifact-update       in-place replace of a slug + ETag caching  ← SHIPPED (specs synced; archive/2026-07-11-artifact-update)
```

**Read `openspec/changes/archive/2026-07-07-artifact-hosting/{proposal,design,specs,tasks}.md` first** — it holds the
storage contract and the isolation model that ② and ③ depend on. The exploration behind all three
is summarised here (the original chat isn't durable).

## How to use this note

- **To create a proposal**: run `/opsx:propose` (or the `openspec-propose` skill), passing that
  phase's section below as the brief. The "Decisions (locked)" list is settled — honour it, don't
  re-litigate it. The "Open for the proposal to decide" list is where the new proposal adds value.
- **Sequencing**: ② and ③ both live in the **main site repo** (`iwanfrancis.com`), unlike ① whose
  code lives in the sibling `artifact-server` repo. ② should land before ③ (③'s surfaces need the
  gate). ② is independent of ① and could be built in parallel with it.
- **When a phase is proposed/shipped**, note it in the status line above rather than deleting it.

## Shared invariants (both phases must honour)

- **Storage contract (defined in ①)** — each artifact is an S3 key prefix `<slug>/` in the Railway
  Bucket containing `index.html`, any assets, and `meta.json` (`{ slug, title, createdAt }`,
  `createdAt` ISO-8601). `slug` matches `^[a-z0-9]+(-[a-z0-9]+)*$`. The bucket is the source of
  truth; **no database**.
- **Origin-isolation invariants** — these are the whole reason the architecture looks the way it
  does; breaking either silently defeats the security model:
  1. The admin session cookie (②) MUST be **host-only** (no `Domain` attribute) so it is scoped to
     `iwans.space` and is never sent to `artifacts.iwans.space`.
  2. The admin secret / any write credentials MUST NOT be added to the `artifact-server` service's
     env. That service stays read-only and public.
- **Slugs are treated as immutable** (① serves them with `Cache-Control: … immutable`). ③ must
  therefore decide how to handle a re-used slug (see ③ open questions) — the safe default is to
  reject duplicates. **④ revises this**: it switches ① to ETag validation caching and makes slugs
  updatable in place via `PUT`; see the ④ section below.

---

## ② auth

**Goal**: a self-contained "only Iwan" gate for the future artifact admin surface, entirely in the
main repo — no third-party auth provider.

- **Repo**: `iwanfrancis.com` (main site).
- **Depends on**: nothing (independent of ①). Must land before ③.
- **Capability name**: `auth` (code feature at `src/features/auth/`).

**Decisions (locked in exploration):**

- **Password + signed httpOnly cookie**, not Cloudflare Access. Access was considered and rejected:
  it keeps auth config in a Cloudflare dashboard (not in-repo), isn't portable off Cloudflare, and
  introduces an edge-bypass concern. A password in a Railway env var is fully self-contained,
  portable, and the app always enforces it (no edge to bypass). This matches the project-wide
  "self-contained / one platform" preference.
- Flow: a login form POSTs a secret to an API route (e.g. `POST /api/auth`) → **timing-safe**
  compare against `process.env.ARTIFACTS_SECRET` → set a **signed httpOnly cookie**
  (`SameSite=Lax`, `Secure`, **host-only** — see invariant #1) → gate the admin routes via
  middleware and/or per-route checks. Include a logout route that clears the cookie.
- Gate scope: `/artifacts` and `/api/artifacts*` only — the rest of the site stays public. The
  middleware `matcher` must be scoped so it never touches the public site, `_next`, or static
  assets.

**Scope of the change (keep it thin):**

- Deliver the gate plus an **empty, gated `/artifacts` shell page** — enough to prove log in / log
  out / redirect-or-401-when-unauthenticated. No upload, no listing (that's ③).

**Open for the proposal to decide:**

- Cookie signing mechanism (HMAC via a small dep vs the Web Crypto API) and session duration
  (suggest ~7 days, configurable).
- Login UX: a dedicated `/login` page vs an inline password prompt on `/artifacts`.
- CSRF posture for the write POST (SameSite=Lax covers most; confirm for the ③ upload).

**Suggested verify (done criteria):**

- Unauthenticated request to `/artifacts` → redirected to login (or 401).
- Correct password → cookie set → `/artifacts` accessible; wrong password → rejected.
- Cookie is `HttpOnly`, `Secure`, host-only (not sent to `artifacts.iwans.space`), and signed
  (tampering invalidates it).
- Logout clears the session.

**Gotchas:**

- Auth is on the **main app only**; the `artifact-server` stays public and unauthenticated by
  design. Don't gate the serving path.
- Re-confirm invariant #1 (host-only cookie) here, since this is the change that introduces the
  cookie.

---

## ③ artifact-management

**Goal**: the self-serve product surface — upload artifacts and see/manage what's hosted, from a
browser, behind the ② gate.

- **Repo**: `iwanfrancis.com` (main site).
- **Depends on**: ① (storage contract + serving) and ② (the gate).
- **Suggested capability name**: `artifact-management`.
- **Consider splitting** into `3a` (upload API) and `3b` (management UI) if it balloons at task
  time; propose as one and split only if needed.

**Decisions (locked in exploration):**

- **Accept both** a single `.html` file and a `.zip` bundle. A lone `.html` is stored as
  `<slug>/index.html` (content-type `text/html`) with no unzip step.
- **Slug chosen at upload**, validated against the contract regex and for uniqueness. The
  share link is then `https://artifacts.iwans.space/<slug>/`.
- **Safe unzip is the fiddly, security-critical bit** — guard against **zip-slip**: reject any
  entry whose normalised path escapes the `<slug>/` prefix (contains `..` or is absolute). Enforce
  a total-size cap, a per-file cap, and an entry-count cap. Set each entry's `Content-Type` from
  its extension on `PutObject`.
- Write `meta.json` (`{ slug, title, createdAt }`) per artifact, per the ① contract.
- **Listing** reads the bucket server-side via `ListObjectsV2` by prefix and renders a card per
  artifact from its `meta.json` (title, created date, link, copy-link; delete optional). No
  database.

**Open for the proposal to decide:**

- **Bucket credentials for the main app**: uploading/listing needs **write + list** access.
  _Known from ①:_ Railway issues a **single full-access** key pair — there is no read-only scope,
  so the main app and the `artifact-server` would share the same key. The server's read-only
  property is code-enforced (GET-only), not credential-enforced. For ③ this means the main app can
  reuse that key for writes; just keep it off any public surface. Revisit if Railway adds scoped keys.
- **Re-used slug handling** (ties to ①'s immutable-caching trade-off): reject duplicates (safe
  default), auto-suffix, or allow overwrite + cache purge.
- Delete flow (remove all objects under `<slug>/`) — include now or defer.
- Extension→MIME mapping table (shared conceptually with what any writer sets).
- Upload limits' exact numbers.

**Suggested verify (done criteria):**

- Logged in, drop a single `.html`, pick a slug → it uploads, appears in the list, and the link
  renders (served by `artifact-server`).
- Drop a `.zip` bundle with assets → unzips, all assets load at the link with correct MIME types.
- A zip containing a `../` entry is rejected (zip-slip guard) without writing outside the prefix.
- Oversized / too-many-entry uploads are rejected.
- (If included) delete removes the artifact from the list and the link 404s.

**Gotchas:**

- Honour both origin-isolation invariants — the upload API is gated by ②'s host-only cookie, and
  writing must go through the main app's own credentials, never by loosening the `artifact-server`.
- The `artifact-server` never changes for ③ — it already serves whatever lands in the bucket.

---

## ④ artifact-update

**Goal**: update an already-hosted artifact **in place** — replace the files behind an existing slug
so the link you already shared (`artifacts.iwans.space/<slug>/`) serves the new version. This closes
the "re-used slug" question ③ deferred and the "immutable caching + overwriting a slug" trade-off ①
deferred (archived ① design, "Risks & mitigations").

- **Specs**: both capabilities' specs live in `iwanfrancis.com`, so this is authored as **one
  proposal with two delta specs** here. **Code spans two repos**: the write/UI change is in the main
  app (`artifact-management` feature); the cache-header change is in the sibling `artifact-server`
  repo (`artifact-hosting` capability).
- **Depends on**: ①②③ (all shipped/implemented).
- **Capabilities touched**: `artifact-hosting` (cache delta) + `artifact-management` (update delta).

**Decisions (locked in exploration):**

- **Caching — the load-bearing decision.** ① serves everything `Cache-Control: public,
  max-age=31536000, immutable`, which pins old bytes in viewers' browsers so a bucket overwrite never
  propagates to anyone who already loaded the artifact. **Switch ① to ETag validation caching**:
  serve the entrypoint (`index.html`, `meta.json`) as `no-cache` (or `max-age=60, must-revalidate`)
  **plus a strong `ETag` passed through from the S3 object**. A 304 on `If-None-Match` keeps repeat
  views cheap when nothing changed; a real change returns 200 with the new bytes and propagates on the
  next load. Chosen over: (a) a per-artifact cache-policy flag in `meta.json` — opt-in mutability is
  baked in at *first* serve, so anything you might ever update has to be revalidatable from the start
  anyway; (b) versioned/pointer URLs — needs HTML rewriting and only helps large multi-asset bundles,
  whereas the dominant case is a single self-contained `index.html` (Claude inlines assets; CSP blocks
  external fetches) with nothing heavy to protect.
- **Replace semantics — write-new, then prune (NOT a bare overwrite).** An update to a version with
  fewer/renamed files must not leave orphaned objects. Order: validate the whole new upload first →
  write new entries → write `meta.json` → **delete any key under `<slug>/` not in the new set**. No
  downtime (the artifact is a superset during the window) and a mid-update failure leaves v1 intact —
  this inverts ③'s "meta-last so a failed *create* leaves the slug absent"; here a failed *update*
  leaves the *previous* version whole.
- **API shape.** New `PUT /api/artifacts/[slug]` = "replace this slug"; co-locates with the existing
  `DELETE` on the `[slug]` route. `POST /api/artifacts` stays create-only (409 on an existing slug —
  unchanged). Same gating as POST/DELETE (same-origin + session, `runtime = 'nodejs'`).
- **UX — Update action on each artifact card** → a dialog scoped to that slug (slug shown read-only,
  title prefilled, drop a new `.html`/`.zip`). Chosen over "re-upload the same slug in the shared
  upload form + confirm": the card path is discoverable and can't typo onto the *wrong* artifact, and
  the deliberate pick-a-file-then-Replace flow is its own confirmation (no nested AlertDialog needed).
- **Metadata.** Preserve the original `createdAt`; add `updatedAt` (ISO-8601) — so `meta.json` grows
  an optional `updatedAt`, and reading old meta first is required to carry `createdAt` across. Blank
  title on update = **keep the existing title** (must NOT reset to slug, unlike create).

**Open for the proposal to decide:**

- Exact entrypoint header: `no-cache` (freshest) vs `max-age=60, must-revalidate` (cheap hot-cache
  window). Whether to revalidate *all* objects or only `index.html`/`meta.json` — moot for single-file
  artifacts, matters only for multi-asset zips with stable-named assets.
- `PUT` on a **non-existent** slug → 404 (suggested; create is POST's job) vs upsert.
- Whether to surface `updatedAt` on the card ("updated X") or keep showing `createdAt`.
- Card layout for a 4th action (2×2 grid vs an overflow menu) and whether the dropzone is extracted
  from `UploadForm` into a shared component both create and update reuse.

**Suggested verify (done criteria):**

- Upload v1, open the link, update to v2 → the link serves v2 on next load. Verify via the ETag/304
  round-trip (`If-None-Match` → 200 with new bytes), not just a bucket diff.
- Update a multi-file artifact to a version with a file removed → the orphaned key is gone from the
  bucket; the link still renders.
- An aborted/failed update leaves v1 fully intact (no partial state, link keeps working).
- Blank title on update keeps the existing title; `createdAt` unchanged, `updatedAt` set.
- `PUT` is rejected without a valid same-origin + session (parity with POST/DELETE).

**Gotchas:**

- **Sequencing: the ETag switch in ① must land first.** Until it does, an updated artifact still
  serves stale to anyone who cached it under `immutable`. And responses already served `immutable` to
  a viewer stay pinned for *that* viewer until they age out — the switch only governs responses served
  *after* it. So flip ① first, then rely on updates.
- **Cloudflare Cache Rule** — confirm it *revalidates* against origin on `max-age=0`/`no-cache` and
  forwards conditional (`If-None-Match`) requests, rather than treating them as "don't cache". This is
  the one operational unknown; the ① Cache Rule was set to "cache everything, respect origin TTL".
- Both origin-isolation invariants stay intact — `PUT` writes through the main app's own credentials;
  `artifact-server` gains only a **response-header change**, no new secrets, and stays public/read-only.
- This is the change that **revises the "slugs are immutable" invariant** and the ①
  `artifact-hosting` spec's "cached as immutable" requirement — update both when it ships.
