## Why

When zoomed in on the /thingies canvas, an outer tile can only be pushed to the
edge of the screen — never brought to the centre. The pan clamp is grounded on
"keep the content edge at the viewport edge", which stops the pan half a screen
short of what's needed to centre an edge tile. Visitors who zoom in to inspect a
tile on the rim of the blob can't get it under the middle of the viewport.

## What Changes

- Re-ground the pan clamp so the limit is **"the outermost tile's centre can
  reach the viewport centre"** rather than "the content edge reaches the viewport
  edge". Every tile becomes individually centrable at any zoom level.
- Apply the rule **uniformly at all zoom levels** — not gated on whether the
  scaled content overflows the viewport. One predictable rule: any tile is always
  centrable, plus the existing overscroll margin past that point.
- **BREAKING (behavioural, not API):** a zoomed-out blob that fits the viewport
  can now be panned until its edge tile is centred, so up to half the blob may
  leave the screen into the ambient background. Today such a blob is held
  near-centred with only the margin of give.

The clamp stays strictly more permissive than today for any viewport wider than a
single scaled tile; a `max()` against the old overlap bound keeps it robust on
sub-tile-width viewports.

## Capabilities

### New Capabilities

_None._

### Modified Capabilities

- `thingies-canvas`: the pan-bounding requirements change. "Panning is bounded to
  the tiles" and "Panning bounds adapt to the zoom level" are re-grounded from
  "content edge → viewport edge" to "any tile → viewport centre", applied
  uniformly across zoom levels.

## Impact

- **Code:** `clampOffset` in
  [use-pan-zoom.ts](src/features/thingies/hooks/use-pan-zoom.ts) — the `maxX` /
  `maxY` computation. Reads `TILE_SIZE` from
  [constants.ts](src/features/thingies/constants.ts) (already exported).
- **No secondary breakage:** the 40000px dot field still covers the viewport at
  any reachable offset, and the visible-band windowing simply mounts different
  tiles as the visitor pans further — no dependency on the old bound.
- **No API change:** `usePanZoom`'s signature and the `EDGE_MARGIN` constant are
  unchanged; only the clamp arithmetic changes.
