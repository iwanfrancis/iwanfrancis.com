## Why

The `/thingies` canvas pans but cannot zoom. In practice, the moment dragging
works, the instinct to pinch/zoom kicks in — the surface reads as a Miro-style
infinite canvas, and a canvas you can pan but not zoom feels broken. Zoom also
unlocks both ends of the art: framing the whole amoeba blob (zoom out) and
looking closely at a single tile (zoom in).

## What Changes

- Add zoom in/out to the `/thingies` surface, layered on top of the existing pan.
- **Gesture mapping (Miro feel):** mouse wheel → zoom; trackpad two-finger swipe
  → pan; trackpad pinch → zoom; touch pinch → zoom; drag (mouse/touch) → pan
  (unchanged). Distinguishing a mouse wheel from a trackpad swipe is the reason a
  gesture library is introduced (see Impact).
- **Zoom is anchored to a focal point** — the cursor for wheel, the gesture
  midpoint for pinch — so content under the pointer stays put as scale changes.
- **Accessibility:** on-screen +/− controls plus keyboard zoom, so the surface is
  not gesture-only. Animated (button/keyboard) zoom respects
  `prefers-reduced-motion`; direct wheel/pinch zoom is instant.
- **Transform refactor:** the dot and tile layers gain a shared anchor and
  explicit transform-origin so a single `translate … scale …` transform scales
  them as one (today's shared `translate3d` string only holds together for pure
  translation).
- **Bounds become zoom-aware:** the pan clamp scales with the current zoom, and
  when the blob is smaller than the viewport it centres rather than drifting.
- Existing pan, inertia/fling, dot-panning, and "tiles read as pinned to one
  surface" behaviour are preserved.

## Capabilities

### New Capabilities

(none — zoom is part of the existing canvas surface, not a new capability.)

### Modified Capabilities

- `thingies-canvas`: the "surface is roamed by dragging" requirement currently
  states the page SHALL support panning only and SHALL NOT zoom — this is
  replaced to allow zoom. New requirements are added for the gesture mapping,
  focal-point zoom, zoom-aware bounds, accessible zoom controls, and the
  dots-and-tiles-scale-together behaviour.

## Impact

- **Code:** `src/features/thingies/components/thingy-canvas.tsx` (the pan
  controller — extended with scale state, focal-point maths, zoom-aware clamp,
  and the layer anchor/origin refactor); `src/features/thingies/constants.ts`
  (zoom range + sensitivity constants); a new small zoom-controls component for
  the +/− buttons.
- **Dependency:** adds `@use-gesture/react` — the first gesture library on a
  deliberately dep-lean site. Its verified value here is **robust cross-device
  pinch recognition** (touch pinch and trackpad pinch, the latter via ctrl+wheel)
  plus unified pointer drag with velocity — the fiddly, edge-case-laden parts,
  especially on mobile (iOS Safari). Note it does **not** classify a mouse wheel
  versus a trackpad two-finger swipe; both arrive as plain `wheel` events and that
  split is hand-rolled in the wheel handler either way (no clean browser API
  exists). It is used standalone (no react-spring) — it supplies normalised
  gesture deltas/velocity/origin only; the inertia loop, clamp, focal-point maths,
  and the wheel mouse-vs-trackpad heuristic stay hand-rolled. The dep is
  route-isolated by Next App Router code-splitting (it ships only in the
  `/thingies` route chunk, which is currently unlinked so it is not even
  prefetched), so it never reaches the landing-page entry.
- **Spec:** `openspec/specs/thingies-canvas/spec.md` (one requirement replaced,
  several added on archive).
- **Deferred / out of scope:** a within-route progressive-enhancement lazy-load
  of `@use-gesture`; hard-specified zoom range (left as an in-browser tuning
  note); and any virtualisation work (the future virtualisation change must make
  its viewport-intersection test scale-aware — flagged there, not here).
