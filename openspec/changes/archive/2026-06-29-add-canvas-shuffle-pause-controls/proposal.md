## Why

The /thingies canvas can be panned and zoomed, but a visitor can't rearrange the
tiles or stop the motion. Two small controls add play and control: a **shuffle**
button that reorders the blob's contents, and a **pause** toggle that holds all
motion still — which also gives reduced-motion visitors an honest, OS-aware
default and anyone a way to quieten the page.

## What Changes

- Add a **Shuffle** control that permutes which thingy occupies each cell of the
  existing blob: the blob keeps its exact shape and cells, only the seating is
  reshuffled. The move is instant (no glide — tiles cross the mount boundary, so a
  uniform animation isn't achievable). Initial placement stays deterministic;
  shuffle is a post-load user action only.
- Add a **Pause / Resume** toggle that freezes all tile animation **and** the lava
  background. Its initial state is seeded from `prefers-reduced-motion: reduce`, so
  a reduced-motion visitor lands paused. Under reduced motion the toggle is shown
  pressed and disabled (motion is already suppressed at a lower layer; the toggle
  is informational there).
- Generalise the existing `ZoomControls` into one canvas-controls cluster holding
  shuffle, pause, and the existing zoom in/out — keeping the current accessibility
  (labelled buttons, a press never starts a pan).
- Fold a global "paused" cause into the tile active/freeze signal, alongside the
  existing off-screen and tab-hidden causes, so one signal stops both the CSS and
  the JS-loop tiles.
- Ensure a tile frozen **because of pause** (on-screen) stays visible: pausing must
  not leave a tile that mounts while paused stuck at opacity 0 (the off-screen
  freeze deliberately holds the mount fade at 0; pause must not).
- Let the shared lava background accept an external "paused" input so the canvas
  can stop its drift; it defaults un-paused, leaving the landing page unaffected.

## Capabilities

### New Capabilities

_None — this extends existing canvas, runtime, and background behaviour._

### Modified Capabilities

- `thingies-canvas`: adds the shuffle and pause controls and their behaviour; the
  controls cluster; and the rule that a pause-frozen on-screen tile stays visible.
- `thingies-runtime`: the active-state primitive folds in a third pause cause
  (global pause) so JS-loop tiles stop and resume with the toggle.
- `matrix-background`: the background accepts an external pause input that suspends
  its drift like tab-hidden does, defaulting un-paused.

## Impact

- **Code**
  - `src/features/thingies/components/zoom-controls.tsx` → a generalised canvas
    controls component (shuffle, pause, zoom).
  - `src/features/thingies/components/thingy-canvas.tsx` — owns `paused` state
    (seeded from reduced-motion) and promotes the tile layout from `useMemo` to
    state so shuffle can re-derive it; folds `paused` into each tile's `frozen`.
  - `src/features/thingies/hooks/use-thingy-active.tsx` — fold global pause into
    the active signal.
  - `src/features/thingies/components/thingy-frame.tsx` — render a pause-frozen
    on-screen tile at full opacity (no stuck fade).
  - A small permutation util alongside `src/features/thingies/utils/place-tiles.ts`
    for the seat shuffle.
  - `src/components/layout/matrix-background/*` — accept an external pause input.
- **Dependencies**: none. New `lucide-react` icons only (`Shuffle`, `Pause`,
  `Play`).
- **Risk**: no SSR/hydration risk — shuffle is a client-only action and the
  reduced-motion seed is read in a mount effect (the established `tabHidden`
  pattern), so first paint stays deterministic.
