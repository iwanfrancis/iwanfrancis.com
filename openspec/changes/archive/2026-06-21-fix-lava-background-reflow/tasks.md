## 1. Decouple blob anchoring from live height

- [x] 1.1 In `use-lava-field.ts`, add stable anchor dimensions (`anchorW` /
  `anchorH`) alongside the live `cssW` / `cssH`, plus a `reAnchor()` that
  snapshots the live size. Initialise at mount.
- [x] 1.2 In `draw()`, position blobs from the anchor dimensions
  (`cx = b.x * anchorW`, `cy = b.y * anchorH`) while keeping the scrim fill and
  backing store on the live `cssW` / `cssH`, so the effect still covers the whole
  container.

## 2. Route resize signals by source

- [x] 2.1 `window` `resize` handler: `reAnchor()` to the current size (viewport
  changed → re-distribute) and re-measure the backing store.
- [x] 2.2 `ResizeObserver` (content reflow): re-measure the backing store only —
  does **not** touch the anchor dimensions, so collapsible toggles leave the
  field in place.
- [x] 2.3 Redraw immediately after any resize (`draw(lastTime)`) so a reflow
  can't surface an unmuted (cleared) frame.

## 3. Verify

- [x] 3.1 Expanded an Experience "see more" (drift frozen): the page grew 656px
  but the hero-band blob content was byte-identical before/after (0% change) —
  field stays put. The newly revealed strip reads as muted scrim (alpha 217),
  no gap. (Before the fix the field centroid shifted 330px.)
- [x] 3.2 No regression: continuous drift still runs, the load fade-in completes
  (opacity 1), dark theme renders, reduced-motion path unchanged.
- [x] 3.3 A genuine viewport resize re-measures the canvas and re-anchors the
  field (confirmed via an emulated viewport change).
- [x] 3.4 Run `yarn lint` and `yarn build`; fix any issues.
