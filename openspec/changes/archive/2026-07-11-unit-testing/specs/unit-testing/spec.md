# unit-testing Specification (delta)

## ADDED Requirements

### Requirement: Vitest is the test runner, split into node and jsdom projects

The project SHALL use Vitest as its sole unit-test runner, configured by a single
`vitest.config.ts` at the repo root defining two projects: a **unit** project with the `node`
environment that includes `src/**/*.test.ts`, and a **components** project with the `jsdom`
environment that includes `src/**/*.test.tsx`. The configuration SHALL resolve the `@/*` path
alias and SHALL transform JSX/TSX. The components project SHALL load a shared setup file from
`src/testing/` that registers `@testing-library/jest-dom` matchers and any DOM shims (e.g.
`ResizeObserver`, pointer-capture methods) required by Radix-based components under jsdom.

#### Scenario: A pure-logic test runs in the node environment

- **WHEN** a `src/**/*.test.ts` file asserts on a Node-only global such as `process.version`
- **THEN** the test runs in the `node` environment and passes without jsdom globals present

#### Scenario: A component test runs in jsdom with RTL matchers

- **WHEN** a `src/**/*.test.tsx` file renders a component and asserts
  `expect(element).toBeInTheDocument()`
- **THEN** the test runs in the `jsdom` environment and the jest-dom matcher is available without
  per-test setup

#### Scenario: Path alias resolves in tests

- **WHEN** a test imports a module via `@/features/...` or `@/utils/...`
- **THEN** the import resolves without relative-path rewriting

### Requirement: Test scripts

`package.json` SHALL provide a `test` script that runs the full suite once and exits non-zero on
any failure (suitable for CI), and a `test:watch` script that runs Vitest in watch mode. Coverage
SHALL NOT be enforced: no coverage thresholds are configured and CI does not run coverage.

#### Scenario: Single-run suite for CI

- **WHEN** `yarn test` is run with a failing test present
- **THEN** the command exits non-zero after a single (non-watch) run

#### Scenario: Watch mode for development

- **WHEN** `yarn test:watch` is run
- **THEN** Vitest starts in watch mode and re-runs affected tests on file change

### Requirement: Tests are colocated; shared test code lives in src/testing/

Test files SHALL be colocated with their subject as `<file>.test.ts` or `<file>.test.tsx` in the
same directory. Shared, cross-cutting test code (the jsdom setup file, reusable fixture helpers)
SHALL live in `src/testing/` and SHALL follow the shared-layer import rule: it MUST NOT import
from `features/` or `app/`.

#### Scenario: A util's test sits next to it

- **WHEN** tests exist for `src/features/auth/utils/session.ts`
- **THEN** they are found at `src/features/auth/utils/session.test.ts`

#### Scenario: No separate test tree

- **WHEN** the repo is inspected
- **THEN** there is no top-level `tests/` or `__tests__/` directory for unit tests

### Requirement: Test conventions are documented in CLAUDE.md

CLAUDE.md SHALL contain a testing-conventions section covering: Arrange/Act/Assert structure with
`// Arrange` / `// Act` / `// Assert` comments for tests with distinct phases (single-expression
tests and `it.each` tables exempt); behaviour-named tests; flat `describe` usage (at most one per
unit under test); and the React Testing Library rules — query priority (`getByRole` with `name`
first, `data-testid` last resort), querying via `screen` only, `userEvent` over the banned
`fireEvent`, `findBy*` for asynchronous appearance, `queryBy*` only for asserting absence,
`waitFor` hygiene (single assertion, no side-effects, never empty), jest-dom matchers over
truthiness, and no manual `cleanup`, no `act()` wrapping, and no adding ARIA attributes solely to
satisfy a query. CLAUDE.md's commands table SHALL list the new test and typecheck scripts.

#### Scenario: Conventions are discoverable by future sessions

- **WHEN** CLAUDE.md is read
- **THEN** it documents the AAA structure, the RTL query-priority rule, and the `fireEvent` ban

#### Scenario: Commands table is current

- **WHEN** the CLAUDE.md commands table is read
- **THEN** it includes `yarn test`, `yarn test:watch`, and `yarn typecheck`

