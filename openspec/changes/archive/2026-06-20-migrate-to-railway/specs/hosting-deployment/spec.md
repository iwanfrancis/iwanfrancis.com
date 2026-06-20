## ADDED Requirements

### Requirement: Site is hosted on Railway

The production site SHALL be built and served on Railway using Railway's zero-config
builder, which detects Next.js and the yarn lockfile and runs the project's build and
start scripts. The site SHALL NOT be built with a custom Dockerfile, and `next.config.mjs`
SHALL NOT set `output: 'standalone'`. After cutover, the site SHALL NOT be deployed on
Vercel.

#### Scenario: Railway builds with the project's yarn scripts

- **WHEN** the Railway service builds the app
- **THEN** it installs dependencies with yarn from `yarn.lock`
- **AND** it runs `yarn build` and then `yarn start`

#### Scenario: No container build is introduced

- **WHEN** the repo root is inspected
- **THEN** no `Dockerfile` exists
- **AND** `next.config.mjs` does not set `output: 'standalone'`

#### Scenario: Vercel no longer serves the site

- **WHEN** the Vercel account is inspected after cutover
- **THEN** no Vercel project serves `iwanfrancis.com`

### Requirement: Pinned Node runtime

The repository SHALL pin the Node.js version used to build and run the app via an
`.nvmrc` file backed by a matching `engines.node` field in `package.json`, so local and
Railway builds use the same Node major version.

#### Scenario: Node version is pinned in the repo

- **WHEN** the repo root is inspected
- **THEN** `.nvmrc` exists and names a Node 20 version
- **AND** `package.json` has an `engines.node` field compatible with `.nvmrc`

#### Scenario: Railway uses the pinned version

- **WHEN** Railway builds the app
- **THEN** it uses the Node version named by the repo's pin

### Requirement: Image optimisation disabled

Next.js runtime image optimisation SHALL be disabled via `images.unoptimized: true` in
`next.config.mjs`, so images are served directly without a runtime optimiser or a `sharp`
dependency at serve time.

#### Scenario: Image optimisation is off

- **WHEN** `next.config.mjs` is inspected
- **THEN** `images.unoptimized` is `true`

#### Scenario: Images render on Railway

- **WHEN** a page using `next/image` (the headshot or company logo) is served from Railway
- **THEN** the images load without a runtime optimisation step

### Requirement: Custom domain served over HTTPS

The site SHALL be served over HTTPS at the canonical domain `iwans.space` (apex and `www`),
which SHALL resolve to the Railway deployment via the Cloudflare proxy fronting it, with a
valid HTTPS certificate. The legacy domain `iwanfrancis.com` SHALL permanently redirect (301)
to `iwans.space`.

#### Scenario: Canonical domain serves over HTTPS

- **WHEN** a visitor requests `https://iwans.space`
- **THEN** the site is served over HTTPS with a valid certificate, from the Railway origin

#### Scenario: www serves the same site

- **WHEN** a visitor requests `https://www.iwans.space`
- **THEN** it serves or redirects to the same site over HTTPS

#### Scenario: Legacy domain redirects to the canonical domain

- **WHEN** a visitor requests `https://iwanfrancis.com`
- **THEN** it is permanently redirected (301) to `iwans.space`

### Requirement: Automatic deploy on push to main

Railway SHALL be connected to the GitHub repository and SHALL deploy the production site
automatically when commits are pushed to the `main` branch, with no manual deploy step.

#### Scenario: Push to main triggers a deploy

- **WHEN** a commit is pushed to the `main` branch
- **THEN** Railway builds and deploys it to production automatically
