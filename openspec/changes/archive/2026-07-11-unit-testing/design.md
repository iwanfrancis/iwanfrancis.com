# Design: unit-testing

## Context

The repo has no test infrastructure: no runner, no CI, and nothing running `tsc` outside
`next build`. Meanwhile the codebase now contains security-sensitive logic (HMAC session tokens in
`src/features/auth/utils/session.ts`, the constant-time password check in `password.ts`, the
zip-slip guard in `src/features/artifact-management/utils/validate.ts` and archive validation in
`extract.ts`) and non-trivial algorithms (`src/features/thingies/utils/place-tiles.ts` and friends)
— almost all of it already extracted into pure functions with injectable inputs (`session.ts` takes
a `now` parameter; nothing reads globals beyond `process.env`). That makes the backfill unusually
cheap: most tier-1/2 tests need no mocking at all.

Tooling constraints that shape the design: Biome is deliberately the only linter (no ESLint),
package manager is yarn classic, Node is pinned to 20.x, and the site deploys to Railway on every
push to main with no branch protection.

## Goals / Non-Goals

**Goals:**

- A Vitest setup that covers both plain-logic tests and React component tests with the right
  environment for each, runnable locally (`yarn test`, `yarn test:watch`) and in CI.
- A standardised, documented test style — Arrange/Act/Assert structure and the Kent C Dodds React
  Testing Library rules — that future sessions follow without machine enforcement.
- CI (GitHub Actions) running lint, typecheck, and tests on push and PR.
- Backfilled characterisation tests over the four priority tiers while behaviour is known-good.

**Non-Goals:**

- No e2e testing (Playwright is a separate future conversation).
- No rendering of async React Server Components (RTL cannot; Next's guidance is e2e for those).
- No tests for presentational landing sections, thingy visuals, or Radix wrapper components.
- No coverage thresholds and no coverage gating in CI.
- No ESLint, even scoped to test files.
- No production code changes: bugs found during backfill are reported, not silently fixed.

## Decisions

### D1: Vitest, not Jest

Vitest is ESM-native, fast, needs no Babel pipeline for TS/JSX (via `@vitejs/plugin-react`), picks
up the `@/*` alias through Vite's native `resolve.tsconfigPaths` option, and is one of the two
runners Next.js officially documents. Jest would need `next/jest` transform config and fights ESM. There is no existing Jest
investment to preserve.

### D2: Two Vitest projects, split by file extension

`vitest.config.ts` defines two projects:

- **unit** — `environment: 'node'`, includes `src/**/*.test.ts`. Pure utils, route handlers, and
  middleware run here. Node 20 provides `fetch`/`Request`/`Response`/`FormData`/`File` and Web
  Crypto as globals, so route handlers are tested by calling the exported `GET`/`POST` functions
  with a real `Request` — no HTTP server.
- **components** — `environment: 'jsdom'`, includes `src/**/*.test.tsx`, with
  `setupFiles: ['src/testing/setup.ts']` (jest-dom matchers + Radix DOM shims).

The `.ts`/`.tsx` extension doubles as the routing rule: a test that renders JSX is necessarily
`.tsx` and lands in jsdom automatically. Alternatives considered: per-file
`// @vitest-environment` docblocks (repetitive, easy to forget) and a single jsdom environment for
everything (slower, and jsdom globals leaking into pure-logic tests can mask node-runtime bugs).

### D3: jsdom, not happy-dom

happy-dom is faster but Radix leans on less-common DOM APIs (pointer capture, ResizeObserver),
and jsdom is the well-trodden path Next's docs use. Radix still needs a few shims under jsdom —
`ResizeObserver`, `Element.prototype.{hasPointerCapture,setPointerCapture,releasePointerCapture,scrollIntoView}`
— provided once in `src/testing/setup.ts`.

### D4: Colocated tests, shared helpers in `src/testing/`

Tests live next to their subject as `<file>.test.ts(x)` (bulletproof-react's pattern; no
`__tests__` directories, no separate test tree). Cross-cutting helpers (the jsdom setup file, any
shared fixture builders) live in `src/testing/` — the location bulletproof-react reserves and this
repo's CLAUDE.md already earmarks. `src/testing/` is a shared layer: it must not import from
`features/` or `app/`.

### D5: Conventions are documented law, not machine law

Kent C Dodds's first recommendation is `eslint-plugin-testing-library`; this repo deliberately has
no ESLint and Biome has no equivalent. Decision: accept the gap rather than add a second linter.
Enforcement is (a) a rule-form distillation in CLAUDE.md, which steers all future test writing
here, and (b) Biome's `test` domain for generic hygiene (focused tests, duplicate hooks). The
conventions:

**All tests**

- `// Arrange` / `// Act` / `// Assert` comments when a test has distinct phases. Carve-out:
  single-expression tests and `it.each` tables skip the comments — ceremony without information.
- Behaviour-named tests ("rejects a token signed with a different secret"), never "test X"/"works".
- Flat structure: at most one `describe` per unit under test; prefer inline arrange or a small
  named helper over `beforeEach` chains.
- Prefer `it.each` for input/output tables (e.g. slug validation).

**React tests (the Kent C Dodds RTL rules)**

- Query priority: `getByRole(…, { name })` → label → text; `data-testid` is a last resort.
- Always query via `screen`; never destructure queries from `render`.
- `userEvent.setup()` per test; `fireEvent` is banned, with a single carve-out for events
  user-event cannot produce (e.g. drag-and-drop `drop`), used with a comment.
- `findBy*` for elements that appear asynchronously; never `waitFor(() => getBy…)`.
- `queryBy*` only for asserting absence (`expect(…).not.toBeInTheDocument()`).
- `waitFor`: one assertion per callback, no side-effects inside, never empty.
- Assert with jest-dom matchers (`toBeInTheDocument`, `toBeDisabled`, …), not truthiness.
- No manual `cleanup`, no `act()` wrapping, and no adding `role=`/ARIA attributes to make a query
  pass — fix the component's markup instead.

### D6: Mocking strategy — mock at the narrowest sensible boundary

- **Secrets/env**: `vi.stubEnv('SESSION_SECRET', …)` etc. per test; no real secrets anywhere,
  which also keeps CI secret-free.
- **Zip fixtures**: built in-memory with `fflate.zipSync` inside the test (including malicious
  entries like `../escape.html`) — no binary fixture files in the repo.
- **Route handler tests**: mock the feature's `s3.ts` module with `vi.mock` (the handlers' natural
  seam) and `next/headers` for cookie reads. Assert the status ladder (403 cross-origin → 401
  unauthenticated → 400 invalid → 409 duplicate → 201) and the meta-written-last ordering via the
  mock's call sequence.
