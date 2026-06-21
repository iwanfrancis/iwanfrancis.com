## Context

`useLavaField` (in `src/components/layout/matrix-background/use-lava-field.ts`)
sizes everything from the matrix container's live dimensions:

- `measure()` reads `canvas.clientWidth/Height` into `cssW`/`cssH`, sizes the
  backing store, and sets the transform.
- `draw()` positions each blob at `cx = b.x * cssW`, `cy = b.y * cssH` and fills
  the scrim over `cssW × cssH`.
- A `ResizeObserver` on the canvas calls `measure()` on **every** size change.

Because the canvas is `height: 100%` of the container, any content reflow that
changes the container height (the Experience collapsibles animate height over
~200ms) updates `cssH`, so every blob's `cy` moves. Reproduced with drift frozen:
one expand = +656px page height and +330px shift of the blob-field centroid.

The two existing resize signals already distinguish the two cases we care about:
`window`'s `resize` event fires only when the **viewport** changes; the
`ResizeObserver` fires for **any** container size change, including content
reflow. Today both run the same `measure()`.

## Goals / Non-Goals

**Goals:**

- The blob field does not move when page content reflows (expand/collapse).
- The scrim still covers the whole page, including any newly revealed area.
- No regression to drift, fusion, soft edges, fade-in, theming, reduced-motion,
  visibility pausing, or scroll-with-content.

**Non-Goals:**

- Making blobs track content displacement exactly (a blob "below" an expansion
  riding down with the pushed content). Ambient backgrounds aren't expected to
  track layout 1:1; stability matters more than correspondence.
- Any change to scroll behaviour, the renderer, or the visual design.

## Decisions

### Decision 1: Anchor blob positions to a stable size; size the canvas to the live one

Split the two notions that are currently conflated:

- **Anchor dimensions** (`anchorW`/`anchorH`) — drive blob positions
  (`cx = b.x * anchorW`, `cy = b.y * anchorH`). Captured at mount and refreshed
  **only on a viewport resize**.
- **Live dimensions** (`cssW`/`cssH`) — drive the backing store and the scrim
  fill, so the effect always covers the full container. Updated on every resize.

When a collapsible toggles, `cssH` changes (backing store grows/shrinks, scrim
still covers) but `anchorH` is untouched, so the blobs stay put. If `anchorH <
cssH` (page grew), the extra strip is simply muted scrim with no blob — which is
unnoticeable for the small, transient height deltas a collapsible produces.

_Alternative considered:_ debounce/snapshot the height and re-spread after reflow
settles. Rejected — the field would still lurch once per toggle, just later.

_Alternative considered:_ ease `cssH` toward its target so blobs drift instead of
snap. Rejected — still couples the background to the toggle; we want it inert.

### Decision 2: Route resize signals by source

- `window` `resize` → refresh `anchorW`/`anchorH` (viewport genuinely changed, so
  re-distributing the field is correct) **and** re-measure the backing store.
- `ResizeObserver` (content reflow) → re-measure the backing store only; leave the
  anchor dimensions alone.

This uses the listeners already in place; no new plumbing.

### Decision 3: Redraw immediately after a backing-store resize

`measure()` sets `canvas.width`, which clears the canvas; today the redraw waits
for the next animation frame. After any resize, draw a frame right away so a
reflow can't surface an unmuted (cleared) frame. Cheap and defensive — the
flicker wasn't observed, but this removes the possibility.

## Risks / Trade-offs

- **A large, lasting expansion leaves the new strip blob-sparse** until the next
  viewport resize → mitigated: the scrim still mutes it, and collapsible deltas
  are small relative to the page. A viewport resize re-spreads the field.
- **Blobs no longer ride down with content pushed by an expansion** → intended
  (Non-Goals); an ambient field reading as inert is the desired behaviour.

## Open Questions

- None outstanding. Blob count/size/speed are unchanged; only the anchoring
  reference moves from live to captured height.
