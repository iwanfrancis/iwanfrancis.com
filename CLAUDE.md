# CLAUDE.md

Guidance for Claude Code when working in this repository.

## Project

Personal website for Iwan Francis — live at **iwans.space**. A single-page CV /
landing site (hero, experience, education) with room to grow.

A browser game is in progress as a **separate project** with its own deployment. It
will live at a subdomain (e.g. `balls.iwans.space`), not inside this app — this repo's
only involvement is linking out to it.

Hosted **Claude artifacts** are served from a separate sibling repo, **`artifact-server`**
(its own Railway service, bound to `artifacts.iwans.space`) — a read-only S3 proxy in front
of a Railway Bucket, deliberately isolated from this app's origin and secrets. This app now
gates its `/artifacts` admin surface behind a self-contained password login (change ②, the
`auth` feature at `src/features/auth/`; sign in at `/login`). That surface is now the
management UI (change ③, the `artifact-management` feature at `src/features/artifact-management/`):
drag-and-drop upload of a single `.html` or a `.zip` bundle, plus a listing with copy-link and
delete. It writes to the same Railway Bucket as `artifact-server` using the main app's own
`ARTIFACTS_S3_*` credentials (never added to `artifact-server`); see
`openspec/notes/artifact-hosting-roadmap.md`.

Deployed on **Railway**, served at **iwans.space** with DNS on **Cloudflare** (proxied /
orange cloud). The legacy domain **iwanfrancis.com** 301-redirects to it. Previously hosted
on Vercel.

## Commands

Package manager: **yarn** (classic / v1).

| Command      | What it does                          |
| ------------ | ------------------------------------- |
| `yarn dev`    | Start the dev server (localhost:3000)            |
| `yarn build`  | Production build                                 |
| `yarn start`  | Serve the production build                       |
| `yarn lint`   | Lint + format check, read-only (`biome check .`) |
| `yarn format` | Format & fix in place (`biome format --write .`) |
| `yarn test`       | Run the full test suite once (`vitest run`) |
| `yarn test:watch` | Vitest in watch mode                        |
| `yarn typecheck`  | Type-check without emitting (`tsc --noEmit`) |

`yarn test` is safe to run while `yarn dev` is up (unlike `yarn build`).

## Tech stack

- **Next.js 15** (App Router) + **React 19**
- **TypeScript** (strict), path alias `@/*` → `src/*`
- **Tailwind CSS v4** — config lives in CSS (`src/globals.css` via `@theme`), not a JS config file
- **shadcn/ui** (new-york style) with **Radix** primitives, **lucide-react** icons
- Styling helpers: `cva` (class-variance-authority) + `cn()` (`src/utils/cn.ts`, clsx + tailwind-merge)

## Architecture & conventions

