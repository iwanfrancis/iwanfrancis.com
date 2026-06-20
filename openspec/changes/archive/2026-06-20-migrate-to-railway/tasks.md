## 1. Repo prep (safe to ship while still on Vercel)

- [x] 1.1 Add `.nvmrc` pinning Node to a 20.x version (matching local)
- [x] 1.2 Add `engines.node` to `package.json` compatible with `.nvmrc`
- [x] 1.3 Set `images: { unoptimized: true }` in `next.config.mjs`
- [x] 1.4 Verify locally: `yarn build` then `yarn start` succeed and the rendered `next/image` images (company logos) load without the optimiser (note: `Headshot` is unused dead code — not rendered)
- [x] 1.5 Commit the repo-prep changes (no behaviour change; inert on Vercel)

## 2. Railway setup

- [x] 2.1 Create the Railway project and connect it to the GitHub repo
- [x] 2.2 Enable deploy-on-push to `main` (no manual deploy step)
- [x] 2.3 Trigger the first deploy; confirm the build log uses the pinned Node version and runs `yarn build` → `yarn start`
- [x] 2.4 Fully verify on the `*.up.railway.app` URL: all sections load, both images render, HTTPS is valid

## 3. Domain cutover via Cloudflare (verify-first; Vercel stays live)

- [x] 3.1 Confirm DNS host + apex strategy — resolved: GoDaddy DNS, no MX/TXT/CAA records; move DNS to Cloudflare for apex CNAME flattening (design D5)
- [x] 3.2 Confirm the Railway plan allows 2 custom domains (Hobby = 2; Trial = 1) so apex + `www` can both be added — confirmed (both domains added successfully)
- [x] 3.3 In Railway, add `iwanfrancis.com` (apex) and `www` as custom domains; capture **both the CNAME and the TXT** record each provides
- [x] 3.4 Create a free Cloudflare account and add the `iwanfrancis.com` site (let it scan existing records)
- [x] 3.5 In Cloudflare, create the apex + `www` `CNAME` → Railway targets **and their TXT verification records**; remove the old Vercel records (as built: records set **proxied / orange cloud**, see design D5 "As built")
- [x] 3.6 At GoDaddy, switch the nameservers to Cloudflare's two nameservers — NS now Cloudflare; apex + `www` resolve via the Cloudflare proxy to the Railway origin, TXT records resolve
- [x] 3.7 Domain verified + TLS in place — Cloudflare serves a valid edge cert in front of the Railway origin (proxied path), so no Railway-issued custom-domain cert is needed
- [x] 3.8 Verify `https://iwanfrancis.com` and `www` serve correctly — both return HTTP 200 via `server: cloudflare` with a valid certificate (game `balls` subdomain also verified)

## 4. Decommission & docs

- [x] 4.1 Remove the domain from Vercel and delete the Vercel project
- [x] 4.2 Update `CLAUDE.md`: record Railway (+ Cloudflare DNS) as the deployment platform and drop the `output: 'standalone'` backlog note
- [x] 4.3 ~~Restore the DNS TTL~~ — N/A: cutover was a nameserver move to Cloudflare, not a TTL-juggled record swap; no TTL was lowered to restore
