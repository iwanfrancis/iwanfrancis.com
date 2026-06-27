## Context

The `Header` and `Footer` live in the shared `components/navigation/` layer but
still bake in Iwan-specific content: the header hard-codes its two nav links and
imports the branded `Logo`; the footer hard-codes the GitHub/LinkedIn links and
imports `EMAIL`. The same three-icon social cluster is repeated a third time in
`features/landing/hero`. The previous session added an `actions` slot to both; this
change finishes the decoupling so the chrome is genuinely reusable and the link data
has one home.

Constraints (from CLAUDE.md / config.yaml):
- Bulletproof-react, **unidirectional imports**: shared → features → app. Shared
  components must not import from `features/` or `app/`. `config/` is a shared layer,
  so a component importing `config/` is shared→shared and allowed — but the goal is
  for the chrome to be *generic*, so the cleaner wiring is to read config at the
  `app/` layout level and pass it down as props.
- RSC by default; `'use client'` only when needed. `Header` and `ScrollToTopButton`
  are already client components; `Footer` and `SocialLinks` can stay server.
- Biome formatting; a11y enforced.

## Goals / Non-Goals

**Goals:**
- `Header` and `Footer` become presentational, props-driven, with no site-specific
  data or branded imports.
- One `siteConfig` module is the single source of truth for nav links and social
  links.
- A shared `SocialLinks` component removes the third hard-coded copy in the hero.
- No visible change for visitors; existing nav and scroll behaviour preserved.

**Non-Goals:**
- No new sections, links, or visual redesign.
- Not generalising other chrome (the `Logo` mark stays Iwan's; it's just passed in
  as a slot rather than imported inside `Header`).
- No test suite (none exists yet).
- Not touching `config/constants.ts` `ADDRESSES` (used by the experience section).

## Decisions

### 1. Config at `app/`, props into the chrome (not config imported by the chrome)

Both wirings satisfy the import rule, but having `Header`/`Footer` import `siteConfig`
directly would re-couple "generic" components to this site's data. Instead the two
layouts (`app/(site)`, `app/(canvas)`) import `siteConfig` and pass `links`/`socials`
as props. The chrome then knows nothing about Iwan. The hero (a feature) imports
`siteConfig` directly — that's shared→feature, allowed, and the hero is genuinely
site-specific anyway.

Alternative considered: chrome reads config itself (fewer props). Rejected — it keeps
the very coupling this change exists to remove.

### 2. Shape of `siteConfig` (`config/site.ts`)

```ts
import { Github, Linkedin, Mail, type LucideIcon } from 'lucide-react'

export type NavLink = { label: string; href: string }
export type SocialLink = { label: string; href: string; icon: LucideIcon; external?: boolean }

export const siteConfig = {
  nav: [
    { label: 'Home', href: '/#hero' },
    { label: 'Experience', href: '/#experience' },
  ] satisfies NavLink[],
  socials: [
    { label: 'GitHub', href: 'https://github.com/iwanfrancis', icon: Github, external: true },
    { label: 'LinkedIn', href: 'https://www.linkedin.com/in/iwan-francis/', icon: Linkedin, external: true },
    { label: 'Email', href: 'mailto:iwanfrancis@gmail.com', icon: Mail },
  ] satisfies SocialLink[],
}
```

`EMAIL` folds into the `mailto:` social entry. Types are exported so `Header`,
`Footer`, and `SocialLinks` can type their props without redeclaring shapes.

Alternative considered: a `type` discriminator (`'github' | 'linkedin' | …`) mapped to
icons inside `SocialLinks`. Rejected — storing the `LucideIcon` reference directly is
simpler and keeps the icon set open.

### 3. `SocialLinks` is a new shared component

`components/navigation/social-links/social-links.tsx` — maps `SocialLink[]` to the
existing ghost icon-button + anchor markup. External links get
`target="_blank" rel="noopener noreferrer"`; `mailto:`/internal links do not.
Accepts a `className` for spacing differences (footer is inline in a row; hero is its
own centred block) so both callers keep their current look.

```tsx
function SocialLinks({ links, className }: { links: SocialLink[]; className?: string })
```

Lives under `components/navigation/` because it is shared chrome reused by a feature.

### 4. `Header` and `Footer` prop shapes

- `Header`: `{ logo?: ReactNode; links?: NavLink[]; actions?: ReactNode }`. Default
  `links` to `[]` so the component renders safely with none. The home/logo `Link`
  wrapper and aria-label stay, but the logo *content* comes from the `logo` slot.
- `Footer`: `{ socials?: SocialLink[]; actions?: ReactNode }`. Renders
  `<SocialLinks links={socials} />`, then `actions`, then `ScrollToTopButton`. Drop
  the stray empty `<div />`.

The home-link aria-label (`"Iwan Francis - Go to homepage"`) is mild branding; keep
it as a sensible default to avoid an extra prop for a one-person site. (Noted as a
small, deliberate exception to "no site-specific strings".)

## Risks / Trade-offs

- [Logo aria-label still names Iwan inside generic `Header`] → Accepted: it's a
  default string, trivially overridable later; adding a prop now is YAGNI for a
  single-tenant site.
- [Passing `LucideIcon` components through config] → Fine in RSC; icons are
  components, not serialised data, and `Footer`/`SocialLinks` render them directly.
- [Hero block spacing differs from footer] → Mitigated by `SocialLinks` `className`
  prop; verify the hero still matches its current `gap`/padding after the swap.
- [Behaviour regression in nav/scroll] → Low; markup is moved, not rewritten. Verify
  manually with `yarn dev` (no test suite).

## Migration Plan

1. Add `config/site.ts`; remove `EMAIL` usage once callers move (delete `EMAIL` from
   `config/constants.ts` after the hero and footer stop importing it).
2. Add `SocialLinks`; refactor `Footer` and `Hero` to use it via `siteConfig`.
3. Make `Header` props-driven; pass `<Logo />`, `siteConfig.nav`, and the theme
   toggle from both layouts.
4. Run `yarn lint` and check the page in `yarn dev`.

Rollback: revert the change set; purely structural, no data/config migration.

## Open Questions

None blocking. The logo aria-label default is the only judgement call and is recorded
above.
