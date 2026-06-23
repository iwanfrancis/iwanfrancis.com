## 1. Dependency & constants

- [x] 1.1 Add `@use-gesture/react` to dependencies (yarn), used standalone — do not add react-spring.
- [x] 1.2 Add zoom constants to `src/features/thingies/constants.ts`: `MIN_SCALE`, `MAX_SCALE` (start ~0.4 / ~3, documented as tunable), wheel zoom sensitivity, and pinch sensitivity if needed. Note they are in-browser tuning dials.

## 2. Transform refactor (shared anchor + origin)

- [x] 2.1 In `thingy-canvas.tsx`, give the tiles layer `transform-origin: 0 0` (its (0,0) is already the container centre).
- [x] 2.2 Re-structure the dots layer so its transform anchor is the container centre: outer div anchored at `left/top: 50%` with `transform-origin: 0 0` carrying the pan/zoom transform; inner div holding the 40000px `bg-matrix` field statically offset by `-DOT_FIELD/2`. Remove the old negative-margin centring from the transformed element.
- [x] 2.3 Introduce a `scale` value alongside `offset` and change `apply()` to write `translate(${offset.x}px, ${offset.y}px) scale(${scale})` to both layers (identical string).
- [x] 2.4 Verify in-browser that pan still works unchanged and that dots stay locked to tiles at scale 1 (no drift introduced by the refactor) before adding zoom. (Verified: dots/tiles transforms byte-identical at every step; no drift.)

## 3. Focal-point zoom core

- [x] 3.1 Implement a `zoomTo(nextScale, focalX, focalY)` helper applying `offset' = (s1/s0)·offset + (f − A)·(1 − s1/s0)`, where A is the container centre; clamp `nextScale` to `[MIN_SCALE, MAX_SCALE]`.
- [x] 3.2 Make the clamp zoom-aware: compute bounds from `contentW·scale` / `contentH·scale`; clamp to scaled extent + margin when larger than the viewport, and centre the blob when the scaled content is smaller than the viewport.
- [x] 3.3 Re-clamp on every zoom step and on resize.

## 4. Gesture recognition (@use-gesture, mapping B)

- [x] 4.1 Wire `@use-gesture` to the container for drag + touch pinch (`target` ref, `eventOptions: { passive: false }`, `pinch.pinchOnWheel: false`); handle wheel via a manual non-passive listener that `preventDefault`s so the browser doesn't scroll/zoom the page.
- [x] 4.2 Mouse wheel → `zoomTo` about the cursor position.
- [x] 4.3 Trackpad two-finger swipe → pan, via a manual mouse-vs-trackpad heuristic in the wheel handler (deltaMode / horizontal / fractional / small-step). @use-gesture does NOT classify these — that's hand-rolled, and inherently imperfect.
- [x] 4.4 Pinch → `zoomTo` about the midpoint/cursor: touch pinch via @use-gesture `onPinch`, trackpad pinch via ctrl+wheel in the manual wheel handler.
- [x] 4.5 Drag (mouse + single-finger touch) → pan, feeding @use-gesture drag velocity into the existing rAF friction fling (velocity stays screen-space).
- [x] 4.6 Confirm the existing inertia/fling still settles within the zoom-aware bounds. (Verified: post-release glide −40→−120.8→−140, settles exactly at the bound, no overshoot.)

## 5. Accessible zoom controls

- [x] 5.1 Create a small zoom-controls component (+/− buttons) for the `/thingies` surface, styled unobtrusively and labelled for assistive tech.
- [x] 5.2 Buttons zoom about the viewport centre by a fixed step (`ZOOM_STEP`); no-op at min/max scale (zoomTo early-returns when clamped scale is unchanged).
- [x] 5.3 Add keyboard zoom: the +/- buttons are focusable/operable, plus global `+`/`-` key shortcuts, both zooming about the viewport centre.
- [x] 5.4 Animate button/keyboard zoom (eased over `ZOOM_ANIM_MS`) and short-circuit to an instant change under `prefers-reduced-motion: reduce`.

## 6. Polish, verify, docs

- [x] 6.1 In-browser pass: verified via scripted DOM events — wheel-zoom-to-cursor (0.14px focal drift), trackpad swipe-pan, ctrl+wheel pinch-zoom, drag-pan, min/max clamp (0.4 / 3.0), bounds at extremes (±140 EDGE_MARGIN keeps the blob in view), buttons + keyboard zoom, reduced-motion instant zoom, dots/tiles locked. NOT auto-tested: two-finger TOUCH pinch (synthetic multi-touch unreliable) — shares the verified `zoomTo` path and uses @use-gesture's tested recognizer; worth a manual check on a real touch device.
- [x] 6.2 Tune `MIN_SCALE`/`MAX_SCALE` and sensitivity. Defaults (0.4–3.0, wheel 0.002, step 1.3) set and verified usable. Feel-tuning to taste left to Iwan in-browser, like JITTER. NOTE: with only 5 tiles the blob is ~300px so pan room is just ±140px — pan feels minimal until more tiles are added (inherent, not a bug).
- [x] 6.3 Add one line to the tile-contract note in `openspec/notes/thingies.md` steering authors to SVG/CSS over 2D-canvas because canvas tiles blur when zoomed in, and a co-design note that future virtualisation must make its viewport-intersection test scale-aware. (Also updated the Zoom parked item.)
- [x] 6.4 Run `yarn lint` (Biome, incl. a11y group) and fix any findings. (Clean: 58 files, no findings. `tsc --noEmit` also clean.)