- **`s3.ts`'s own tests**: `aws-sdk-client-mock` against the real AWS SDK client, so the command
  shapes (prefixes, content types) are covered without a network.
- **Clock**: pass the existing `now` parameters; `vi.useFakeTimers` only where a hook needs it.

### D7: CI — a single GitHub Actions workflow, tripwire not gate

`.github/workflows/ci.yml` on `push` to main and `pull_request`: checkout → setup-node 20 with
yarn cache → `yarn install --frozen-lockfile` → `yarn lint` → `yarn typecheck` → `yarn test`.
`typecheck` is a new script (`tsc --noEmit`) — currently nothing runs the compiler except
`next build`. Since pushes go straight to main and Railway deploys on push, the workflow detects
breakage after the fact rather than preventing it; that is accepted for a solo repo. No coverage
step.

### D8: Backfill order and status

Cheapest-and-scariest first, as characterisation tests of current behaviour:

1. **Security boundaries** — `auth/utils/{session,password,cookie}`,
   `artifact-management/utils/{validate,extract,mime}`, `utils/same-origin`.
2. **Algorithmic invariants** — `thingies/utils/{place-tiles,prng,shuffle,visible-band,find-thingy}`,
   plus `utils/{array-filters,image,device}` and `cn`. Invariant-style assertions (e.g.
   `placeTiles(n)` is a strict prefix of `placeTiles(n + 1)`; the blob is 4-connected and
   gap-free) rather than snapshotting coordinates.
3. **Route handlers + middleware** — `api/auth`, `api/logout`, `api/artifacts`,
   `api/artifacts/[slug]`, `src/middleware.ts`.
4. **Interactive components/hooks** — login form, upload form, dropzone, copy-link button; hooks
   where cheap. This tier is the lowest priority and can be trimmed if it drags.

## Risks / Trade-offs

- **RTL rules are unenforced by tooling** → mitigated by the CLAUDE.md distillation and review;
  revisit Biome GritQL plugins later if drift appears.
- **Radix under jsdom is fiddly** (missing DOM APIs surface as cryptic errors) → all shims live in
  one `src/testing/setup.ts`; extend there, never per-test.
- **`next/server`/`next/headers` internals could shift under a Next upgrade** and break handler
  tests that mock them → the mocks are narrow (cookie read only); handler logic is mostly plain
  `Request`/`Response`, which is upgrade-stable.
- **React 19 needs `@testing-library/react` v16+** → pinned in the dependency list; older
  examples/snippets targeting v12-era APIs (`cleanup`, `wrapper`) are banned by convention anyway.
- **Characterisation tests can enshrine bugs** → any suspected bug found while writing a test is
  surfaced in the task notes / to the user rather than encoded as "correct" or silently fixed.
- **CI is not a gate** — a red run happens after Railway has already deployed → accepted; the
  remedy on red is fix-forward, which matches how this repo already operates.
- Vitest does not touch `.next`, so tests are safe to run while `yarn dev` is up (unlike
  `yarn build`).
