## Why

The repo runs two separate tools for code style — Prettier (formatting) and ESLint
(linting) — wired together with `eslint-config-prettier`, `lint-staged`, and editor
settings. This is slow, duplicative, and currently inconsistent: `.vscode/settings.json`
runs `source.fixAll.eslint` on save but never formats with Prettier, so files only get
Prettier formatting at commit time. That mismatch is the "something's up with formatting"
symptom. Biome replaces both tools with one fast binary and one config file, and removes
the format-on-save gap.

## What Changes

- Add Biome (`@biomejs/biome`) with a single `biome.json` configured to match today's rules:
  - Formatter: no semicolons, single quotes, 2-space indent, ES5 trailing commas.
  - Linter: keep `jsx-a11y/recommended` coverage (Biome `a11y` group) and Next.js-aware
    rules (Biome `next`/`react` domains), as close to `next/core-web-vitals` as Biome allows.
- **BREAKING (dev workflow)**: Remove ESLint and Prettier and their config/plugins —
  `eslint`, `eslint-config-next`, `eslint-config-prettier`, `eslint-plugin-jsx-a11y`,
  `prettier`; delete `.eslintrc`, `.prettierrc`, `.prettierignore`.
- Replace `next lint` with Biome in the `lint` script; add a `format` script.
- Update `lint-staged` to run `biome check --write` instead of Prettier + ESLint.
- Update `.vscode/settings.json` to use Biome as the default formatter, with format-on-save
  and Biome quick-fixes on save.
- Document any `next/core-web-vitals` rules Biome cannot replicate (gap analysis in design).

Non-goals: changing actual code style/output beyond unavoidable Biome-vs-Prettier
differences; touching commitlint/Husky's commit-msg flow; the Railway migration.

## Capabilities

### New Capabilities
- `code-quality-tooling`: The linting and formatting toolchain — which tool runs, what
  style and lint rules it enforces, and how it integrates with the editor, pre-commit hook,
  and the `lint`/`format` scripts.

### Modified Capabilities
<!-- None — no existing spec covers the lint/format toolchain. -->

## Impact

- **Dependencies**: removes 5 devDependencies, adds 1 (`@biomejs/biome`).
- **Config files**: deletes `.eslintrc`, `.prettierrc`, `.prettierignore`; adds `biome.json`.
- **Scripts**: `package.json` `lint` script and `lint-staged` block change; new `format` script.
- **Editor**: `.vscode/settings.json` formatter + on-save behaviour change (requires the
  Biome VS Code extension).
- **Behaviour**: a one-off reformat of the codebase may produce a diff where Biome and
  Prettier disagree; no runtime/app behaviour changes.
