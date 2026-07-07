> Implementation lives mostly in the sibling **`artifact-server`** repo
> (`~/Documents/personal/artifact-server`). This `openspec/` change is the design record.
>
> **Status: COMPLETE (27/27).** `https://artifacts.iwans.space/vivaro-trafic-price-comparison/`
> serves 200 + `text/html` + immutable `Cache-Control`, edge-cached by Cloudflare (`cf-cache-status`
> MISS→HIT); `meta.json` is `application/json`; misses 404; malformed slugs 400; `iwans.space` does
> not serve artifact paths (308→404). Ready to archive.

## 1. Provision storage (Railway project)

- [x] 1.1 Create a Railway Bucket on the project and capture its env vars (`ENDPOINT`, `REGION`, `ACCESS_KEY_ID`, `SECRET_ACCESS_KEY`, `BUCKET`) — bucket `artifact-bucket-jlhswz6ol` is live
- [x] 1.2 Note these are **read** credentials for the artifact-server; record that the admin secret (change ②) must NOT be added to that service — _finding: Railway issues a single **full-access** key pair (the uploader wrote with it), so there is no read-only credential. The server is read-only by virtue of its code (GET/`GetObject` only), not the key. Still keep the admin secret off this service._

## 2. artifact-server: project setup

- [x] 2.1 Add dependencies (`@aws-sdk/client-s3`, and `hono` if chosen); set up TypeScript with minimal build/run scripts (`tsc` build to `dist/`, or a `tsx` runtime)
- [x] 2.2 Add fail-fast config that reads and validates the five bucket env vars at startup (clear error if any are missing)
- [x] 2.3 Create the S3 client configured from the env vars; resolve addressing style (`forcePathStyle`) and `region` against Railway and smoke-test a single `GetObject` — _resolved: Railway is **virtual-hosted** (`forcePathStyle` stays `false`, the default); `GetObject` smoke-tested end-to-end against the real bucket (server run locally against real creds served the artifact 200 + `text/html`)_
- [x] 2.4 Add a `getArtifactObject(key)` helper returning the body stream, stored `ContentType`, and a typed not-found signal (translate S3 `NoSuchKey`/404 into a miss, not a throw)

## 3. artifact-server: request handling

- [x] 3.1 Stand up the HTTP server (Hono on Node) handling GET for any path
- [x] 3.2 Map the request path to a key: `/<slug>/<path>` → `<slug>/<path>`, and `/<slug>` or `/<slug>/` → `<slug>/index.html`
- [x] 3.3 Validate before any S3 call: `slug` matches `^[a-z0-9]+(-[a-z0-9]+)*$`, reject any `..` segment or disallowed characters with HTTP 400 (validates the raw Node request target so literal `..` is rejected, not silently normalised)
- [x] 3.4 On hit, stream the object body, set `Content-Type` from stored metadata (fallback `application/octet-stream`), and set `Cache-Control: public, max-age=31536000, immutable`
- [x] 3.5 Return HTTP 404 for a missing key
- [x] 3.6 Decide and implement bare-root (`/`) behaviour on the subdomain (default: 404)

## 4. Deploy artifact-server (second Railway service)

- [x] 4.1 Create the GitHub repo `iwanfrancis/artifact-server` (SSH host alias `github.com-personal`) and push `main`
- [x] 4.2 Create a new Railway service in the same project from that repo; confirm zero-config Node build/start works — _deployed and serving publicly_
- [x] 4.3 Inject the bucket credentials as env vars on the service (via Railway `${{…}}` references) — _no admin secret exists yet (②); keep it off this service when it does_

## 5. Domain and edge configuration

- [x] 5.1 Add `artifacts.iwans.space` as a custom domain on the artifact-server service
- [x] 5.2 Create the Cloudflare DNS record for `artifacts.iwans.space` (CNAME, proxied / orange cloud) pointing at that service's target
- [x] 5.3 Add a Cloudflare Cache Rule for `artifacts.iwans.space` to cache all content and respect the origin `Cache-Control` — _done: rule added; `cf-cache-status` now MISS→HIT_

## 6. Verify end-to-end by hand

- [x] 6.1 Push `demo/index.html`, one asset (e.g. `demo/app.js`), and `demo/meta.json` to the bucket via an S3 CLI, each with the correct `Content-Type` — _pushed `vivaro-trafic-price-comparison/{index.html,meta.json}` via `scripts/upload.ts` (a self-contained single-file artifact, so no separate asset); content-types set from extension_
- [x] 6.2 Open `https://artifacts.iwans.space/demo/` and confirm it renders, the asset loads, and MIME types are correct — _`https://artifacts.iwans.space/vivaro-trafic-price-comparison/` → 200 `text/html`, renders_
- [x] 6.3 Confirm the response carries `Cache-Control: public, max-age=31536000, immutable` and repeat requests hit the Cloudflare edge cache — _verified: 1st hit `MISS`, subsequent hits `HIT`_
- [x] 6.4 Confirm HTTP 404 for a missing key and HTTP 400 for a malformed request (`..` segment, invalid slug) — _verified against the real bucket (missing key → 404) and over real HTTP (`..` and bad slug → 400)_
- [x] 6.5 Confirm the same slug path on the `iwans.space` origin does not serve the artifact (the main app has no artifact routing) — origin isolation — _`iwans.space/<slug>/` → 308 → 404, artifact heading absent_
- [x] 6.6 Confirm `demo/meta.json` parses as JSON with `slug`, `title`, and an ISO-8601 `createdAt` — _served `meta.json` from the real bucket parses with all three fields_

## 7. Wrap-up

- [x] 7.1 Set up formatting/linting in the artifact-server repo (mirror the site's Biome conventions or a minimal equivalent) and run it clean
- [x] 7.2 In the site repo, note in CLAUDE.md/README that `artifact-server` exists, its role and subdomain, and the manual S3-push workflow — flagging that upload, auth, and the management UI are changes ② and ③
- [x] 7.3 Verified the serve path with a temporary mock-S3 (`s3rver`) integration test + a manual uploader, using the campervan price-comparison artifact as the fixture, before the live checks in group 6 — _then removed all of it (test, fixture, uploader, `s3rver` dep, `app.ts` split) as verification-only scaffolding; the repo is back to the shipped serving code. The artifact itself remains hosted in the bucket_