### Requirement: Security-boundary utilities are covered by tests

Unit tests SHALL cover: session token minting and verification (`session.ts`) including
round-trip success, tampered signature, wrong secret, expired token, and malformed token inputs;
password verification (`password.ts`) including missing secret and missing submission;
session-cookie attribute construction (`cookie.ts`); slug validation and the zip-slip guard
(`validate.ts`) including traversal (`..`), absolute paths, backslashes, and control characters;
zip extraction (`extract.ts`) including zip-slip rejection, wrapper-directory stripping, entry
and size caps, missing root `index.html`, and unreadable archives — using in-memory archives
built with `fflate` rather than binary fixture files; content-type mapping (`mime.ts`); and the
same-origin check (`same-origin.ts`). Env-dependent tests SHALL stub secrets via the test runner
(e.g. `vi.stubEnv`), never real values.

#### Scenario: Tampered session token is rejected

- **WHEN** a minted session token has its signature altered and is verified
- **THEN** verification returns false

#### Scenario: Zip-slip archive is rejected before any write decision

- **WHEN** an in-memory archive containing an entry named `../escape.html` is extracted
- **THEN** extraction throws an upload error and returns no entries

### Requirement: Thingies algorithmic invariants are covered by tests

Unit tests SHALL cover the thingies utilities via invariant-style assertions rather than
coordinate snapshots: `placeTiles` (returns `count` unique cells; the blob is edge-connected and
gap-free; `placeTiles(n)` is a strict prefix of `placeTiles(n + 1)`), the deterministic PRNG
(same seed/inputs give same outputs), `shuffle` (permutation of input, deterministic per seed),
`visible-band`, and `find-thingy`. Shared app utilities (`cn`, `array-filters`, `image`,
`device`) SHALL also be covered where they contain branching logic.

#### Scenario: Tile placement is prefix-stable

- **WHEN** `placeTiles(20)` and `placeTiles(21)` are computed
- **THEN** the first 20 cells of both results are identical

#### Scenario: Placement produces a connected, gap-free blob

- **WHEN** `placeTiles(50)` is computed
- **THEN** every cell is edge-connected to the origin cell and no empty cell is fully enclosed

### Requirement: API route handlers and middleware are covered by tests

Unit tests SHALL cover the exported handler functions of `api/auth`, `api/logout`,
`api/artifacts`, and `api/artifacts/[slug]`, invoked directly with constructed `Request` objects,
with the S3 module mocked at the module boundary and no network access. Covered behaviour SHALL
include: the status ladder (403 cross-origin, 401 unauthenticated, 400 invalid input, 409
duplicate slug, 201/200 success), and the ordering guarantee that `meta.json` is written last on
upload. Middleware tests SHALL cover pass-through with a valid session, 401 for API paths without
one, and redirect-to-`/login` (with `next` hint) for page paths without one.

#### Scenario: Duplicate slug upload is refused before any write

- **WHEN** `POST /api/artifacts` is invoked with a valid session and a slug that already exists
- **THEN** the response status is 409 and no object write occurs

#### Scenario: meta.json is the final write

- **WHEN** a valid upload is processed successfully
- **THEN** the recorded object writes end with the `<slug>/meta.json` key

### Requirement: Interactive components are covered by tests

Component tests using React Testing Library SHALL cover the login form (submission, error
display), the upload form and file dropzone (file selection, validation feedback), and the
copy-link button (clipboard interaction), querying by role/label per the documented conventions.

#### Scenario: Login form surfaces a failed attempt

- **WHEN** the login form is submitted and the auth endpoint responds with an error
- **THEN** an error message is shown to the user, located by an accessible query

### Requirement: Backfill is characterisation, not repair

Backfilled tests SHALL encode current behaviour. If writing a test uncovers a suspected bug, the
implementer SHALL surface it (in the change's task notes and to the user) rather than changing
production code within this change or writing a test that asserts the suspected-wrong behaviour
as correct.

#### Scenario: A suspected bug found mid-backfill

- **WHEN** a test author observes behaviour that looks incorrect
- **THEN** the observation is reported and no production code is modified in this change
