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
- **Apex handling**: see D5. `www` is a plain CNAME either way.

### D5: Move DNS to Cloudflare to point the apex at Railway
DNS is hosted at **GoDaddy** (registrar = GoDaddy; nameservers `ns37/38.domaincontrol.com`).
The zone holds only the two website records (apex `A 76.76.21.21` and `www CNAME
cname.vercel-dns.com`, both Vercel) — **no MX, TXT, or CAA records**, so no email or other
infrastructure depends on it. GoDaddy's DNS supports neither ALIAS/ANAME nor CNAME
flattening on the apex, and Railway only issues **CNAME** targets (no stable static IP), so
the bare domain can't be pointed at Railway from GoDaddy.

Decision: keep the domain registered at GoDaddy but **move DNS hosting to Cloudflare** (free)
by switching nameservers — this is the exact workaround Railway's docs name for GoDaddy.
Cloudflare's CNAME flattening lets the apex CNAME to Railway's target; `www` is a normal
CNAME. Records are set **DNS-only (grey cloud)** so Railway can verify the domain and issue
its own Let's Encrypt certificate (RSA 2048, auto-renewed, issued within ~1h of the DNS
update). This is Railway's recommended setup for root domains and also eases the future game
subdomain.

**Each Railway custom domain requires TWO records: a CNAME and a TXT** (ownership
verification). Per the docs, "the domain will not verify with only the CNAME in place." So
both apex and `www` need their CNAME *and* their TXT recreated in Cloudflare.

**Plan limit**: Railway's Trial plan allows only **1** custom domain (can't hold both apex and
`www`); **Hobby** allows 2, Pro 20. Adding both apex + `www` therefore requires at least the
Hobby plan — consistent with the accepted always-on cost.

- **Alternative — GoDaddy domain forwarding (apex → www)**: no nameserver change, but `www`
  becomes canonical and GoDaddy forwarding is flaky with HTTPS on the bare domain. Rejected.
- **Alternative — move to a dynamic-ALIAS DNS provider (DNSimple, bunny.net)**: also supported
  by Railway, but Cloudflare is free, more capable, and the documented default. Rejected.
- **Alternative — A record to a Railway IP**: Railway gives no stable static IP for custom
  domains. Not viable.
- **Cloudflare proxy (orange cloud)**: optional later (CDN/caching). If enabled, Cloudflare's
  SSL/TLS mode MUST be **Full** (not Full (strict) — that causes redirect loops), and Railway
  may then serve via its default `*.up.railway.app` cert.

**As built**: records ended up **proxied (orange cloud)** rather than grey. Verified working —
apex, `www`, and the game's `balls` subdomain all return HTTP 200 via `server: cloudflare`
with a valid edge certificate, Cloudflare proxying to the Railway origin. Cloudflare terminates
TLS at its edge (Railway no longer needs to issue the custom-domain cert). The grey-cloud path
remains a valid fallback if the proxy ever needs to be removed.

**Domain change**: after cutover the canonical domain was changed to **iwans.space** (apex +
`www`, same Cloudflare account → Railway, proxied, serving HTTP 200). The original
**iwanfrancis.com** now 301-redirects to iwans.space via a Cloudflare redirect rule backed by
a proxied dummy A record (apex working; the `www.iwanfrancis.com` redirect is still to be
added). The redirect rule only fires because a proxied DNS record exists for the hostname —
without one the domain doesn't resolve and the rule never runs.

## Risks / Trade-offs

- **DNS cutover downtime / TLS gap** → Verify on the Railway URL first; lower TTL ahead of
  time; keep Vercel live; switch records only once Railway is ready; confirm Railway's
  Let's Encrypt cert issues before removing the domain from Vercel.
- **GoDaddy can't point the apex at Railway** → Move DNS to Cloudflare for CNAME flattening
  (D5). The zone has no MX/TXT/CAA records, so the only records affected by the nameserver
  move are the two website records, which are changing anyway.
- **Nameserver-change propagation window** → The NS switch can take up to ~24h. Vercel stays
  live throughout (records can revert), so there's no hard downtime; verify on Cloudflare +
  Railway before decommissioning Vercel.
- **Railway plan caps custom domains** → Trial allows only 1; apex + `www` need Hobby+ (2).
  Confirm the plan before adding the second domain, else `www` (or apex) can't be attached.
- **Missing TXT record blocks verification** → Railway requires a CNAME *and* a TXT per
  domain; create both in Cloudflare or the domain never verifies and no cert issues.
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
4. Ensure the Railway plan allows 2 custom domains (Hobby+). Add `iwanfrancis.com` + `www` as
   custom domains in Railway; capture **both the CNAME and TXT records** for each.
5. Add the site to Cloudflare; recreate the zone with apex + `www` CNAME → Railway targets
   **plus their TXT verification records**, all DNS-only (grey cloud), TTL auto. (No other
   records exist to migrate.)
6. At GoDaddy, switch nameservers to Cloudflare's; wait for NS propagation + Railway TLS
   issuance.
7. Verify `https://iwanfrancis.com` and `www` serve from Railway with a valid cert.
8. Remove the domain from Vercel and delete the Vercel project.
9. Update CLAUDE.md (platform + drop the standalone backlog note).

**Rollback**: before step 8, point the Cloudflare records back at Vercel (apex `A 76.76.21.21`,
`www CNAME cname.vercel-dns.com`) — Vercel stays live throughout. Before the NS switch (step 6)
the original GoDaddy NS still work, so reverting nameservers is also an option. Code changes
(D2/D3) are inert on Vercel, so no code rollback is needed.

## Open Questions

- ~~**Which registrar / DNS host manages `iwanfrancis.com`?**~~ Resolved: GoDaddy (registrar +
  DNS). No MX/TXT/CAA records. Apex handled by moving DNS to Cloudflare for CNAME flattening
  (D5).
- **Pin Node to 20.x or move to 22?** Defaulting to 20 to match local; revisit if local moves
  to 22.
