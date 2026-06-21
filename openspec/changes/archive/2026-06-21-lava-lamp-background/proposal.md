## Why

The dot-matrix background's single cursor-follow spotlight is well-liked, but it
sits still whenever the mouse does and is disabled entirely on touch devices, so
most mobile visitors never see it. Replacing it with an ambient "lava lamp" —
gently drifting blobs of contrast that fuse like liquid and move on their own —
makes the background feel alive on every device, with no pointer required.

## What Changes

- Replace the single cursor-follow reveal with **multiple autonomous blobs of
  contrast** that drift continuously across the dot matrix.
- Blobs **fuse like liquid** — surface-tension "necking" as they meet and pull
  apart (a metaball / gooey-merge look), not independent floating discs.
- The effect becomes **ambient**: it runs with no pointer input, so it is enabled
  on touch / mobile, where the cursor effect was previously switched off.
- **BREAKING (interaction):** the mouse-follow spotlight is removed in this
  version. Mouse interaction (cursor warping the blob field) is deferred to a
  later change.
- Respect `prefers-reduced-motion`: the drift freezes / is disabled for visitors
  who ask for reduced motion.
- Pause the animation while the tab is hidden, to spare battery.
- Keep dark-mode behaviour driven by the existing `--matrix-*` design tokens.
- The renderer is a swappable internal detail: ship the lighter SVG gooey-filter
  approach if it reads as genuinely liquid; otherwise fall back to a Canvas 2D
  metaball renderer. The observable behaviour is identical either way (see
  design.md).

## Capabilities

### New Capabilities

- `matrix-background`: the animated dot-matrix background — its ambient,
  continuously drifting, liquid-fusing blobs of contrast, the devices it runs on,
  and its motion / accessibility behaviour. This behaviour was previously
  unspecified in OpenSpec (only its dark-mode theming was captured under
  `theme-switching`); this change specifies it.

### Modified Capabilities

- `theme-switching`: two requirements name the *cursor-follow spotlight*, which
  this change removes. Update the "theme-aware surfaces" requirement (and its
  dark-mode scenario) to describe the ambient blob overlay instead, and reword the
  "circular reveal" requirement's analogy so it no longer references the spotlight.
  The matrix dot-grid colour requirement is unchanged.

## Impact

- **`src/components/layout/matrix-background/matrix-background.tsx`** — rewritten:
  drops the `mousemove` handler and `isTouchScreen()` early-return; renders the
  drifting-blob layer instead.
- **`src/globals.css`** — the `bg-hover-effect-overlay` / `bg-hover-effect-mask`
  utilities are replaced by the blob / gooey-shape styles and drift keyframes;
  `bg-matrix` and the `--matrix-*` tokens stay (a blob/scrim token may be added).
- A new RAF hook under the feature may be introduced **only if** the Canvas
  fallback is taken; the SVG path needs no JS animation loop.
- `src/utils/device.ts` `isTouchScreen()` is no longer referenced by this
  component (it may still be used elsewhere).
- No new runtime dependencies expected (SVG filter + CSS, or a hand-rolled
  Canvas).
- `openspec/specs/theme-switching/spec.md` text is updated via the delta above.