This repo follows **[bulletproof-react](https://github.com/alan2207/bulletproof-react)** — see its
[project-structure](https://github.com/alan2207/bulletproof-react/blob/master/docs/project-structure.md)
doc. Keep new code within these conventions.

**Folder map** (`src/`):

- **`app/`** — App Router entry (`layout.tsx`, `page.tsx`, `icon.tsx`) and route composition.
  React Server Components by default; add `'use client'` only when needed.
- **`features/`** — feature-scoped code, and the home for most code. One folder per feature
  (e.g. `features/landing/`), each holding only the sub-folders it needs: `api/`, `assets/`,
  `components/`, `hooks/`, `stores/`, `types/`, `utils/`. Current features nest by section, e.g.
  `features/landing/{hero,experience,education}/components/*`. Promote code to a shared layer only
  once it's actually reused.
- **`components/`** — shared, reusable UI grouped by role: `data-display/`, `inputs/`, `layout/`,
  `navigation/`. The role grouping mirrors MUI — a local extension of bulletproof's flat
  `components/`; keep it. One folder per component.
- **`config/`**, **`hooks/`**, **`types/`**, **`utils/`** — shared, app-wide, as named.
  `lib/` (configured library wrappers), `stores/` (global state), `assets/`, and `testing/` are part
  of the convention too — add them when first needed rather than inventing another location.

**Unidirectional imports** — code flows one way only: **shared → features → app**.

- ALWAYS keep the flow one-way. Shared layers (`components`, `hooks`, `utils`, `types`, `config`,
  `lib`, `stores`) MUST NOT import from `features/` or `app/`. `features/` may import shared layers;
  `app/` may import both.
- NEVER import one feature from another. Compose features together at the `app/` level instead.
- Import shared code via the `@/` alias; use relative imports only within the same feature folder.
- Avoid barrel / `index.ts` re-export files — import the specific file directly.
- Not auto-enforced: Biome has no path-boundary rule equivalent to bulletproof's ESLint
  `import/no-restricted-paths`, so these import rules rely on you and on review.

## Code style

- **Biome** (`biome.json`) does both formatting and linting — there is no ESLint or Prettier.
  Format rules match the old Prettier setup: no semicolons, single quotes, 2-space indent,
  ES5 trailing commas. Don't hand-format against this.
- **Linting**: Biome `recommended` rules plus the `react`/`next` domains and the `a11y` group.
  Accessibility is enforced — keep it that way. A few `@next/next/*` rules have no Biome
  equivalent (mostly `pages/`-router / `_document` rules this App Router site doesn't use).
- **Editor**: install the **Biome VS Code extension** (`biomejs.biome`); `.vscode/settings.json`
  sets it as the default formatter with format + fixes + organise-imports on save.
- **Commits**: Conventional Commits, enforced by commitlint via a Husky `commit-msg` hook.
  `lint-staged` runs `biome check --write` on staged files on `pre-commit`. (The existing
  history also uses gitmoji.)

## Testing

**Vitest**, two projects routed by extension: `*.test.ts` runs in `node`, `*.test.tsx` runs in
`jsdom` with `src/testing/setup.ts` (jest-dom matchers, RTL cleanup, Radix DOM shims). Tests are
colocated next to their subject (`foo.ts` → `foo.test.ts`); shared test code lives in
`src/testing/` (a shared layer — it must not import from `features/` or `app/`). Import `it`,
`expect`, `vi` etc. from `vitest` explicitly — globals are off. Biome's `test` domain lints test
files (no `it.only`, etc.). CI runs lint, typecheck, and tests on every push; no coverage
thresholds.

**Structure — every test:**

- ALWAYS structure tests with `// Arrange` / `// Act` / `// Assert` comments when the test has
  distinct phases. Single-expression tests and `it.each` tables skip the comments.
- ALWAYS name tests by behaviour ("rejects a token signed with a different secret") — never
  "test X" / "works".
- Keep structure flat: at most one `describe` per unit under test; prefer inline arrange (or a
  small named helper) over `beforeEach` chains.
- Use `it.each` for input/output tables.
- Stub env with `vi.stubEnv`; never use real secrets. Build zip fixtures in-memory with `fflate`.
- Don't test async RSC pages (RTL can't render them), presentational sections, or visuals.

**React tests — Kent C Dodds RTL rules (not machine-enforced; follow them):**

- Query priority: `getByRole(…, { name })` → label → text; `data-testid` only as a last resort.
  If a role query can't find it, fix the component's markup — NEVER add ARIA attributes just to
  satisfy a test.
- ALWAYS query via `screen`; never destructure queries from `render`.
- ALWAYS interact via `userEvent.setup()`; `fireEvent` is banned. Sole carve-out: an event
  user-event cannot produce (e.g. drag-and-drop `drop`) may use `fireEvent` with a comment.
- `findBy*` for elements that appear asynchronously; never `waitFor(() => getBy…)`.
- `queryBy*` only for asserting absence (`expect(…).not.toBeInTheDocument()`).
- `waitFor`: one assertion per callback, no side-effects inside, never empty.
- Assert with jest-dom matchers (`toBeInTheDocument`, `toBeDisabled`, …), not truthiness.
- Never call `cleanup` manually or wrap RTL calls in `act()` — the setup handles both.

## OpenSpec workflow

This repo uses **OpenSpec** for spec-driven changes. Non-trivial work (features, migrations,
refactors) should go through a change proposal before implementation. Skills live in
`.claude/skills/openspec-*`; project context for proposals is in `openspec/config.yaml`.

**Layout** (`openspec/`):

- `specs/` — the main specs: source of truth for current, shipped behaviour.
- `changes/` — in-flight changes, one folder each, holding the proposal, design, tasks, and the
  delta specs that change will introduce.
- `changes/archive/` — completed changes, dated (e.g. `2026-06-07-<name>`).

**Lifecycle**: propose a change → implement its tasks → archive it. On archive, the change's delta
specs are synced into `specs/` so the main specs always reflect what's shipped. Explore first if the
problem isn't clear yet.

- `/opsx:propose "<idea>"` — create a change with proposal + design + tasks
- `/opsx:apply` — implement the tasks of a change
- `/opsx:archive` — archive a completed change (syncs deltas into `specs/`)
- `/opsx:explore` — think through a problem without writing code

## Known cleanup backlog

Things noticed but intentionally left for spec-driven tidy-up — don't treat as done:

- `src/app/page.tsx` imports `Education` but never renders it (dead import).
- Folder typo: `src/components/layout/seperator/` → `separator`.
- `README.md` is a single line.

## Self-improvement

When you learn something durable mid-task — or when the user says "reflect on this" — abstract the lesson, generalise it past the immediate case, and persist it. Don't let it die in chat. Route by scope:

- **Project rule, convention, or gotcha** (true for anyone on this repo) → the most specific home: a workspace `CLAUDE.md` (`client/`, `server/`), an `openspec` spec, or this file. New hard rules, tech-stack, or build-order changes go in `openspec/config.yaml` and need explicit sign-off.
- **Personal working preference** (how Iwan likes Claude to behave) → the user memory system, not here.

Triggers: a user correction that generalises beyond the immediate fix; an undocumented convention you had to infer from the code; a documented rule the code has outgrown (fix it in the same change); an explicit "reflect on this mistake".

Filter: persist only what's non-obvious, durable, and generalisable. Skip one-off facts, anything already in git history or the code, and anything that needs a "future requirements" story to justify.

Writing a rule: lead with NEVER/ALWAYS, state the problem before the fix in 1–3 bullets, show one concrete example at most. No decision trees, no narration. Surface any committed-doc change in your reply — don't bury it.
