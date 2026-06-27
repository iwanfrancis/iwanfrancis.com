## 1. Tunables

- [x] 1.1 Add `ACTIVE_MARGIN` and `MOUNT_MARGIN` (world px) to `constants.ts`, with
  doc comments noting they're felt-out in-browser like `JITTER`/zoom tunables.
  Start ~half a tile (ACTIVE) and a few tiles (MOUNT), `MOUNT_MARGIN > ACTIVE_MARGIN`.

## 2. Visibility maths (pure helper)

- [x] 2.1 Add `src/features/thingies/utils/visible-band.ts` — a pure function that
  takes `{ vw, vh, offsetX, offsetY, scale }`, the tile rects (`left`, `top`,
  `TILE_SIZE`), and the two margins, and returns for each tile index whether it is
  in the MOUNT band and whether it is ACTIVE.
- [x] 2.2 Implement the screen→layer-local inverse (`local = (screen − centre −
  offset) / scale`) to derive the visible world rect, then intersect each tile rect
  expanded by the band margin. Margins are in world/layer-local px (constant across
  zoom).
- [x] 2.3 Return a cheap integer band key (e.g. min/max visible col & row) so the
  caller can detect band changes without diffing tile lists.

## 3. Engine viewport notification

- [x] 3.1 Add an optional `onViewport` to `usePanZoom`'s options; store it in a ref
  (like `layoutRef`) so the once-bound listeners and rAF loops see the live one.
- [x] 3.2 Add `scheduleViewportNotify()` that coalesces to one `requestAnimationFrame`
  per frame and calls `onViewport({ offsetX, offsetY, scale, vw, vh })` with the
  live engine state and container size.
- [x] 3.3 Call `scheduleViewportNotify()` from every transform path (drag, wheel
  pan/zoom, pinch, fling step, zoom-animation step, resize) and once after the
  initial `applyTransform()`. Cancel the pending rAF in the effect cleanup.

## 4. Windowing in the canvas

- [x] 4.1 In `ThingyCanvas`, hold a small state for the current visible band; pass
  `onViewport` into `usePanZoom`. In the handler, compute the band via the helper
  and `setState` only when the integer band key changes.
- [x] 4.2 Compute an initial band on mount from the measured container rect at
  offset 0 / scale 1 (fall back to a central band before measurement), so the first
  paint mounts the right tiles with no layout shift.
- [x] 4.3 Render only tiles in the MOUNT band (`tiles.filter(inMountBand)`), passing
  each a `frozen` prop (`true` when in MOUNT but not ACTIVE). Keep `key={entry.id}`
  so remounting a tile restores it to the same cell.

## 5. Frame freeze

- [x] 5.1 Add a `frozen?: boolean` prop to `ThingyFrame`; apply a `thingy-frozen`
  class to the tile when frozen (leave layout/position untouched).
- [x] 5.2 Add the freeze rule to `globals.css`:
  `.thingy-frozen, .thingy-frozen * { animation-play-state: paused !important; }`.

## 6. Verify

- [x] 6.1 Temporarily pad the registry with many tiles; confirm only viewport-area
  tiles are in the DOM, the mounted count tracks viewport×zoom (not list length),
  and panning/zooming mounts/unmounts correctly. Remove the padding after.
- [x] 6.2 Confirm off-screen (frozen, in-band) tiles stop animating and resume on
  re-entry without a teardown; confirm zooming out mounts more tiles and zooming in
  fewer; confirm a remounted tile reappears in the same cell with no reflow.
- [x] 6.3 Confirm `prefers-reduced-motion` still behaves correctly and the page
  pans as smoothly as before (no per-frame React re-renders during a drag).
- [x] 6.4 Run `yarn lint` clean.
