## Context

The shadcn token system is already in place: `src/globals.css` defines full
`:root` (light) and `.dark` token blocks and a `@custom-variant dark (&:is(.dark *))`.
So "dark mode" reduces to (a) putting `.dark` on `<html>` and persisting that
choice, and (b) fixing the few surfaces that bypass the tokens with hardcoded
colours. The header logo already uses `bg-foreground` / `text-background`, so it
inverts for free.

Two surfaces bypass the tokens, both in `globals.css`:

- `bg-matrix` — `radial-gradient(circle, #525252 1.1px, …)` dot grid.
- `bg-hover-effect-overlay` — a near-white (`#f8fafc`) cursor-follow wash, masked
  into a spotlight that lightens the page periphery around the pointer.

These are Tailwind v4 `@utility` blocks; `dark:` variants can't reach inside them,
so they need CSS-variable colours that flip under `.dark`.

The footer is a server component that already composes a `'use client'` child
(`ScrollToTopButton`), so the toggle follows the same shape with no change to the
footer's server/client boundary.

## Goals / Non-Goals

**Goals:**

- System-preference default, explicit toggle, persistence, and no flash of the
  wrong theme on load.
- Make the matrix background and company logo plates theme-aware.
- Keep the toggle free of hydration mismatches without a `mounted` gate.

**Non-Goals:**

- Theme-reactive favicon (punted; see proposal).
- Per-theme redesign of any component beyond colour adaptation.
- Resolving the duplicate favicon source, unless trivial while already in the file.

## Decisions

### Use `next-themes` rather than hand-rolling

`next-themes` is the shadcn-documented path. It injects the pre-paint script that
sets the `.dark` class before first paint (no FOUC), handles `prefers-color-scheme`
detection, localStorage persistence, and cross-tab sync — all in a tiny package.
Hand-rolling would mean re-implementing the inline pre-paint script and a system
media listener for no benefit.

Provider config: `attribute="class"`, `defaultTheme="system"`, `enableSystem`,
and `disableTransitionOnChange` (avoids a colour-transition smear when flipping).
`<html>` gets `suppressHydrationWarning` because the injected script mutates its
class before React hydrates.

**Alternative considered:** a CSS-only `prefers-color-scheme` media query with no
toggle. Rejected — the user wants an explicit switch, and media-only can't be
overridden by the visitor.

### Dual-icon CSS toggle, no `mounted` gate

The button renders **both** `Sun` and `Moon` from lucide-react, stacked, and uses
`dark:` variants to cross-fade/rotate which is visible (the canonical shadcn
`ModeToggle` move, minus the dropdown). Because visibility is driven by the
`.dark` class via CSS — not by reading `theme` during render — there is no
server/client text mismatch, so no `mounted` flag is needed. The click handler
sets the explicit opposite of the currently-resolved theme:
`setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')`.

**Alternative considered:** render one icon chosen from `useTheme().theme`.
Rejected — `theme` is unknown on the server, forcing a `mounted` gate and a flash
of the wrong icon.

### Token-ise the two matrix colours

Add `--matrix-dot` and `--matrix-overlay` to both `:root` and `.dark`, and
reference them with `var()` inside the `@utility` blocks.

- `--matrix-dot`: keep `#525252` for light; pick a lighter grey for dark so the
  grid reads against the near-black background.
- `--matrix-overlay`: `#f8fafc` (near-white) for light → a near-dark value for
  dark, so the spotlight darkens the periphery instead of strobing white.

These flip with the `.dark` class pre-paint, so the background never flashes.

### Company logo plates get an explicit `bg-white`

`company-logo.tsx` currently has no background — the card is transparent and the
light page shows through. That breaks in dark mode for dark company marks. Giving
the plate `bg-white` (not `bg-card`/`bg-background`, which would go dark) keeps the
marks legible in both themes, matching the proposal's intent.

### Animated circular reveal via the View Transitions API

