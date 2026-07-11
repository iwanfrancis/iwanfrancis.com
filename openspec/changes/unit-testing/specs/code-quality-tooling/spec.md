# code-quality-tooling Specification (delta)

## ADDED Requirements

### Requirement: Biome test domain is enabled

Biome's `test` domain SHALL be enabled in `biome.json` so generic test hygiene (e.g. focused
tests, duplicate hooks) is linted. No second linter SHALL be added for test files: React Testing
Library-specific rules remain convention-enforced (documented in CLAUDE.md), not machine-enforced,
preserving the single-tool rule.

#### Scenario: A focused test is reported

- **WHEN** Biome lints a test file containing `it.only(...)`
- **THEN** Biome reports a lint error for it

#### Scenario: Still no ESLint

- **WHEN** the project's `devDependencies` are inspected after the testing setup lands
- **THEN** no ESLint packages (including `eslint-plugin-testing-library`) are present

### Requirement: Typecheck script

`package.json` SHALL provide a `typecheck` script running `tsc --noEmit`, so type errors are
catchable outside `next build`. It SHALL exit non-zero on any type error so it can gate CI.

#### Scenario: Type error fails the typecheck script

- **WHEN** `yarn typecheck` is run on code containing a TypeScript type error
- **THEN** the command exits non-zero and reports the error
