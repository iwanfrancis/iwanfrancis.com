# Proposal: unit-testing

## Why

The site has accumulated genuinely consequential logic — HMAC session tokens, a constant-time
password check, a zip-slip guard protecting the artifacts bucket, upload validation, and the
thingies placement algorithms — with no test suite at all. Everything currently works, which makes
now the cheapest moment to backfill characterisation tests: they encode known-good behaviour before
any refactor can silently break it, and future changes get a regression net plus CI feedback.

## What Changes

- Add **Vitest** as the test runner, with a two-project split: a `node` environment for `*.test.ts`
  (pure utils, route handlers, middleware) and a `jsdom` environment for `*.test.tsx` (component and
  hook tests via React Testing Library).
- Add testing devDependencies: `vitest`, `@vitejs/plugin-react`, `jsdom`, `@testing-library/react`
  (v16+, React 19 compatible), `@testing-library/dom` (required RTL peer),
  `@testing-library/user-event`, `@testing-library/jest-dom`, `aws-sdk-client-mock`. The `@/*`
  alias resolves via Vite's native `resolve.tsconfigPaths` — no plugin needed.
- Add `yarn test` (single run) and `yarn test:watch` scripts, plus a `yarn typecheck`
  (`tsc --noEmit`) script. No coverage thresholds.
- Establish standardised test conventions — Arrange/Act/Assert structure with comments,
  behaviour-named tests, flat `describe` usage, and the Kent C Dodds React Testing Library rules
  (query priority, `screen`, `userEvent`, `findBy*` for async, `queryBy*` for absence only,
  jest-dom matchers) — distilled into CLAUDE.md so they steer all future test writing. No ESLint is
  added; the RTL rules are convention-enforced, not machine-enforced.
- Shared test setup lives in `src/testing/` (jsdom setup file, Radix DOM shims); tests are
  colocated as `<file>.test.ts(x)` next to their source.
- Enable Biome's `test` domain so generic test hygiene (no focused/duplicate tests) is linted.
- Add a **GitHub Actions** CI workflow running lint, typecheck, and the test suite on pushes and
  pull requests. It is a tripwire, not a deploy gate — Railway deploys independently.
- **Backfill tests** in priority order: security-boundary utils (auth session/password/cookie,
  upload validation/extraction/mime, same-origin) → thingies algorithmic invariants (placement,
  PRNG, shuffle, visible band) → API route handlers and middleware (status ladder, write ordering,
  with S3 mocked) → interactive components (login form, upload form, dropzone, copy-link).

Out of scope: e2e testing (Playwright), async RSC page rendering (not supported by RTL; Next's own
guidance is e2e), presentational landing sections, thingy visuals, Radix wrapper components, and
coverage thresholds.

## Capabilities

### New Capabilities

- `unit-testing`: the Vitest runner setup (two environments, colocated tests, shared setup in
  `src/testing/`), the documented test conventions (AAA + Kent C Dodds RTL rules in CLAUDE.md), and
  the required backfill coverage across the four priority tiers.
- `continuous-integration`: the GitHub Actions workflow — what it runs (lint, typecheck, tests),
  when it triggers, and its non-gating relationship to Railway deploys.

### Modified Capabilities

- `code-quality-tooling`: Biome's `test` domain is enabled, and a `typecheck` script
  (`tsc --noEmit`) joins the package scripts so type errors are catchable outside `next build`.

## Impact

- **Dependencies**: ~8 new devDependencies (Vitest, RTL family, jsdom, aws-sdk-client-mock).
- **New files**: `vitest.config.ts`, `src/testing/*`, `.github/workflows/ci.yml`, and colocated
  `*.test.ts(x)` files across `src/features/{auth,artifact-management,thingies}/`, `src/utils/`,
  `src/app/api/`, and `src/middleware.ts`'s neighbourhood.
- **Modified files**: `package.json` (scripts + devDeps), `biome.json` (test domain), `CLAUDE.md`
  (commands table + testing conventions section).
- **No production code changes** — the backfill characterises current behaviour; any bug found
  during backfill is surfaced and decided on separately, not silently fixed.
- **Runtime/product**: none. No user-facing behaviour changes.