The toggle wraps `setTheme` in `document.startViewTransition`. The new view
(`::view-transition-new(root)`) is masked to a soft-edged radial circle whose radius
animates from 0 to cover the furthest viewport corner; the old view stays static
underneath, so the new theme is "revealed" with a feathered edge rather than
crossfaded or hard-clipped. The soft edge echoes the matrix hover spotlight's mask.
`flushSync` wraps the `setTheme` call inside the transition callback so next-themes'
class change lands in the captured snapshot (it otherwise applies in an effect,
after the snapshot).

**Why a registered `@property` drives it.** The obvious approaches don't work:
`clip-path: circle()` interpolates fine but has a hard edge that can't be feathered;
and animating the `mask-image` radial gradient directly (via WAAPI keyframes of two
gradient strings) does NOT interpolate — browsers treat `mask-image`/gradient
keyframes as discrete, so it holds the first frame then snaps. Only *registered*
custom properties interpolate. So the radius is a registered `@property --theme-reveal`
of `syntax: "<length>"`, the mask reads `var(--theme-reveal)` (recomputing each
frame), and a CSS `@keyframes` animation on `::view-transition-new(root)` animates
the property from `0` to the end radius.

The animation lives in CSS on the pseudo-element (not WAAPI) — a CSS animation on a
VT pseudo keeps the transition alive for its duration, and replaces the default root
crossfade. The dynamic inputs (origin `--theme-reveal-x/y`, end radius
`--theme-reveal-end`) are plain custom properties set on `documentElement` in JS
before `startViewTransition`; the pseudo inherits them. The mask's feather is a
constant 100px band (`#000 calc(var(--theme-reveal) - 100px)` → `transparent
var(--theme-reveal)`), and the end radius is `furthestCorner + 100px` so the solid
core still covers the corner once the feather is accounted for.

This was chosen over a global CSS colour transition, which had two problems here:
the matrix dot-grid lives in a `background-image` gradient (gradients don't
interpolate, so the dots would snap), and a global colour transition also slows
hover states. The View Transition snapshots and reveals the whole page uniformly,
dots included, and only on toggle.

`disableTransitionOnChange` stays on the provider — it governs CSS transitions, not
the WAAPI pseudo-element animation, and keeping it prevents stray per-element
transitions from doubling up during the swap.

**Fallbacks:** if `document.startViewTransition` is unavailable (e.g. Firefox) or
`prefers-reduced-motion: reduce` is set, the toggle calls `setTheme` directly for an
instant switch.

### Where the provider and toggle logic live

Following bulletproof-react, app-wide providers live in the **app layer**:
`src/app/provider.tsx` exports an `AppProvider` (`'use client'`) that composes the
application's providers (currently just next-themes) and is rendered inside
`layout.tsx`'s `<body>` around the existing tree. `layout.tsx` stays a server
component. (This is a correction — providers are not reusable layout components, so
they do not belong under `components/layout/`.)

The toggle button
(`src/components/navigation/footer/theme-toggle-button.tsx`, beside
`scroll-to-top-button.tsx`) is purely presentational. The toggle behaviour —
reading the theme, the View Transition reveal, the reduced-motion / unsupported
fallback, and `flushSync` — lives in a `useThemeToggle` hook
(`src/hooks/use-theme-toggle/`), keeping DOM/animation logic out of the component.

## Risks / Trade-offs

- **`suppressHydrationWarning` omitted on `<html>`** → React logs a hydration
  warning for the class attribute. Mitigation: add it; it scopes only to that
  element's attributes.
- **Dot/overlay dark values chosen badly** → grid invisible or spotlight jarring.
  Mitigation: verify both themes in-browser, including the cursor-follow effect on
  a non-touch device.
- **`next-themes` peer range vs React 19** → install could warn. Mitigation:
  current `next-themes` supports React 19; confirm on install, pin if needed.
- **Company plate `bg-white` looks like a bright patch in dark mode** → accepted
  trade-off; legibility of third-party marks wins, and it matches the user's
  explicit ask.

## Migration Plan

Additive and reversible. Light mode is unchanged; dark mode is opt-in via OS
preference or the toggle. Rollback = revert the change; no data or persisted state
needs cleanup (a stale localStorage key is harmless).

## Open Questions

None — first-visit default (`system`) and favicon (punted) are settled.
