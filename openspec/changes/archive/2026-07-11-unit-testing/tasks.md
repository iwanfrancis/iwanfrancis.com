# Tasks: unit-testing

## 1. Runner setup

- [x] 1.1 Add devDependencies: `vitest`, `@vitejs/plugin-react`, `vite-tsconfig-paths`, `jsdom`,
      `@testing-library/react`, `@testing-library/user-event`, `@testing-library/jest-dom`,
      `aws-sdk-client-mock` (plus `@testing-library/dom`, a required RTL v16 peer)
- [x] 1.2 Create `vitest.config.ts` with the two projects: **unit** (`node` env,
      `src/**/*.test.ts`) and **components** (`jsdom` env, `src/**/*.test.tsx`, setup file), with
      react plugin + tsconfig paths
- [x] 1.3 Create `src/testing/setup.ts`: jest-dom matchers plus Radix jsdom shims
      (`ResizeObserver`, pointer-capture methods, `scrollIntoView`)
- [x] 1.4 Add `test`, `test:watch`, and `typecheck` scripts to `package.json`
- [x] 1.5 Smoke-test both projects: kept as seed examples `src/utils/cn.test.ts` (node) and
      `src/components/inputs/button/button.test.tsx` (jsdom); `yarn test`, `yarn typecheck`, and
      `yarn lint` all pass

## 2. Conventions & tooling

- [x] 2.1 Enable Biome's `test` domain in `biome.json`; confirm `it.only` is flagged
- [x] 2.2 Add the testing-conventions section to CLAUDE.md (AAA with comments + exemptions,
      behaviour-named tests, flat describes, and the RTL rules: query priority, `screen`,
      `userEvent` over banned `fireEvent`, `findBy*`/`queryBy*` usage, `waitFor` hygiene, jest-dom
      matchers, no `cleanup`/`act()`/ARIA-for-queries)
- [x] 2.3 Update the CLAUDE.md commands table with `yarn test`, `yarn test:watch`, `yarn typecheck`
      and remove the "There is no test suite yet" line

## 3. CI

- [x] 3.1 Create `.github/workflows/ci.yml`: push to `main` + `pull_request`; Node 20 with yarn
      cache; `yarn install --frozen-lockfile`; `yarn lint`; `yarn typecheck`; `yarn test`
- [x] 3.2 Push and confirm the workflow runs green on GitHub (run #1 on `3f74edd`: success)

## 4. Backfill — security boundaries

- [x] 4.1 `session.test.ts`: round-trip verify, tampered signature, wrong secret, expired token,
      malformed tokens (no dot, non-numeric expiry, bad base64url), missing `SESSION_SECRET`
- [x] 4.2 `password.test.ts`: correct/incorrect password, missing secret, missing submission
- [x] 4.3 `cookie.test.ts`: cookie attribute construction
- [x] 4.4 `validate.test.ts`: `isValidSlug` table (`it.each`); `safeEntryPath` traversal, absolute,
      backslash, control chars, `.`/empty segment collapsing, all-empty result
- [x] 4.5 `extract.test.ts` with in-memory `fflate.zipSync` fixtures: happy path, zip-slip entry,
      wrapper-dir stripping, entry-count cap, per-file and total size caps, missing root
      `index.html`, unreadable archive, directory-entry filtering
- [x] 4.6 `mime.test.ts` and `same-origin.test.ts`

## 5. Backfill — algorithmic invariants

- [x] 5.1 `place-tiles.test.ts`: count/uniqueness, 4-connectivity, no enclosed gaps, prefix
      stability, empty/zero input
- [x] 5.2 `prng.test.ts` and `shuffle.test.ts`: determinism, permutation property
- [x] 5.3 `visible-band.test.ts` and `find-thingy.test.ts`
- [x] 5.4 Shared utils: `cn`, `array-filters`, `image` (`device.ts` skipped — a one-line
      `matchMedia` wrapper with no branching logic)

## 6. Backfill — route handlers & middleware

- [x] 6.1 Test scaffolding: `vi.mock` for the s3 module and `next/headers`; helper to mint a valid
      session cookie via real `createSessionToken` (kept as local per-file helpers — a shared
      helper in `src/testing/` would break the shared-layer import rule by importing from
      `features/`)
- [x] 6.2 `api/auth` + `api/logout` handler tests: success sets/clears cookie, bad password 401,
      cross-origin 403
- [x] 6.3 `api/artifacts` handler tests: GET list (200/401/500), POST ladder (403 cross-origin,
      401 no session, 400 no file / bad slug, 409 duplicate, 201 success) and meta-written-last
      ordering
- [x] 6.4 `api/artifacts/[slug]` handler tests (update/delete surface and its status ladder)
- [x] 6.5 `middleware.test.ts`: valid session passes, API path 401, page path redirect with `next`
      hint
- [x] 6.6 `s3.test.ts` with `aws-sdk-client-mock`: key prefixes, content types, list/exists/delete
      command shapes (needed `@smithy/util-stream` as an explicit devDep for `sdkStreamMixin`
      GetObject bodies, per aws-sdk-client-mock's docs)

## 7. Backfill — interactive components

- [x] 7.1 `login-form.test.tsx`: submit success and error display, queried by role/label
- [x] 7.2 `upload-form.test.tsx` + `file-dropzone.test.tsx`: file selection and validation feedback
- [x] 7.3 `copy-link-button.test.tsx`: clipboard interaction and feedback state
- [x] 7.4 Sweep: full `yarn lint`, `yarn typecheck`, `yarn test` green (26 files, 196 tests);
      observations noted below (no production fixes in this change)

## Observations surfaced during backfill (no code changed)

- `verifySession` throws (rather than returning false) when `SESSION_SECRET` is unset and the
  token is well-formed — a misconfigured deploy would 500 gated requests instead of redirecting.
  Fails closed, so defensible; flagged for awareness.
- `src/utils/image.ts` calls `.filter(notEmpty)` on `Object.entries(...)` — entries are arrays and
  always truthy, so the filter is a no-op (it was presumably meant to drop undefined values before
  the entries conversion). Harmless as-is.
- `UploadForm`'s "Choose a .html file or a .zip bundle first." guard appears unreachable through
  the UI: the submit button is disabled without a file, and implicit Enter-key submission is
  blocked when the only submit button is disabled. Left untested.
- The AWS SDK v3 warns it will require Node ≥ 22 for releases published after early January 2027;
  the repo pins Node 20.x. Worth folding into a future Node upgrade.
