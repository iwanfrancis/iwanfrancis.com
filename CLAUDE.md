# CLAUDE.md

Guidance for Claude Code when working in this repository.

## Project

Personal website for Iwan Francis — live at **iwanfrancis.com**. A single-page CV /
landing site (hero, experience, education) with room to grow.

A browser game is in progress as a **separate project** with its own deployment. It
will live at a subdomain (e.g. `game.iwanfrancis.com`), not inside this app — this repo's
only involvement is linking out to it.

Currently deployed on **Vercel**; a migration to **Railway** is planned (a good first
OpenSpec change).

## Commands

Package manager: **yarn** (classic / v1).

| Command      | What it does                          |
| ------------ | ------------------------------------- |
| `yarn dev`    | Start the dev server (localhost:3000)            |
| `yarn build`  | Production build                                 |
| `yarn start`  | Serve the production build                       |
| `yarn lint`   | Lint + format check, read-only (`biome check .`) |
| `yarn format` | Format & fix in place (`biome format --write .`) |

There is no test suite yet.

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
- `components.json` aliases (`@/lib/...`) don't match the actual layout (`@/utils/...`).
- Folder typo: `src/components/layout/seperator/` → `separator`.
- `README.md` is a single line; `next.config.mjs` is empty (will likely need `output: 'standalone'` for Railway).

## Self-improvement

When you learn something durable mid-task — or when the user says "reflect on this" — abstract the lesson, generalise it past the immediate case, and persist it. Don't let it die in chat. Route by scope:

- **Project rule, convention, or gotcha** (true for anyone on this repo) → the most specific home: a workspace `CLAUDE.md` (`client/`, `server/`), an `openspec` spec, or this file. New hard rules, tech-stack, or build-order changes go in `openspec/config.yaml` and need explicit sign-off.
- **Personal working preference** (how Iwan likes Claude to behave) → the user memory system, not here.

Triggers: a user correction that generalises beyond the immediate fix; an undocumented convention you had to infer from the code; a documented rule the code has outgrown (fix it in the same change); an explicit "reflect on this mistake".

Filter: persist only what's non-obvious, durable, and generalisable. Skip one-off facts, anything already in git history or the code, and anything that needs a "future requirements" story to justify.

Writing a rule: lead with NEVER/ALWAYS, state the problem before the fix in 1–3 bullets, show one concrete example at most. No decision trees, no narration. Surface any committed-doc change in your reply — don't bury it.
