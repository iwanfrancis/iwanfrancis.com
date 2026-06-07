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

| Command       | What it does                          |
| ------------- | ------------------------------------- |
| `yarn dev`    | Start the dev server (localhost:3000) |
| `yarn build`  | Production build                      |
| `yarn start`  | Serve the production build            |
| `yarn lint`   | Run ESLint (`next lint`)              |

There is no test suite yet.

## Tech stack

- **Next.js 15** (App Router) + **React 19**
- **TypeScript** (strict), path alias `@/*` → `src/*`
- **Tailwind CSS v4** — config lives in CSS (`src/globals.css` via `@theme`), not a JS config file
- **shadcn/ui** (new-york style) with **Radix** primitives, **lucide-react** icons
- Styling helpers: `cva` (class-variance-authority) + `cn()` (`src/utils/cn.ts`, clsx + tailwind-merge)

## Architecture & conventions

- **`src/app/`** — App Router entry (`layout.tsx`, `page.tsx`, `icon.tsx`). Components are
  React Server Components by default; add `'use client'` only when needed.
- **`src/components/`** — shared, reusable UI grouped by role: `data-display/`, `inputs/`,
  `layout/`, `navigation/`. Each component gets its own folder.
- **`src/features/`** — page/feature-specific code, e.g. `features/landing/{hero,experience,education}/components/*`.
  Feature code is not shared; promote to `src/components/` only when reused.
- **`src/config/`** — constants and breakpoints. **`src/hooks/`**, **`src/types/`**, **`src/utils/`** — as named.
- Import shared code via the `@/` alias; use relative imports only within the same feature folder.

## Code style

- **Prettier**: no semicolons, single quotes, 2-space indent, ES5 trailing commas. Don't hand-format against this.
- **ESLint**: `next/core-web-vitals` + `jsx-a11y/recommended`. Accessibility is enforced — keep it that way.
- **Commits**: Conventional Commits, enforced by commitlint via a Husky `commit-msg` hook.
  `lint-staged` runs Prettier + ESLint `--fix` on `pre-commit`. (The existing history also uses gitmoji.)

## OpenSpec workflow

This repo uses **OpenSpec** for spec-driven changes. Non-trivial work (features, migrations,
refactors) should go through a change proposal before implementation. Skills live in
`.claude/skills/openspec-*`; project context for proposals is in `openspec/config.yaml`.

- `/opsx:propose "<idea>"` — create a change with proposal + design + tasks
- `/opsx:apply` — implement the tasks of a change
- `/opsx:archive` — archive a completed change
- `/opsx:explore` — think through a problem without writing code

## Known cleanup backlog

Things noticed but intentionally left for spec-driven tidy-up — don't treat as done:

- `src/app/page.tsx` imports `Education` but never renders it (dead import).
- `components.json` aliases (`@/lib/...`) don't match the actual layout (`@/utils/...`).
- Folder typo: `src/components/layout/seperator/` → `separator`.
- `README.md` is a single line; `next.config.mjs` is empty (will likely need `output: 'standalone'` for Railway).
