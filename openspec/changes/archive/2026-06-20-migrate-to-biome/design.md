## Context

The repo uses Prettier (formatting) + ESLint (`next/core-web-vitals` +
`jsx-a11y/recommended`, with `eslint-config-prettier` to disable stylistic
conflicts), glued via `lint-staged` and Husky. The editor config
(`.vscode/settings.json`) only runs `source.fixAll.eslint` on save and never
formats with Prettier — so Prettier only runs at commit time, which is the
formatting inconsistency that prompted this change.

Biome is a single Rust binary that does both formatting and linting from one
`biome.json`. It is fast, removes the ESLint↔Prettier coordination, and fixes the
on-save gap. The constraint is that Biome's linter is not a 1:1 superset of
`eslint-config-next`, so some Next.js-specific rules need explicit handling and a
gap must be documented.

## Goals / Non-Goals

**Goals:**

- One tool (Biome), one config (`biome.json`), for format + lint.
- Preserve today's formatting output: no semicolons, single quotes, 2-space indent, ES5 trailing commas.
- Preserve accessibility linting (`jsx-a11y/recommended` → Biome `a11y`) and as much Next.js/React lint coverage as Biome supports.
- Fix editor format-on-save so the editor and commit hook agree.

**Non-Goals:**

- Changing the project's actual code style beyond unavoidable Biome-vs-Prettier formatting differences.
- Adding new lint rules beyond the current set.
- Touching commitlint / the `commit-msg` hook.
- The Railway migration (separate change).

## Decisions

### Use Biome 2.x with a single `biome.json`

Install the latest Biome 2.x (`@biomejs/biome`) as a dev dependency and pin it (Biome
gates rules on its version, so an exact/caret-pinned version keeps CI and local in sync).
Enable `vcs` integration (`useIgnoreFile: true`) so `.gitignore` is respected, and turn on
`formatter` and `linter` with `recommended` rules.

**Formatter mapping (Prettier → Biome):**

| Prettier            | Biome (`biome.json`)                          |
| ------------------- | --------------------------------------------- |
| `semi: false`       | `javascript.formatter.semicolons: "asNeeded"` |
| `singleQuote: true` | `javascript.formatter.quoteStyle: "single"`   |
| `tabWidth: 2`       | `formatter.indentStyle: "space"`, `indentWidth: 2` |
| `trailingComma: es5`| `javascript.formatter.trailingCommas: "es5"`  |

Alternative considered: keep Prettier for formatting and only adopt Biome's linter. Rejected
— it leaves two tools and doesn't fix the on-save gap, defeating the point.

### Lint coverage: Biome `recommended` + `a11y` + Next/React domains

`jsx-a11y/recommended` maps onto Biome's `a11y` rule group (on under `recommended`).
For Next.js, enable Biome's `react` and `next` domains (Biome 2 domains) so framework
rules (e.g. `noImgElement`, hooks dependency checks) are active.

Biome does **not** replicate every `@next/next/*` rule from `eslint-config-next`. The gap
below was produced against Biome 2.5.0 by mapping `next/core-web-vitals` rules to Biome's
rule set (config `linter.domains.next: "recommended"` + `react: "recommended"`).

**Covered by Biome** (`@next/next/*` → Biome rule): `no-img-element` → `performance/noImgElement`;
`no-sync-scripts` → `noSyncScripts`; `no-unwanted-polyfillio` → `noUnwantedPolyfillio`;
`inline-script-id` → `useInlineScriptId`; `google-font-display` → `useGoogleFontDisplay`;
`google-font-preconnect` → `useGoogleFontPreconnect`; `no-head-element` → `noHeadElement`;
`no-document-import-in-page` → `noDocumentImportInPage`; `no-head-import-in-document` →
`noHeadImportInDocument`; `no-before-interactive-script-outside-document` →
`noBeforeInteractiveScriptOutsideDocument`; `no-async-client-component` →
`noNextAsyncClientComponent`. React Hooks `exhaustive-deps` → `useExhaustiveDependencies`.
Verified live: `noImgElement` and `a11y/useAltText` both fire on an `<img>` without `alt`.

