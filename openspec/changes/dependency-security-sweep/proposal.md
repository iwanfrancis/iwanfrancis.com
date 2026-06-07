## Why

The site has not been touched in ~11 months and its dependencies have drifted. The
locked Next.js (`15.5.0`) and React (`19.0.0-rc.1`) are vulnerable to **CVE-2025-66478 /
CVE-2025-55182 ("React2Shell")** — a **CVSS 10.0 remote-code-execution** flaw in React
Server Components. React is additionally pinned to an **unstable release candidate**, and
the ESLint toolchain carries **6 further high-severity advisories** (glob command
injection, minimatch ReDoS). The site is not safe to deploy until these are fixed.

## What Changes

- **Patch the critical RCE**: upgrade `next` from `15.5.0` to **`15.5.9+`** (the 15.5.x
  patch line — staying on the major), fixing CVE-2025-66478 and the related DoS
  (CVE-2025-55184 / -67779) and source-exposure (CVE-2025-55183) advisories.
- **Move React off the release candidate**: `react` / `react-dom` `19.0.0-rc.1` →
  latest **patched stable `19.x`** per the official advisory matrix. **BREAKING**
  potential (RC → stable API/behaviour differences) — verify the app after.
- **Clear the high-severity ESLint-toolchain vulns**: align `eslint-config-next`
  (currently `14.2.7`, mismatched against Next 15) to the Next version, pulling in
  patched `@next/eslint-plugin-next`, `glob`, and `minimatch`.
- **Clear the moderate `postcss` XSS advisory** surfaced via `next` / build tooling.
- **Re-lock and verify**: refresh `yarn.lock`, then confirm `yarn build` and `yarn lint`
  pass clean as the deployment gate.

Out of scope (deliberately deferred to their own changes): the Next.js **16.x** major
upgrade, a full bump of non-security majors (ESLint 8→10, Radix, lucide, Tailwind
tooling, `@types/*`), and the **Vercel → Railway** migration.

## Capabilities

### New Capabilities

- `dependency-security`: Defines the project's dependency-health gate — no known
  high/critical advisories in installed dependencies, no pre-release (RC/alpha/beta)
  packages in production dependencies, and a clean `build` + `lint` as the pre-deploy
  verification requirement.

### Modified Capabilities

<!-- None — no existing specs in openspec/specs/. -->

## Impact

- **Dependencies**: `next`, `react`, `react-dom`, `eslint-config-next` (and its
  transitive `@next/eslint-plugin-next`, `glob`, `minimatch`), `postcss`. `yarn.lock`
  regenerated.
- **Code**: likely none required; risk is concentrated in the React RC→stable move and
  any Next 15.5.x behavioural change. RSC-heavy paths and the build output are the areas
  to watch.
- **Tooling / CI**: ESLint config alignment may shift lint output; commit/Husky hooks
  unaffected.
- **Deployment**: unblocks a safe deploy (current target Vercel; Railway migration
  remains a separate planned change).
