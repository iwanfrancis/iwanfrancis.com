## Context

The site is a static/RSC Next.js 15 app on Railway, fronted by Cloudflare (proxied), with no
storage, no dynamic backend, and no auth. This change adds somewhere to put a Claude artifact's
files and a public URL to view them at.

An artifact is arbitrary HTML/JS — hosting one is hosting untrusted code. The design's central
constraint is **origin isolation**: artifact code must run on a browser origin separate from the
main site and any future admin session, so it can never read the site's cookies/storage or reach
same-origin APIs.

Serving is delivered by a **dedicated `artifact-server`** — a small, single-purpose service in its
own repo (`~/Documents/personal/artifact-server`, remote
`git@github.com-personal:iwanfrancis/artifact-server.git`), deployed as a **second Railway service
in the same project** and bound to `artifacts.iwans.space`. So the implementation of this change
lives mostly in that repo; the `openspec/` record and design stay here.

This is change ① of three (`artifact-hosting` → `admin-auth` → `artifact-management`). It stops at
"a hand-placed artifact is viewable at its link". No upload, no auth, no UI here.

## Goals / Non-Goals

**Goals:**

- Object storage for artifacts, self-contained on Railway.
- A public, origin-isolated serving path: `https://artifacts.iwans.space/<slug>/…`, served by a
  separate process holding only the bucket's read credentials.
- A durable storage contract (`<slug>/` prefix + `index.html` + assets + `meta.json`) that changes
  ② and ③ build on unchanged.
- Correct content types, immutable caching, 404s, and rejection of malformed requests.
- Provable end-to-end by hand (S3 CLI push → open link), with zero UI.

**Non-Goals:**

- Any upload mechanism, authentication, `/artifacts` management page, listing UI, or safe-unzip
  (all deferred to ② and ③).
- A database or search index (the bucket is the source of truth).
- Cache invalidation / re-publishing a slug (slugs are treated as immutable here).

## Decisions

### Decision: A dedicated `artifact-server` (own repo, second Railway service)

Serve artifacts from a separate single-purpose service rather than from the main Next app.

- **Why (domain cap):** the main Railway service already carries `iwans.space` + `www.iwans.space`
  and cannot take a third custom domain on the current plan. A second service has its own
  custom-domain budget, so `artifacts.iwans.space` binds cleanly there.
- **Why (isolation):** untrusted artifact code is served by a separate process whose environment
  holds only the bucket **read** credentials. The admin secret introduced in change ② never enters
  this service. Browser origin isolation (the subdomain) is preserved on top of this process
  separation.
- **Why (simplicity):** the main app needs no host-sniffing middleware and no internal rewrite
  segment. Each deployable does exactly one thing.
- **Coupling:** the server shares only the bucket and the key convention with the rest of the
  system; it never reads `meta.json`.
- **Alternatives considered:**
  - *One service + host-based middleware routing* (the earlier design) — blocked by the domain cap
    and gives weaker isolation.
  - *Same repo deployed twice behind an env flag* — rejected: one artifact behaving as two things
    via a flag is confusing.
  - *Dedicated server as a subdir/monorepo in the site repo* — rejected to keep the site a clean
    single Next app (per its bulletproof-react structure).

### Decision: Serve by proxying (not presigned URLs) — this is the server's whole job

Railway Buckets cannot be made public ("Public buckets are currently not supported"), so a process
must sit in the serving path.

- **Presigned URLs rejected:** an artifact's `index.html` references assets with relative paths;
  the browser would fetch those without a signature → 403. Presigned URLs also expire, so links
  aren't durable. Unusable for hosting a browsable page.
- **Proxy chosen:** on each request the server does an S3 `GetObject` on the mapped key and streams
  the body back, with full control of content-type, caching, and 404s.

### Decision: Framework and runtime for `artifact-server`

- **Hono on Node.js** (chosen) — tiny, first-class streaming, clean routing, deploys zero-config on
  Railway. *Alternative:* plain Node `http` (zero deps beyond the S3 SDK) — more boilerplate for
  streaming and headers.
- **TypeScript**, to match the wider ecosystem. Exact build/run approach (a `tsc` build to `dist/`
  vs a `tsx`/type-stripping runtime) is an implementation detail settled at apply.
- **Storage access** via `@aws-sdk/client-s3`, configured from the injected Railway Bucket env vars.

### Decision: Key mapping, index defaulting, and validation

