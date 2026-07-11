# continuous-integration Specification

## Purpose

Defines the GitHub Actions CI capability: a single workflow that runs lint, typecheck, and the
test suite on pushes to `main` and on pull requests, requiring no repository secrets. On this
solo repo CI is a post-hoc tripwire, not a deploy gate — Railway deploys trigger independently on
push, and the response to a red run is fix-forward.

## Requirements

### Requirement: CI workflow runs lint, typecheck, and tests

The project SHALL have a GitHub Actions workflow (`.github/workflows/ci.yml`) that runs on pushes
to `main` and on pull requests. The workflow SHALL: check out the repo, set up Node 20 with yarn
caching, install dependencies with `yarn install --frozen-lockfile`, then run `yarn lint`,
`yarn typecheck`, and `yarn test`. The workflow run SHALL fail if any step exits non-zero. The
workflow SHALL NOT require repository secrets: tests stub all secrets and make no network calls.

#### Scenario: A failing test turns CI red

- **WHEN** a commit containing a failing test is pushed to `main`
- **THEN** the workflow run fails at the test step

#### Scenario: Lint and type errors are caught

- **WHEN** a commit introduces a Biome lint error or a TypeScript type error
- **THEN** the workflow run fails at the corresponding step before tests run

#### Scenario: No secrets needed

- **WHEN** the workflow runs on a fresh clone with no repository secrets configured
- **THEN** all steps complete without requiring credentials

### Requirement: CI is a tripwire, not a deploy gate

The workflow SHALL NOT block or gate Railway deployments, which trigger independently on push.
Its role is post-hoc detection on a solo repo; the response to a red run is fix-forward.

#### Scenario: Deploys proceed independently of CI

- **WHEN** a push to `main` triggers both the CI workflow and a Railway deploy
- **THEN** the deploy proceeds regardless of the workflow outcome
