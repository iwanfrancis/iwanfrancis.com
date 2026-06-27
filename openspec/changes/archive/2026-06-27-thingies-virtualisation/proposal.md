## Why

The `/thingies` canvas mounts **every** tile in the list, all the time — each one
is a code-split chunk that, once loaded, keeps its CSS animations running whether
or not it's on screen. With a handful of seed tiles that's fine, but the page is
designed to grow indefinitely. As the blob fills out, an unbounded number of
off-screen tiles will keep downloading, painting, and animating, dragging down
memory and frame rate during a pan. Change 1 deliberately built each tile as a
lazy boundary so this could be added later as a pure layer on top — now is when
it starts to earn its keep.

## What Changes

- **Mount-windowing (virtualise):** only tiles whose cell intersects the visible
  world rect (plus a margin band) are rendered. Panning a tile out of the band
  unmounts it, freeing its DOM, chunk instance, and animations; panning back
  remounts it. The window is **scale-aware** — the visible world rect is
  `viewport ÷ scale`, so zooming out widens it and mounts more tiles.
- **Pause-before-unmount:** a tile that has left the visible viewport but is still
  within the margin band freezes its animation (rather than animating unseen),
  and only fully unmounts once it leaves the band. This keeps a settled view's
  off-screen work near zero while avoiding a teardown stutter the instant a tile
  crosses the edge during a fast pan.
- **Viewport signal from the pan/zoom engine:** the imperative pan/zoom engine
  (which writes transforms straight to the DOM at 60fps) gains a throttled,
  change-only notification of the current offset/scale so React can recompute the
  mounted set without re-rendering every frame.
- **No change to the tile contract or authoring.** Tiles remain "a thing that
  draws in a square"; the frame handles freezing/unmounting generically.

## Capabilities

### New Capabilities

None. This is the scale half of the existing `thingies-canvas` capability.

### Modified Capabilities

- `thingies-canvas`: adds requirements that off-screen tiles are not mounted
  (bounded by the viewport and zoom level, not the tile count) and that tiles
  leaving the viewport pause before unmounting. The existing pan/zoom, placement,
  lazy-load, and error-isolation requirements are unchanged.

## Impact

- **Code:** `src/features/thingies/components/thingy-canvas.tsx` (compute and
  render only the visible subset), `src/features/thingies/hooks/use-pan-zoom.ts`
  (expose a throttled offset/scale subscription), `thingy-frame.tsx` (accept a
  frozen/active state and apply the generic pause), and
  `src/features/thingies/constants.ts` (margin-band tunables). A small
  visibility-maths helper alongside `place-tiles.ts`.
- **Dependencies:** none added — windowing over a known lattice is cheap to DIY,
  consistent with the page's lean-deps stance.
- **Behaviour:** purely a performance/perception change; the page looks and pans
  identically with a few tiles. No API, route, or styling changes.
- **Forward-compatible with authoring (Change 3):** unaffected — the registry and
  tile contract are untouched.