**No Biome equivalent** (accepted gaps): `no-html-link-for-pages`, `no-css-tags`,
`no-styled-jsx-in-document`, `no-script-component-in-head`, `no-duplicate-head`,
`no-page-custom-font`, `no-title-in-document-head`, `no-typos`, `next-script-for-ga`,
`no-assign-module-variable`, and React `rules-of-hooks` (only the narrower `useHookAtTopLevel`
exists). **Practical impact: negligible** — almost all of these target the `pages/` router and
a custom `_document`, neither of which this App Router site uses. Re-add `eslint-config-next`
only if one of these proves to matter.

Alternative considered: keep `eslint-config-next` alongside Biome purely for Next rules.
Rejected for now — the proposal is a full swap, and `next lint` is deprecated in current
Next.js. Revisit only if the gap proves material.

### `next lint` removal

Replace the `lint` script (`next lint`) with `biome check`. Add `format` (`biome format --write`).
Use `biome check` (lint + format + organise imports) as the canonical gate. `next build`
does not require ESLint, so the build is unaffected.

### lint-staged → single Biome command

Replace the two `lint-staged` entries with one: `biome check --write --no-errors-on-unmatched`
across staged files. This formats, lints, and fixes in one pass.

### VS Code: Biome as default formatter

Set `editor.defaultFormatter: "biomejs.biome"`, `editor.formatOnSave: true`, and
`editor.codeActionsOnSave: { "source.fixAll.biome": "explicit", "source.organizeImports.biome": "explicit" }`,
removing the ESLint on-save action. Keep `tailwindCSS.classFunctions: ["cva", "cn"]`.
Requires the Biome VS Code extension — note this in the README/onboarding.

## Risks / Trade-offs

- **Lost Next.js-specific rules** → Document the gap explicitly (decision above). Re-add `eslint-config-next` later only if a real regression appears.
- **One-off reformat diff** → Biome and Prettier disagree on some edge cases; the first `biome format --write` may touch many files. Mitigate by committing the reformat as its own isolated commit so review is clean.
- **CSS handling** → `src/globals.css` uses Tailwind v4 at-rules (`@theme`, `@apply`). Biome's CSS support may flag unknown at-rules. Mitigate by scoping Biome to JS/TS or disabling the relevant CSS lint rules / excluding `globals.css` if it produces noise.
- **Version drift** → Biome rules change between versions. Mitigate by pinning the version so local and CI behave identically.
- **Editor extension dependency** → Format-on-save needs the Biome extension; without it, the commit hook still enforces style as a backstop.

## Migration Plan

1. Add `@biomejs/biome`; create `biome.json` with the formatter/linter config above.
2. Run `biome check --write` once; commit the reformat in isolation.
3. Swap `package.json` scripts and the `lint-staged` block; update `.vscode/settings.json`.
4. Remove ESLint/Prettier deps and delete `.eslintrc`, `.prettierrc`, `.prettierignore`.
5. Record the Next.js rule gap in this design file.
6. Verify: `yarn lint`, `yarn format`, `yarn build`, and a test commit all pass.

Rollback: revert the change commits and `yarn install` — config is file-based, so rollback is clean.

## Open Questions

_Both resolved during apply:_

- **CSS scope** → Keep CSS in scope. Biome 2.5's `css.parser.tailwindDirectives: true` parses Tailwind v4 at-rules (`@theme`, `@apply`, `@custom-variant`), so no exclusion is needed. The only CSS change is `@import` single → double quotes, which matches Prettier's CSS behaviour.
- **Version pin** → Exact pin (`@biomejs/biome` 2.5.0, installed with `--exact`) for reproducibility, since Biome gates rules on its version.
