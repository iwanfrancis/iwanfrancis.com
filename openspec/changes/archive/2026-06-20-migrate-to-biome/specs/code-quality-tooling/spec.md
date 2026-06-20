## ADDED Requirements

### Requirement: Single tool for formatting and linting

The project SHALL use Biome (`@biomejs/biome`) as the single tool for both code
formatting and linting, configured by one `biome.json` at the repo root. ESLint,
Prettier, and their config files and plugins SHALL NOT be present.

#### Scenario: Biome is the only style tool installed

- **WHEN** the project's `devDependencies` are inspected
- **THEN** `@biomejs/biome` is present
- **AND** `eslint`, `eslint-config-next`, `eslint-config-prettier`, `eslint-plugin-jsx-a11y`, and `prettier` are absent

#### Scenario: Legacy config files are removed

- **WHEN** the repo root is inspected
- **THEN** `biome.json` exists
- **AND** `.eslintrc`, `.prettierrc`, and `.prettierignore` do not exist

### Requirement: Formatting rules preserved from Prettier

Biome's formatter SHALL produce output matching the project's existing Prettier
configuration: no semicolons, single quotes, 2-space indentation, and ES5 trailing
commas.

#### Scenario: Formatter settings match prior Prettier config

- **WHEN** `biome.json` is inspected
- **THEN** semicolons are configured as `asNeeded` (no semicolons)
- **AND** the quote style is single quotes
- **AND** the indent style is space with width 2
- **AND** trailing commas are configured as `es5`

### Requirement: Linting coverage preserved where Biome allows

Biome's linter SHALL retain accessibility checks equivalent to
`jsx-a11y/recommended` (Biome's `a11y` rule group) and SHALL enable Biome's
Next.js and React rule coverage. Any `next/core-web-vitals` rule that Biome cannot
replicate SHALL be documented in the change's design notes.

#### Scenario: Accessibility and framework rules are active

- **WHEN** `biome.json` is inspected
- **THEN** the `a11y` rule group is enabled
- **AND** Next.js / React rule coverage is enabled (recommended rules or the relevant domains)

#### Scenario: A11y violation is reported

- **WHEN** Biome lints a component containing an accessibility violation (e.g. an `<img>` without `alt`)
- **THEN** Biome reports a linting error for it

### Requirement: Lint and format scripts use Biome

The `package.json` `lint` script SHALL run Biome instead of `next lint`, and a
`format` script SHALL run Biome's formatter. Both SHALL exit non-zero on
unresolved issues so they can gate CI.

#### Scenario: Lint script runs Biome

- **WHEN** `yarn lint` is run
- **THEN** Biome checks the codebase
- **AND** the command exits non-zero if lint errors remain

#### Scenario: Format script runs Biome

- **WHEN** `yarn format` is run
- **THEN** Biome formats the codebase in place

### Requirement: Pre-commit hook runs Biome

The `lint-staged` configuration SHALL run Biome (`biome check --write`) on staged
files instead of Prettier and ESLint. The Husky `commit-msg` commitlint hook SHALL
remain unchanged.

#### Scenario: Staged files are checked and fixed on commit

- **WHEN** a commit is made with staged source files
- **THEN** Biome formats and lints (with auto-fix) the staged files via `lint-staged`
- **AND** the commit is blocked if unfixable lint errors remain

#### Scenario: Commit message linting is unaffected

- **WHEN** a commit message is entered
- **THEN** commitlint validates it via the existing `commit-msg` hook

### Requirement: Editor formats on save with Biome

`.vscode/settings.json` SHALL set Biome as the default formatter with format-on-save
enabled and Biome quick-fixes applied on save, replacing the prior ESLint-only
on-save behaviour. The Tailwind `classFunctions` setting (`cva`, `cn`) SHALL be retained.

#### Scenario: Saving a file formats it via Biome

- **WHEN** a developer saves a file with the Biome VS Code extension installed
- **THEN** the file is formatted by Biome
- **AND** Biome's safe quick-fixes are applied

#### Scenario: Tailwind class function hinting retained

- **WHEN** `.vscode/settings.json` is inspected
- **THEN** `tailwindCSS.classFunctions` still lists `cva` and `cn`
