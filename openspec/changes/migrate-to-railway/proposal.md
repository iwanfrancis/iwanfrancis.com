## Why

The site is hosted on Vercel; the plan is to run it on Railway instead (consolidating
hosting, and likely co-locating the upcoming game subdomain there later). The migration
was always intended as the first OpenSpec change (see CLAUDE.md), and the site is at its
simplest right now — no env vars, no Vercel-specific code — so this is the cheapest it
will ever be to move.

## What Changes

- Build and run the app on **Railway** using its zero-config builder (Railpack/Nixpacks
  auto-detects Next.js + `yarn.lock`, runs `yarn build` then `yarn start`). No Dockerfile
  and no `output: 'standalone'` — those are only needed on the Dockerfile path.
- **Pin the Node version** (`.nvmrc`, backed by `engines.node` in `package.json`) so
  Railway and local builds agree. Today nothing pins Node: local needs 20.x for yarn,
  Railway would pick its own default.
- Set `images: { unoptimized: true }` in `next.config.mjs`. Vercel optimises images on
  its own infra; under `next start` on Railway that work falls to `sharp` at runtime. For
  the two static images on the site (headshot, company logo) optimisation buys nothing and
  only adds a deployment failure mode, so disable it.
- **Cut the custom domain over to Railway**: point `iwanfrancis.com` (apex) and `www` at
  Railway, verify HTTPS on the Railway target first, and only then remove the domain from
  Vercel. Vercel stays live and untouched until the cutover is confirmed.
- **Decommission the Vercel project** once Railway is serving the domain over HTTPS.
- Update CLAUDE.md to record Railway as the deployment platform and drop the now-incorrect
  "`next.config.mjs` will likely need `output: 'standalone'` for Railway" note from the
  cleanup backlog.

Non-goals: the game subdomain (separate project, separate deploy); any change to the
site's content, UI, or runtime behaviour; introducing a Dockerfile or container build;
adding CI beyond Railway's built-in deploy-on-push.

## Capabilities

### New Capabilities
- `hosting-deployment`: How and where the site is built, deployed, and served — the
  hosting platform and build/start commands, the pinned runtime version, image handling,
  the custom-domain mapping, and the deploy trigger.

### Modified Capabilities
<!-- None — no existing spec covers hosting or deployment. -->

## Impact

- **New files**: `.nvmrc`.
- **Edited files**: `next.config.mjs` (`images.unoptimized`); `package.json` (`engines.node`);
  `CLAUDE.md` (platform + backlog note).
- **External systems**: a new Railway project connected to the GitHub repo with
  deploy-on-push to `main`; DNS records updated at the domain registrar (apex + `www`);
  the Vercel project removed after cutover.
- **Risk**: the DNS cutover is the only outward-facing, downtime-capable step. Mitigated by
  verifying on the `*.up.railway.app` URL first, lowering TTL beforehand, and keeping Vercel
  live until Railway serves the domain over HTTPS. Apex-domain handling is registrar-dependent
  (ALIAS/ANAME vs CNAME) — confirm at apply time.
- **Behaviour**: no change for visitors; same app, same content, different host.
