## Why

I regularly produce self-contained Claude artifacts (usually a single HTML file, sometimes a
small multi-file bundle) that I want to share with a stable, friendly link. Today I have nowhere
to put them — the site is entirely static/RSC with no storage or dynamic surface. This change
builds the **hosting substrate**: object storage plus a public serving path, so that once an
artifact's files exist in the bucket they are viewable and shareable at
`https://artifacts.iwans.space/<slug>/`.

Crucially, an artifact is arbitrary HTML/JS — hosting one is hosting untrusted code. Serving it
from a **separate origin** (the `artifacts.iwans.space` subdomain) is what keeps that code boxed
away from the main site's cookies, storage, and future admin session. Getting this substrate and
its isolation right first — provable by hand, before any UI — de-risks everything that follows.

**This is change ① of three.** The wider effort:

1. **`artifact-hosting`** (this change) — storage + public serving substrate.
2. **`admin-auth`** (later) — self-contained password + httpOnly cookie gate for the management
   surface.
3. **`artifact-management`** (later) — upload API (safe unzip) + drag-and-drop management UI +
   listing at `/artifacts`.

This proposal deliberately excludes auth, the upload endpoint, and the management UI. It ends when
a hand-pushed artifact is viewable at its public link.

Changes ② and ③ are documented in detail in
[`openspec/notes/artifact-hosting-roadmap.md`](../../notes/artifact-hosting-roadmap.md) — enough
for another agent to propose them.

## What Changes

- Provision a **Railway Bucket** (S3-compatible object storage) on the project as the artifact
  store, credentialled via Railway env vars (`ENDPOINT`, `REGION`, `ACCESS_KEY_ID`,
  `SECRET_ACCESS_KEY`, `BUCKET`).
- Stand up a **dedicated `artifact-server`** — a small single-purpose service in its own repo
  (`artifact-server`), deployed as a **second Railway service in the same project** and bound to the
  new public subdomain **`artifacts.iwans.space`**. It holds only the bucket's **read**
  credentials.
- The server maps a request to an S3 object key (`<slug>/<path>`, defaulting to `<slug>/index.html`
  for root/directory requests) via `@aws-sdk/client-s3`, fetches the object, and streams it back
  with its stored `Content-Type` and a long-lived immutable `Cache-Control` header. Missing keys
  return 404; malformed slugs/paths are rejected with 400.
- Define the **storage contract** every later change depends on: each artifact lives under a
  `<slug>/` key prefix containing `index.html`, any assets, and a `meta.json`
  (`{ slug, title, createdAt }`). No database — the bucket is the source of truth.
- Origin isolation comes from the dedicated service + subdomain: the main site has no artifact
  routing at all, so artifact code runs on a separate browser origin **and** a separate process
  that never holds the site's admin secret.

Non-goals (explicitly deferred): any upload mechanism, authentication, the `/artifacts` management
page, listing UI, and safe-unzip handling. Artifacts are placed into the bucket manually (S3 CLI)
for this change.

## Capabilities

### New Capabilities

- `artifact-hosting`: Object storage for hosted artifacts and the public, origin-isolated serving
  path that turns a `<slug>/` key prefix into a shareable link, including the key/`meta.json`
  storage contract, content-type handling, caching, and 404/validation behaviour.

### Modified Capabilities

<!-- None. This is net-new surface; it does not change any existing spec's requirements.
     `hosting-deployment` covers how the *site* is built/served on Railway and is unaffected. -->

## Impact

- **Repos**: implementation lands mostly in the new sibling **`artifact-server`** repo; this
  `openspec/` change is the design record. The main site repo is essentially untouched by ① (it
  re-enters at ③ for upload/management).
- **Dependencies**: `artifact-server` adds `@aws-sdk/client-s3` (+ likely `hono`). No new deps in
  the site repo.
- **Infrastructure**: a Railway Bucket must be provisioned; a **second Railway service** created
  from the `artifact-server` repo with the bucket read credentials; an `artifacts.iwans.space` DNS
  record (Cloudflare, proxied) pointing at that service; and a Cloudflare Cache Rule for the
  subdomain.
- **Security/privacy**: introduces a public, unauthenticated serving path by design (share links).
  Untrusted artifact code runs on an isolated subdomain origin **and** a separate process that
  holds only read credentials — the admin secret (②) never reaches it. Serving is read-only; writes
  are manual/admin until change ③.
- **Runtime**: the artifact-server sits in the read path for cache misses only; immutable caching
  plus the Cloudflare proxy keep this to cold fetches. A second always-on service consumes a small
  amount of Railway resource allowance.
