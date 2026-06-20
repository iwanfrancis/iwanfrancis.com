## Context

The site (Next.js 15 App Router, React 19, yarn classic) runs on Vercel today with
**zero deploy config** — Vercel auto-detects Next.js. There is no `vercel.json`, no
Dockerfile, no env vars, and no Vercel-specific code (no `@vercel/*` deps, no analytics,
no edge functions). The only Vercel-provided behaviour the app relies on implicitly is
image optimisation, used by two `next/image` calls (headshot, company logo).

So the migration is mostly "run the same build elsewhere and repoint DNS", not a port.
The two areas needing a decision are how Railway builds the app and how the custom domain
is cut over without downtime. `iwanfrancis.com` is live, so the DNS step is the only
outward-facing, downtime-capable part.

## Goals / Non-Goals

**Goals:**
- Serve `iwanfrancis.com` (apex + `www`) from Railway over HTTPS, with deploy-on-push to `main`.
- Keep the change minimal and reversible until the domain cutover is verified.
- Make local and Railway builds use the same Node version.
- Remove the Vercel project once Railway is confirmed serving the domain.

**Non-Goals:**
- The game subdomain (separate project / deploy).
- A Dockerfile or container build, and `output: 'standalone'`.
- Any change to site content, UI, or runtime behaviour.
- Preview/PR environments (Railway can do them later; not needed now).

## Decisions

### D1: Build with Railway's zero-config builder, not a Dockerfile
Railway's builder (Railpack, successor to Nixpacks) detects Next.js + `yarn.lock` and runs
`yarn build` → `yarn start` with no config. For a CV site this is the right level.

- **Alternative — Dockerfile + `output: 'standalone'`**: leaner image, fully reproducible,
  but more to own (base image, `sharp`, copying `.next/static` and `public`, Node user).
  Not worth it for this site. The standalone note in CLAUDE.md's backlog only applies to
  *this* path, so it's being removed, not actioned.
- **Consequence**: the app runs under `next start` (a long-running Node server), so Railway
  bills for an always-on service rather than per-request functions. Acceptable and expected.

### D2: Disable Next.js image optimisation (`images.unoptimized: true`)
On Vercel, image optimisation is handled by Vercel's infra. Under `next start` on Railway it
becomes a runtime job needing `sharp`. The site has two small static images, so optimisation
is near-worthless here and only adds a failure mode.

- **Alternative — leave it on and rely on `sharp`**: usually works under `next start`, but
  it's a moving part with no payoff for two images.
- **Alternative — keep on, add a Dockerfile that bundles `sharp`**: rejected with D1.

### D3: Pin Node via `.nvmrc` + `engines.node`
Nothing pins Node today; local needs 20.x (yarn via corepack) while Railway would pick its
own default. Pin to Node 20 to match local and avoid "works on Railway, not locally". `.nvmrc`
drives local tooling and Railway; `engines.node` documents and enforces the floor.

- **Alternative — `packageManager` / Corepack pin**: orthogonal (pins yarn, not Node);
  could be added but isn't required for the migration.

### D4: Verify-first DNS cutover, Vercel stays live until confirmed
Deploy and fully verify on the `*.up.railway.app` URL before touching DNS. Add the domain in
Railway, get its DNS target, lower TTL beforehand, then repoint records. Keep Vercel serving
throughout; only remove the domain from Vercel after Railway serves it over valid HTTPS.

- **Alternative — repoint DNS first, then verify**: risks a downtime/broken-TLS window.
  Rejected.
- **Apex handling**: many registrars can't `CNAME` a root domain; needs ALIAS/ANAME or the
  registrar's flattening. `www` is a plain CNAME. Exact records depend on the registrar
  (see Open Questions).

## Risks / Trade-offs

- **DNS cutover downtime / TLS gap** → Verify on the Railway URL first; lower TTL ahead of
  time; keep Vercel live; switch records only once Railway is ready; confirm Railway's
  Let's Encrypt cert issues before removing the domain from Vercel.
- **Apex domain can't CNAME at the registrar** → Confirm the registrar supports ALIAS/ANAME
  (or flattening) before cutover; if DNS currently sits inside Vercel, move DNS hosting out
  first so Vercel can be decommissioned cleanly.
- **Build differs from local (Node mismatch)** → D3 pins Node; verify the Railway build log
  shows the pinned version.
- **Image rendering regression from `unoptimized`** → Low; images are small and static.
  Verify both images load on the Railway URL during the pre-cutover check.
- **Always-on cost on Railway vs free Vercel hobby** → Accepted; this is the user's choice
  (consolidation / future game hosting). No mitigation needed, noted for awareness.

## Migration Plan

1. Pin Node, set `images.unoptimized`, commit (no behaviour change; safe to ship while still
   on Vercel).
2. Create the Railway project, connect the GitHub repo, deploy-on-push to `main`.
3. Deploy and **fully verify** on the `*.up.railway.app` URL (both images, all sections, HTTPS).
4. Lower DNS TTL; add `iwanfrancis.com` + `www` in Railway; capture the DNS targets.
5. Repoint registrar records (apex via ALIAS/ANAME, `www` via CNAME); wait for propagation
   and Railway TLS issuance.
6. Verify `https://iwanfrancis.com` and `www` serve from Railway with a valid cert.
7. Remove the domain from Vercel and delete the Vercel project.
8. Update CLAUDE.md (platform + drop the standalone backlog note).

**Rollback**: before step 7, repoint DNS back to Vercel (still live) — full revert. After
step 7, re-add the domain in Vercel and repoint. Code changes (D2/D3) are inert on Vercel,
so no code rollback is needed.

## Open Questions

- **Which registrar / DNS host manages `iwanfrancis.com`?** Determines the exact apex records
  (ALIAS/ANAME vs flattening) and whether DNS hosting needs to move off Vercel first. Confirm
  at apply time before step 5.
- **Pin Node to 20.x or move to 22?** Defaulting to 20 to match local; revisit if local moves
  to 22.
