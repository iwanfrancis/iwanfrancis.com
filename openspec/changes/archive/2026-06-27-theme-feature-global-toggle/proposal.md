## Why

The theme toggle lives in the footer, but the footer is only rendered by the
`(site)` layout. The `(canvas)` layout — used by `/thingies` — is deliberately
full-bleed and omits the footer, so there is no way to switch theme on those pages.
The toggle needs to live on chrome that appears on every route.

## What Changes

- Introduce a `theme` feature (`src/features/theme/`) that gathers the scattered
  theme code — the toggle component, the `use-theme-toggle` hook, and the
  `next-themes` provider wrapper — into one cohesive vertical slice.
- Give the header and footer a generic `actions` slot. Neither component imports
  the toggle directly; the `app/` layouts inject `<ThemeToggleButton />` into the
  slot. This keeps the unidirectional import flow legal (shared → features → app):
  shared header/footer never import from `features/`.
- Render the toggle in the header (present on every page, including `/thingies`)
  **and** keep it in the footer where the footer exists.
- Move `src/hooks/use-theme-toggle/` and
  `src/components/navigation/footer/theme-toggle-button.tsx` into the feature; the
  old footer-scoped locations are removed.
- No change to toggle behaviour: persistence, no-flash, the circular-reveal
  animation, and accessibility all stay identical. `src/globals.css` (the `.dark`
  tokens and view-transition keyframes) stays global and is untouched.

## Capabilities

### New Capabilities
<!-- None. The `theme` feature is a code-organisation change, not a new spec-level capability. -->

### Modified Capabilities
- `theme-switching`: the toggle is no longer footer-only. The requirement that
  visitors toggle "from the footer" becomes toggling from site-wide chrome (the
  persistent header) and the footer, so the theme is switchable on every page —
  including those without a footer.

## Impact

- **New**: `src/features/theme/` (components + hook, plus the provider wrapper).
- **Moved/removed**: `src/components/navigation/footer/theme-toggle-button.tsx`,
  `src/hooks/use-theme-toggle/`.
- **Modified**: `src/components/navigation/header/header.tsx` and
  `src/components/navigation/footer/footer.tsx` gain an `actions` slot;
  `src/app/(site)/layout.tsx`, `src/app/(canvas)/layout.tsx`, and
  `src/app/provider.tsx` wire the toggle and provider.
- **Spec**: `openspec/specs/theme-switching/spec.md` (footer-toggle requirement).
- **Dependencies**: none added. No behavioural or API changes; not breaking.