- `/<slug>/<path>` → key `<slug>/<path>`; `/<slug>` or `/<slug>/` → key `<slug>/index.html`.
- `slug` must match `^[a-z0-9]+(-[a-z0-9]+)*$`; any path segment equal to `..`, or disallowed
  characters, is rejected with 400 **before** any S3 call. (Keys are flat, so this is
  belt-and-braces, not the only guard.)
- `Content-Type` is taken from the object's stored metadata; if absent, fall back to
  `application/octet-stream`. Writers (S3 CLI now, upload API in ③) set content-type from the file
  extension.
- Successful responses set `Cache-Control: public, max-age=31536000, immutable`.

### Decision: `meta.json` is public and minimal

`meta.json` (`{ slug, title, createdAt }`) sits in the prefix and is served like any other object.
It holds nothing sensitive, and this server never reads it — listing (change ③) reads it
server-side from the main app via `ListObjectsV2`. Keeping it in-bucket avoids a database and keeps
the bucket authoritative.

## Risks / Trade-offs

- **Cloudflare won't edge-cache HTML by default** → HTML isn't cached on extension alone, so every
  view could hit the artifact-server. Mitigation: a Cloudflare **Cache Rule** on
  `artifacts.iwans.space` to "cache everything" and respect the origin's `Cache-Control`. Without
  it, correctness is unaffected — only origin load rises.
- **S3 addressing style / region** → **RESOLVED during apply:** Railway is virtual-hosted, so
  `forcePathStyle` stays `false` (the SDK default) and reads/writes work against the real bucket
  with no override. An `S3_FORCE_PATH_STYLE` escape hatch remains if that ever changes. _Local
  gotcha:_ Railway's variable UI exposes `${{…}}` reference syntax, not resolved values — a local
  `.env` needs the actual values copied from the Bucket service.
- **Immutable caching + overwriting a slug** → replacing a slug's files leaves stale bytes cached
  for up to a year. Accepted here (slugs are immutable); versioning/purge deferred to ③.
- **A second always-on service uses some Railway resource allowance** → trivial for a low-traffic
  artifact server, and the server is a tiny footprint. Railway **watch paths** can also stop it
  redeploying on unrelated commits (it lives in its own repo anyway, so this is naturally scoped).
- **Public serving with no auth by design** → the server is GET-only and exposes no write path.
  _Finding during apply:_ Railway issues a **single full-access** key pair (no read-only scope), so
  the "read-only" property is **enforced by the server's code**, not by the credential. Acceptable
  at personal scale; a compromise of the service process could write. Still: put no secrets in this
  bucket, and never add the admin secret (②) to this service. Revisit if Railway adds scoped keys.
- **Host handling** → routing no longer depends on the `Host` header (the service is dedicated), so
  the earlier host-trust concern is gone; the server may still 404 non-artifact-shaped requests.

## Migration Plan

1. Provision a Railway Bucket on the project; capture its credentials.
2. In the `artifact-server` repo (scaffolded): add deps, build the S3 client + serving logic.
3. Create the GitHub repo `iwanfrancis/artifact-server` (SSH host alias `github.com-personal`) and
   push `main`.
4. Create a **second Railway service** in the same project from that repo; inject the bucket
   **read** credentials only (confirm the admin secret is absent).
5. Add `artifacts.iwans.space` as a custom domain on the new service; create the Cloudflare DNS
   record (CNAME, proxied) to that service's target.
6. Add the Cloudflare Cache Rule for the subdomain (cache everything, respect origin TTL).
7. Smoke-test by hand: push `demo/index.html` (+ an asset, + `meta.json`) via an S3 CLI with
   correct content-types; open `https://artifacts.iwans.space/demo/` and verify render, assets,
   MIME types, `Cache-Control`, 404 on a missing key, 400 on a malformed request, and that the
   same path on `iwans.space` does not serve it.
8. **Rollback:** additive and reversible — remove the service or its domain. No data migration; the
   bucket can be left in place or emptied.

## Open Questions

- Exact S3 client config for Railway (path-style vs virtual-hosted, region value) — resolve by the
  smoke test in step 2/4.
- Confirm Hono vs plain Node `http`, and TS build vs `tsx` runtime — lean Hono + TS; finalise at
  apply.
- Should a bare `/` on `artifacts.iwans.space` (no slug) 404, redirect to the main site, or show a
  minimal index? Default to 404 for now; revisit in ③ when a listing exists.
