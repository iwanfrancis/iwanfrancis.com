## 1. Repo prep (safe to ship while still on Vercel)

- [x] 1.1 Add `.nvmrc` pinning Node to a 20.x version (matching local)
- [x] 1.2 Add `engines.node` to `package.json` compatible with `.nvmrc`
- [x] 1.3 Set `images: { unoptimized: true }` in `next.config.mjs`
- [x] 1.4 Verify locally: `yarn build` then `yarn start` succeed and the rendered `next/image` images (company logos) load without the optimiser (note: `Headshot` is unused dead code — not rendered)
- [x] 1.5 Commit the repo-prep changes (no behaviour change; inert on Vercel)

## 2. Railway setup

- [ ] 2.1 Create the Railway project and connect it to the GitHub repo
- [ ] 2.2 Enable deploy-on-push to `main` (no manual deploy step)
- [ ] 2.3 Trigger the first deploy; confirm the build log uses the pinned Node version and runs `yarn build` → `yarn start`
- [ ] 2.4 Fully verify on the `*.up.railway.app` URL: all sections load, both images render, HTTPS is valid

## 3. Domain cutover (verify-first; Vercel stays live)

- [ ] 3.1 Confirm the registrar/DNS host for `iwanfrancis.com` and that it supports apex ALIAS/ANAME (or flattening); if DNS is currently hosted inside Vercel, move DNS hosting out first
- [ ] 3.2 Lower the DNS TTL on the relevant records ahead of the cutover
- [ ] 3.3 Add `iwanfrancis.com` (apex) and `www` as custom domains in Railway; capture the DNS targets it provides
- [ ] 3.4 Repoint registrar records — apex via ALIAS/ANAME, `www` via CNAME — at the Railway targets
- [ ] 3.5 Wait for DNS propagation and Railway's TLS certificate to issue
- [ ] 3.6 Verify `https://iwanfrancis.com` and the `www` subdomain serve from Railway with a valid certificate

## 4. Decommission & docs

- [ ] 4.1 Remove the domain from Vercel and delete the Vercel project
- [ ] 4.2 Update `CLAUDE.md`: record Railway as the deployment platform and drop the `output: 'standalone'` note from the cleanup backlog
- [ ] 4.3 Restore the DNS TTL to a normal value
