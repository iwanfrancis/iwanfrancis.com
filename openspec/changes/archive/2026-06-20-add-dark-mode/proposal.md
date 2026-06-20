## Why

The site is light-only. A dark mode is a low-cost, expected nicety: the shadcn
token system (`:root` / `.dark` blocks plus `@custom-variant dark`) is already in
place, so most surfaces flip for free — only the bespoke pieces (the matrix
background, the company logo plates) and the switch itself need building.

## What Changes

- Add `next-themes` with `defaultTheme="system"`, `enableSystem`, class-based
  switching, localStorage persistence, and a no-flash pre-paint script. Wrap the
  app in a `ThemeProvider` in `layout.tsx` and add `suppressHydrationWarning` to
  `<html>`.
- Add a sun/moon icon button to the footer (a `'use client'` component beside
  `ScrollToTopButton`) that flips between light and dark. Both `Sun` and `Moon`
  render, with CSS `dark:` variants cross-fading/rotating between them — no
  `mounted` gate, no hydration mismatch.
- Token-ise the two hardcoded matrix colours in `globals.css`: lift the
  `bg-matrix` dot colour (`#525252`) and the `bg-hover-effect-overlay` spotlight
  wash (`#f8fafc`) into CSS variables (`--matrix-dot`, `--matrix-overlay`) defined
  in `:root` and `.dark`, referenced via `var()` in the `@utility` blocks. The
  spotlight wash flips from near-white to near-dark so it darkens (not strobes
  white) in dark mode.
- Give the company logo plates (`company-logo.tsx`) an explicit `bg-white` so dark
  company marks (IBM, Red Hat, etc.) stay legible against a dark page.
- No change to the header logo — it already inverts via `bg-foreground` /
  `text-background`.

Out of scope (punted): theme-reactive favicon switching. The existing duplicate
favicon source (`metadata.icons.icon` in `layout.tsx` vs the dynamic `icon.tsx`)
is left as-is unless trivially resolved while in the file.

## Capabilities

### New Capabilities
- `theme-switching`: How visitors choose and persist a light/dark theme — the
  system-preference default, the footer toggle, persistence across visits,
  no-flash on load, and the requirement that bespoke surfaces (matrix background,
  company logo plates) adapt to the active theme while token-driven surfaces
  follow automatically.

### Modified Capabilities
<!-- None. The matrix background and company logos are visual chrome, not behaviour
     covered by an existing spec; their theme behaviour is captured under the new
     theme-switching capability. -->

## Impact

- **Dependencies**: adds `next-themes`.
- **Code**:
  - New `src/app/provider.tsx` — `AppProvider` composing next-themes (app-layer,
    per bulletproof-react).
  - `src/app/layout.tsx` — wrap in `AppProvider`, add `suppressHydrationWarning`.
  - `src/globals.css` — add `--matrix-dot` / `--matrix-overlay` to `:root` and
    `.dark`; reference them in the `bg-matrix` and `bg-hover-effect-overlay`
    utilities; add the `@property --theme-reveal` + `@keyframes` reveal for the
    toggle animation.
  - `src/components/navigation/footer/footer.tsx` — render the new toggle.
  - New `src/components/navigation/footer/theme-toggle-button.tsx` (`'use client'`,
    presentational).
  - New `src/hooks/use-theme-toggle/` — `useThemeToggle` hook holding the toggle +
    View Transition reveal logic.
  - `src/features/landing/experience/components/company-logo.tsx` — `bg-white` plate.
- **No breaking changes.** Light mode is unchanged; dark mode is additive.
