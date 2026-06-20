## 1. Provider and dependency

- [x] 1.1 Add `next-themes` via `yarn add next-themes`; confirm the install accepts React 19 (pin if it warns).
- [x] 1.2 Create `src/app/provider.tsx` (`'use client'`) exporting an `AppProvider` that composes the app's providers — currently `next-themes` with `attribute="class"`, `defaultTheme="system"`, `enableSystem`, `disableTransitionOnChange` (bulletproof-react puts providers in the app layer, not `components/`).
- [x] 1.3 In `src/app/layout.tsx`, add `suppressHydrationWarning` to `<html>` and wrap the existing tree in `<AppProvider>` inside `<body>`.

## 2. Footer toggle

- [x] 2.1 Create `src/components/navigation/footer/theme-toggle-button.tsx` (`'use client'`): a presentational ghost icon `Button` rendering both `Sun` and `Moon`, with `dark:` variants cross-fading/rotating which icon is visible and an `aria-label` describing the toggle. Its `onClick` is the handler returned by the `useThemeToggle` hook.
- [x] 2.2 Render `<ThemeToggleButton />` in `footer.tsx` alongside the existing icon buttons (e.g. before `ScrollToTopButton`); keep footer a server component.

## 3. Theme-aware matrix background

- [x] 3.1 In `globals.css`, add `--matrix-dot` and `--matrix-overlay` to both `:root` (dot `#525252`, overlay `#f8fafc`) and `.dark` (dot a lighter grey, overlay a near-dark value).
- [x] 3.2 Update the `bg-matrix` and `bg-hover-effect-overlay` `@utility` blocks to reference `var(--matrix-dot)` / `var(--matrix-overlay)` instead of the hardcoded hex values.

## 4. Company logo plates

- [x] 4.1 In `company-logo.tsx`, add an explicit `bg-white` to the plate so dark company marks stay legible in dark mode.

## 5. Animated circular reveal

- [x] 5.1 In a `useThemeToggle` hook (`src/hooks/use-theme-toggle/`), wrap `setTheme` in `document.startViewTransition` (with `flushSync` so next-themes' class change is captured in the snapshot) and set the reveal's origin (`--theme-reveal-x/y`) and end radius (`--theme-reveal-end` = furthest corner + feather) as custom properties on `documentElement`.
- [x] 5.2 Fall back to an instant switch when `document.startViewTransition` is unavailable (e.g. Firefox) or `prefers-reduced-motion: reduce` is set.
- [x] 5.3 In `globals.css`, register `@property --theme-reveal` (`<length>`), mask `::view-transition-new(root)` with a feathered radial gradient reading `var(--theme-reveal)`, and animate it `0 → --theme-reveal-end` via a `@keyframes` CSS animation on the pseudo (a registered property is required — `mask-image`/gradient keyframes don't interpolate). Keep `animation: none` on `::view-transition-old(root)`.

## 6. Verify

- [x] 6.1 Run `yarn lint` and `yarn build`; fix any issues.
- [x] 6.2 Manually verify both themes in-browser: no flash on load with a stored preference, toggle flips light↔dark, choice persists across reload, system default applies with no stored preference.
- [x] 6.3 On a non-touch device, confirm the cursor-follow spotlight darkens the periphery in dark mode (not near-white), the matrix dots read in both themes, the header logo inverts, and company logos stay legible.
- [x] 6.4 Confirm the soft-edged circular reveal runs on toggle (View Transitions) with a feathered edge and that the theme still flips/persists correctly; confirm the instant fallback path for reduced motion / unsupported browsers.
