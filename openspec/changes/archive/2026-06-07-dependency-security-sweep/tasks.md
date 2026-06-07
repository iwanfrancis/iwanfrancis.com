## 1. Baseline

- [x] 1.1 Enable yarn (corepack) and run `yarn install` to get a working baseline from the current `yarn.lock`
- [x] 1.2 Record the current `yarn audit` output and resolved versions of `next`, `react`, `react-dom`, `eslint-config-next` as the "before" snapshot
  - Baseline audit (locked tree): **1 critical, 39 high, 25 moderate, 2 low**. Critical = "Next.js is vulnerable to RCE in React flight protocol" (CVE-2025-66478). Resolved: next 15.5.0, react/react-dom 19.0.0-rc.1, eslint-config-next 14.2.7.
- [x] 1.3 Confirm `yarn build` runs on the unchanged tree (so later failures are attributable to the upgrade, not pre-existing breakage)
  - Baseline build: clean (exit 0, 5 static pages, Next 15.5.0).

## 2. Patch the critical RCE (Next.js + React)

- [x] 2.1 Look up the official advisory matrix (Next.js CVE-2025-66478 post + React.dev / discussion #86939) for the patched stable `next` / `react` / `react-dom` trio
  - Advisory floors: next **15.5.7** (15.5.x line), react/react-dom **19.2.1** (19.x line). No explicit Node floor stated.
- [x] 2.2 Upgrade `next` to `>= 15.5.9` (latest patched 15.5.x — do NOT cross to 16.x)
  - `next` → `^15.5.19` (latest 15.5.x patch).
- [x] 2.3 Move `react` and `react-dom` from `19.0.0-rc.1` to the latest patched stable `19.x` from the matrix
  - `react` / `react-dom` → `^19.2.7` (latest stable 19.x ≥ 19.2.1).
- [x] 2.4 Update `@types/react` / `@types/react-dom` only if required for the stable React to typecheck (otherwise leave per scope)
  - Left at `^18`: build's type-check passes (see 5.2). No change needed.
- [x] 2.5 Verify no production dependency in `package.json` still carries a pre-release tag (`-rc`/`-alpha`/`-beta`/`-canary`)
  - All `dependencies` resolve to stable releases.

## 3. Clear the ESLint-toolchain and postcss advisories

- [x] 3.1 Bump `eslint-config-next` from `14.2.7` to its `15.x` counterpart matching the installed Next major
  - `eslint-config-next` → `^15.5.19` (matches `next`).
- [x] 3.2 Re-run `yarn audit`; confirm the `glob` (command injection) and `minimatch` (ReDoS) highs are cleared
  - Cleared by the fresh re-lock — 0 high remaining.
- [x] 3.3 If `glob`/`minimatch` highs persist via `@typescript-eslint`, add a scoped yarn `resolutions` entry and re-audit
  - Not needed: fresh resolution pulled patched transitives; no `glob`/`minimatch` highs remained.
- [x] 3.4 Confirm the moderate `postcss` XSS advisory (via `next`) is resolved by the Next bump; add a `resolutions` entry only if it remains
  - Persisted (`next` hard-pins `postcss@8.4.31`). Added `resolutions: { "postcss": "8.5.15" }`, deduping to the patched version. Advisory cleared.

## 4. Re-lock and certify the tree

- [x] 4.1 Regenerate `yarn.lock` and reinstall so locked versions match `package.json`
  - Deleted + regenerated `yarn.lock` (fresh in-range resolution). Backup at `/tmp/yarn.lock.baseline`.
- [x] 4.2 Run `yarn audit` against the locked tree; confirm **zero high/critical** findings
  - Final audit: **0 critical / 0 high / 0 moderate / 0 low** (down from 1/39/25/2).
- [x] 4.3 Cross-check the result against the official Next.js / React advisory pages (not just the audit tool)
  - next 15.5.19 ≥ 15.5.7, react/react-dom 19.2.7 ≥ 19.2.1 — both clear of CVE-2025-66478 / -55182 per the official advisories.
- [x] 4.4 Record any remaining moderate/low findings with a one-line justification
  - None remaining — tree is fully clean.

## 5. Verify the deploy gate

- [x] 5.1 Run `yarn lint`; confirm it passes with no errors (fix only lint breakage introduced by the upgrade)
  - ✔ No ESLint warnings or errors. (Informational only: `next lint` is deprecated in Next 16 — a future concern.)
- [x] 5.2 Run `yarn build`; confirm a clean production build
  - Clean build on Next 15.5.19 (5 static pages, type-check passes with `@types/react ^18`). Note: had to `rm -rf .next` once — building across the dep change left a stale mixed `.next` that broke `next start` with a missing `vendor-chunks/@radix-ui.js`; clean rebuild fixed it. Worth a `prebuild: rm -rf .next` or a clean CI build on the deploy target.
- [x] 5.3 Confirm the local/CI Node version meets any raised minimum from the patched Next/React; note it for the deploy target
  - Node v20.19.5 satisfies `next@15.5.19` engines (`^18.18.0 || ^19.8.0 || >= 20.0.0`). Ensure the deploy target pins Node ≥ 20.
- [x] 5.4 Run `yarn start` and smoke-test the landing page: hero, experience, and education sections render with no console or hydration errors
  - HTTP 200, **zero console messages** (clean React 19.2.7 hydration). Hero + Experience render correctly. Education is absent — pre-existing dead import (`page.tsx`), unchanged by this work and out of scope.

## 6. Commit

- [x] 6.1 Commit `package.json` + `yarn.lock` (Conventional Commits) referencing CVE-2025-66478 / CVE-2025-55182 in the body
  - Committed on branch `fix/dependency-security-sweep` (with the OpenSpec change docs).
- [x] 6.2 Note the deferred follow-ups (Next 16.x, non-security major bumps, Railway migration) for their own changes
  - Recorded in the commit body, proposal "out of scope", and design "Non-Goals". Also flagged: a `prebuild: rm -rf .next` (clean build) and pinning the deploy target to Node ≥ 20.
