## Context

The site has sat untouched for ~11 months. `yarn.lock` pins `next@15.5.0` and
`react@19.0.0-rc.1` / `react-dom@19.0.0-rc.1`. Both are affected by **CVE-2025-66478
(Next.js) / CVE-2025-55182 (React)** — "React2Shell", a **CVSS 10.0 RCE** in React
Server Components — plus the related **CVE-2025-55184 / -67779** (DoS) and
**CVE-2025-55183** (source exposure). React being on a _release candidate_ is itself a
production risk independent of the CVE.

A fresh-resolution `npm audit` (run against `package.json` ranges in a throwaway dir,
since `node_modules` is not installed) also reports **6 high** advisories concentrated
in the lint toolchain — `glob` (command injection) and `minimatch` (ReDoS) pulled in via
`@typescript-eslint` and `@next/eslint-plugin-next` — and **2 moderate** (`postcss` XSS
via `next`). Notably `eslint-config-next` is pinned at `14.2.7` while the framework is
`15.x`, a mismatch worth correcting as part of the security fix.

Constraints: yarn classic (v1), no test suite, accessibility enforced via
`jsx-a11y`. The user has chosen the **15.5.x patch line** (not the 16.x major) and a
**security + compatibility-only** scope. Current deploy target is Vercel; the Railway
migration is a separate planned change.

## Goals / Non-Goals

**Goals:**

- Eliminate the critical RCE by upgrading `next` to `>= 15.5.9` (latest patched 15.5.x).
- Move `react` / `react-dom` off the RC onto the latest **patched stable 19.x**.
- Clear the 6 high ESLint-toolchain advisories and the moderate `postcss` advisory.
- Align `eslint-config-next` with the installed Next major.
- Re-lock the tree and verify `yarn build` + `yarn lint` pass as the deploy gate.

**Non-Goals:**

- Next.js **16.x** major upgrade (deferred to its own change).
- Bumping non-security majors: ESLint 8→10, Radix, lucide, Tailwind tooling, `@types/*`.
- The **Vercel → Railway** migration and `output: 'standalone'` work.
- The known cleanup backlog in CLAUDE.md (dead `Education` import, `components.json`
  alias mismatch, `seperator` typo, README) — touch only if a fix is required to make
  build/lint pass.

## Decisions

**1. Stay on the 15.5.x patch line; pin to `>= 15.5.9`.**
Rationale: it fully resolves CVE-2025-66478 with the smallest API surface and gets the
site deployable fastest. Alternative — jump to 16.x — was rejected for now: it adds
breaking-change risk and verification load with no extra security benefit (16.x is
patched too, but so is 15.5.9). Recorded as a future change.

**2. React RC → latest patched stable 19.x, versions confirmed from the official
advisory matrix at apply time.**
Rationale: the exact stable patch (and its required `next`/Node floor) is published in
the Next.js advisory and React.dev post; we resolve the precise trio (next / react /
react-dom) against that matrix rather than hard-coding a number now. Alternative —
upgrade React independently of the matrix — risks a mismatched trio.

**3. Fix the ESLint-toolchain highs by aligning `eslint-config-next` to the Next major,
not by adding manual `resolutions`.**
Rationale: bumping `eslint-config-next` from `14.2.7` to its `15.x` counterpart pulls
patched `@next/eslint-plugin-next` (and its `glob`) transitively, the clean fix.
`glob`/`minimatch` reached via `@typescript-eslint` may still need a targeted bump or a
yarn `resolutions` entry if the config bump doesn't lift them — decide based on a
post-bump audit. Alternative — yarn `resolutions` for everything — works but is opaque
and harder to maintain; reserve it for transitive deps with no direct upgrade path.

**4. Verification is the deploy gate: `yarn build` + `yarn lint` + a manual smoke test.**
Rationale: there is no test suite, so a clean production build, clean lint, and a manual
render check of the three landing sections (hero/experience/education) are the
acceptance signal. The RC→stable React move is the highest-risk step and most needs the
smoke test.

**5. Re-verify advisories against the _installed_ tree, not just `package.json` ranges.**
Rationale: the audit so far was fresh-resolved from ranges; the committed `yarn.lock`
must be regenerated and re-audited so the locked versions (what actually deploys) are
what we certify clean.

## Risks / Trade-offs

- **React RC → stable introduces behavioural/API differences** → Mitigation: do the
  React + Next bump together, then run the build and a manual smoke test of all three
  landing sections; watch for hydration/console errors. Revert is a single `yarn.lock` +
  `package.json` git revert if it regresses.
- **`glob`/`minimatch` highs may persist after the config bump** (reached via
  `@typescript-eslint`, a transitive of `eslint-config-next`) → Mitigation: re-audit
  after the bump; if still flagged, add a scoped yarn `resolutions` entry and re-verify.
- **No test suite means regressions can hide** → Mitigation: manual smoke test is part of
  the acceptance criteria; keep the diff minimal (security + compatibility only) so the
  blast radius is small.
- **Node floor**: a patched Next/React may raise the minimum Node version → Mitigation:
  confirm the local/CI Node version meets the new floor during apply; note it for the
  deploy target.
- **`yarn audit` (v1) registry quirks** → Mitigation: cross-check findings against the
  official Next.js / React advisory pages rather than relying on the audit tool alone.

## Migration Plan

1. Ensure `yarn` is available (corepack) and install the current tree to get a working
   baseline.
2. Upgrade `next` → `>= 15.5.9`, and `react` / `react-dom` → patched stable 19.x per the
   advisory matrix; bump `eslint-config-next` to its 15.x counterpart.
3. Regenerate `yarn.lock`; run `yarn audit` and re-check the official advisories.
4. If any high/critical remains transitively, add a scoped `resolutions` entry and
   re-audit.
5. Run `yarn build` and `yarn lint`; fix only what blocks them.
6. Manual smoke test: `yarn start`, load the landing page, confirm hero/experience/
   education render with no console or hydration errors.
7. Commit (Conventional Commits) with the CVE references in the body.
   **Rollback**: revert the `package.json` + `yarn.lock` commit; the previous lock is
   restored from git.

## Open Questions

- Exact patched stable `react` / `react-dom` version from the advisory matrix — resolved
  at apply time against the published trio.
- Whether the `glob`/`minimatch` highs fully clear via the `eslint-config-next` bump or
  need a `resolutions` entry — determined by the post-bump audit.
- Whether the patched versions raise the minimum Node version for the deploy target.
