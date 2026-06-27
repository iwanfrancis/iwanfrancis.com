## Context

Theme switching is implemented with `next-themes` and is fully working, but its
code is scattered: the provider sits in `src/app/provider.tsx`, the toggle UI in
`src/components/navigation/footer/theme-toggle-button.tsx`, and the
`use-theme-toggle` hook in `src/hooks/use-theme-toggle/`.

The toggle is only reachable via the footer, and the footer is only rendered by the
`(site)` layout. The `(canvas)` layout (used by `/thingies`) is intentionally
full-bleed and renders no footer, so those pages have no theme control. The only
chrome present on **every** route is the `<Header />`, which both layouts render.

Constraint that shapes the whole design: bulletproof-react's unidirectional import
rule. `src/components/navigation/header` and `.../footer` are **shared** layers, and
shared layers MUST NOT import from `features/`. So a `features/theme/` toggle cannot
be imported by the header or footer directly.

## Goals / Non-Goals

**Goals:**

- Make the theme toggle reachable on every page, including footer-less ones.
- Gather theme code into a single `features/theme/` vertical slice.
- Keep every import arrow legal (shared → features → app).
- Preserve toggle behaviour exactly: persistence, no-flash, circular-reveal
  animation, and accessibility.

**Non-Goals:**

- Redesigning the header layout or its responsive behaviour (a separate header pass
  is coming; mobile width is explicitly deferred).
- Changing the theme palette, tokens, or the view-transition animation.
- Adding a floating/fixed toggle independent of header and footer.
- Moving the header or footer out of `components/navigation/` into a feature.

## Decisions

### Decision: `theme` becomes a full feature

Move the toggle component, the `use-theme-toggle` hook, and a thin `next-themes`
provider wrapper into `src/features/theme/`:

```
src/features/theme/
├── components/
│   ├── theme-toggle-button.tsx
│   └── theme-provider.tsx      # wraps next-themes ThemeProvider
└── hooks/
    └── use-theme-toggle.ts
```

`src/app/provider.tsx` imports `ThemeProvider` from the feature (app → features is
allowed). Theme is a cohesive vertical — provider, state hook, and UI — so a feature
is the right home rather than leaving it spread across three shared/app locations.

- **Alternative — keep the toggle as a shared component** (`components/navigation/theme-toggle/`):
  simplest and import-legal, but it isn't a feature and leaves the provider/hook
  scattered. Rejected because the user explicitly wants the bulletproof feature shape.

### Decision: header and footer expose a generic `actions` slot; `app/` injects the toggle

Header and footer gain an optional `actions?: ReactNode` prop rendered in their
existing right-hand button group. They do **not** import the toggle. The two layouts
— which may import both shared and features — inject it:

```
app/(site)/layout.tsx     →  <Header actions={<ThemeToggleButton />} />
                             <Footer actions={<ThemeToggleButton />} />
app/(canvas)/layout.tsx   →  <Header actions={<ThemeToggleButton />} />
```

This is the only way to make `theme` a feature without breaking the import rule, and
it leaves header/footer as dumb, reusable shells — a later action (language switch,
share) drops into the same slot.

- **Alternative — header/footer import the toggle directly**: violates shared → features. Rejected.
- **Alternative — a fixed floating toggle**: adds standalone chrome and competes with
  the existing scroll-to-top control. Rejected as out of scope.

Note on the server/client boundary: the layouts are Server Components passing a
Client Component **element** as a prop to `<Header>` (itself a Client Component).
This is the standard App Router composition pattern and works without marking the
layouts `'use client'`.

### Decision: keep a toggle in the footer too

The footer keeps its toggle (via the same slot) in addition to the header. Both bind
to the same `next-themes` state through `use-theme-toggle`, so they stay in sync
automatically. The redundancy on the homepage is intentional and accepted.

### Decision: `globals.css` stays global

The `.dark` tokens and the `@property` / view-transition keyframes are global styles
loaded by the root layout. They remain in `src/globals.css`; the feature relies on
them. No CSS moves.

## Risks / Trade-offs

- **Two toggles for one state on `(site)` pages** → Accepted; both read the same
  `resolvedTheme`, so they cannot drift. Deliberate per the brief.
- **Circular reveal now originates from the header (top of viewport)** → Expected and
  fine; `use-theme-toggle` derives the origin from the activated button's own
  coordinates, so no code change is needed and each toggle reveals from its own spot.
- **Header horizontal space on narrow screens** → Known; one extra 32px icon button.
  Deferred deliberately — a header rework is coming soon.
- **Stale imports after the file moves** → Grep for the old paths
  (`navigation/footer/theme-toggle-button`, `hooks/use-theme-toggle`) and update all
  references; `yarn lint` + `yarn build` catch the rest.

## Migration Plan

Pure code reorganisation — no data, API, or config migration.

1. Create `src/features/theme/` and move the toggle, hook, and provider wrapper in.
2. Update `src/app/provider.tsx` to import the provider from the feature.
3. Add the `actions` slot to header and footer; remove the footer's direct toggle import.
4. Wire `<ThemeToggleButton />` into both layouts.
5. Delete the now-empty old locations; fix imports; `yarn lint` and `yarn build`.

Rollback is trivial (revert the commit); nothing persisted changes.

## Open Questions

None outstanding. Provider scope resolved to "full feature" (provider moves in).
