## 1. Spike: does SVG goo look liquid?

- [x] 1.1 Build a throwaway SVG gooey-filter prototype: an `feGaussianBlur` +
  `feColorMatrix` alpha-threshold filter applied to a container of 3–5 blurred
  blob elements drifting via CSS `@keyframes`.
- [x] 1.2 Add the "liquid" tricks: per-blob out-of-phase `scaleX/scaleY` wobble,
  2–3 overlapping sub-circles per blob, and prime-number drift durations
  (e.g. 23s/31s/37s/41s).
- [x] 1.3 View it over the real dot grid in both light and dark themes; profile
  paint cost on a low-end CPU/GPU throttle in dev tools.
- [x] 1.4 **Decision gate:** judged by eye → **Canvas chosen**. SVG fused and
  drifted, but its hard threshold killed the feathered edge that sold the
  original spotlight, and a stretched SVG fights the "drift with the page"
  requirement. Verdict recorded in `design.md` (Decision 3 outcome). Proceed with
  section 3b.

## 2. Replace the cursor effect scaffolding

- [x] 2.1 In `matrix-background.tsx`, remove the `mousemove` listener,
  `useMountEffect` cursor logic, and the `isTouchScreen()` early-return.
  (Component is now a server component mounting a `LavaBackground` client island.)
- [x] 2.2 Remove the `bg-hover-effect-overlay` and `bg-hover-effect-mask`
  utilities from `src/globals.css` (keep `bg-matrix` and the `--matrix-*`
  tokens).
- [x] 2.3 Keep the component mounted once via `app/layout.tsx`; confirm the dot
  grid still renders with the cursor effect gone.

## 3a. SVG goo renderer (if the spike passed)

- [x] 3a.1 _Skipped — Canvas branch chosen at gate 1.4._
- [x] 3a.2 _Skipped — Canvas branch chosen at gate 1.4._
- [x] 3a.3 _Skipped — Canvas branch chosen at gate 1.4._

## 3b. Canvas metaball renderer (only if the spike failed)

- [x] 3b.1 Added the co-located `use-lava-field` hook (client) that drives a
  half-resolution `<canvas>` field of drifting blobs (`lava-background.tsx`).
- [x] 3b.2 The canvas lays a `--matrix-overlay` scrim over the dots and punches
  soft radial-gradient holes (`destination-out`) to reveal them; overlapping
  holes merge softly. Soft feathered edges used instead of a hard threshold, per
  feedback. Scrim colour read from the `--matrix-*` tokens via the canvas `color`.
- [x] 3b.3 Tuned blob count (7), radii, feather core, and drift speed by eye.

## 4. Accessibility & lifecycle

- [x] 4.1 Honour `prefers-reduced-motion: reduce`: the RAF loop is not started; a
  single static frame is drawn. Verified the frame is static (identical canvas
  pixels over time) with the dot grid still visible.
- [x] 4.2 Pause when the page is hidden: `start`/`stop` on `visibilitychange`
  cancels/restarts the RAF loop.
- [x] 4.3 Confirmed the effect runs on a touch / mobile viewport (no pointer
  dependency; the old `isTouchScreen()` gate is gone).

## 5. Theming

- [x] 5.1 Verified the dot grid and blobs read correctly in both light and dark
  themes, driven by the existing `--matrix-*` tokens (re-read on theme change via
  a `MutationObserver` on the `<html>` class).
- [x] 5.2 Confirmed the scrim lightens the periphery in light mode and darkens it
  in dark mode (the `oklch` dark `--matrix-overlay` renders correctly in canvas).

## 6. Spec sync, hygiene & verification

- [x] 6.1 `theme-switching` delta updated: "theme-aware surfaces" requirement (and
  dark-mode scenario) now describe the blob overlay, and the "circular reveal"
  analogy no longer references the cursor spotlight. (Added soft-edge and
  scroll-anchor requirements to the `matrix-background` spec.)
- [x] 6.2 `yarn lint` clean and `yarn build` green (a11y: dropped `aria-hidden`
  from the decorative canvas, which Biome treats as focusable).
- [x] 6.3 Manually verified against the `matrix-background` spec scenarios:
  ambient drift on a still page, soft-edged fusion, no pointer reaction,
  reduced-motion static frame, hidden-tab pause, scroll-anchoring, and both
  themes.
