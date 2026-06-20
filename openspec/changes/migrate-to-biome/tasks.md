## 1. Install and configure Biome

- [x] 1.1 Add `@biomejs/biome` to devDependencies (pin an exact 2.x version) via `yarn add -D --exact @biomejs/biome`
- [x] 1.2 Create `biome.json`: enable `formatter` and `linter` with `recommended` rules, and `vcs` integration (`useIgnoreFile: true`)
- [x] 1.3 Set formatter options to match Prettier: `semicolons: "asNeeded"`, `quoteStyle: "single"`, `indentStyle: "space"`, `indentWidth: 2`, `trailingCommas: "es5"`
- [x] 1.4 Enable `a11y` rule group and the `react`/`next` domains for framework lint coverage
- [x] 1.5 Decide CSS scope: run Biome on `src/globals.css` and, if Tailwind v4 at-rules produce noise, scope Biome to JS/TS or disable the offending CSS rules

## 2. Map and document lint coverage

- [x] 2.1 Inspect Biome's enabled rules; confirm `jsx-a11y/recommended` equivalents are active
- [x] 2.2 List `next/core-web-vitals` rules with no Biome equivalent and record the gap in `design.md` under the Next.js coverage decision
- [x] 2.3 Confirm a known a11y violation (e.g. `<img>` without `alt`) is reported by `biome check`

## 3. Reformat the codebase

- [x] 3.1 Run `biome check --write` across the repo
- [ ] 3.2 Commit the reformat as an isolated commit so the diff is reviewable on its own

## 4. Wire up scripts and tooling

- [x] 4.1 Replace the `lint` script (`next lint`) with `biome check`; add a `format` script (`biome format --write`)
- [x] 4.2 Replace the `lint-staged` block with a single `biome check --write --no-errors-on-unmatched` entry
- [x] 4.3 Update `.vscode/settings.json`: set `biomejs.biome` as default formatter, enable `formatOnSave`, set `source.fixAll.biome` + `source.organizeImports.biome` on save, remove the ESLint on-save action, keep `tailwindCSS.classFunctions`

## 5. Remove ESLint and Prettier

- [x] 5.1 Remove devDependencies: `eslint`, `eslint-config-next`, `eslint-config-prettier`, `eslint-plugin-jsx-a11y`, `prettier`
- [x] 5.2 Delete `.eslintrc`, `.prettierrc`, `.prettierignore`
- [x] 5.3 Run `yarn install` to update the lockfile

## 6. Verify and document

- [x] 6.1 Verify `yarn lint`, `yarn format`, and `yarn build` all pass
- [ ] 6.2 Make a test commit to confirm `lint-staged` + the `commit-msg` commitlint hook still work
- [x] 6.3 Update `CLAUDE.md` (Tech stack, Code style, Commands) and the README to reference Biome and note the Biome VS Code extension requirement
