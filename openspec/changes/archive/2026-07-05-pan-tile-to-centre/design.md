## Context

The /thingies surface pans via a single `translate(offset) scale(scale)` transform
on layers anchored at the container centre (`transform-origin: 0 0`). The blob is a
`contentW × contentH` bounding box centred on that anchor, so a tile at world-x
`wx` (relative to the blob centre) lands at `screenX = vw/2 + offset.x + wx·scale`.

`clampOffset` in [use-pan-zoom.ts](src/features/thingies/hooks/use-pan-zoom.ts)
currently bounds the pan with:

```
maxX = max(0, (contentW·scale − vw) / 2) + EDGE_MARGIN
```

That is grounded on **content edge → viewport edge**. Working the geometry: at
`offset.x = −(contentW·scale − vw)/2` the blob's right edge sits exactly at the
right viewport edge (`screenX = vw`). To *centre* the outermost tile you need
`offset.x = −(contentW − TILE_SIZE)/2·scale`, which is larger by roughly
`vw/2 − EDGE_MARGIN` — half a screen. So the clamp stops a half-screen short and an
edge tile can only ever be pushed to the screen edge.

## Goals / Non-Goals

**Goals:**

- Any tile — including one on the outer rim — can be brought to the viewport
  centre, at any zoom level.
- One predictable, uniform rule; no behaviour switch based on overflow.
- No API change to `usePanZoom`; no new constants.

**Non-Goals:**

- Reworking the transform model, fling, or focal-point zoom.
- Rubber-band / spring physics on the bound (the clamp is a hard clamp today; that
  stays).
- Programmatic "focus / fly to a tile" behaviour — this only widens the manual pan
  range.

## Decisions

**Re-ground the clamp on "outermost tile centre → viewport centre" (Option A).**

Per axis (X shown; Y is identical with `contentH`):

```
halfW        = (contentW · scale) / 2
keepOverlapX = max(0, halfW − vw / 2)                 // old overlap bound
centreTileX  = max(0, halfW − (TILE_SIZE · scale) / 2) // NEW: edge tile → centre
maxX         = max(keepOverlapX, centreTileX) + EDGE_MARGIN
```

- `TILE_SIZE` is already exported from
  [constants.ts](src/features/thingies/constants.ts) — no new constant needed.
- `centreTileX ≥ keepOverlapX` whenever `vw > TILE_SIZE·scale` (≤ 300px at
  `MAX_SCALE`), so this is strictly more permissive than today on any normal
  viewport. The `max()` is a floor that preserves the old overlap guarantee on
  sub-tile-width viewports.
- At the natural limit (before `EDGE_MARGIN`) the outermost tile parks exactly at
  the viewport centre — a meaningful, satisfying stop point. `EDGE_MARGIN` then
  supplies the usual overscroll past it.

**Why tile-aware over the simpler `halfW + EDGE_MARGIN` (Option B).** Option B
grounds on the bounding-box *edge* reaching centre, letting the outer tile drift
~½ tile past centre. Subtracting `TILE_SIZE·scale/2` makes the resting stop the
tile's *centre*, which reads as intentional rather than approximate. The extra term
is one cheap subtraction.

**Apply uniformly, not gated on overflow.** The alternative — keep today's "small
blob stays centred" and only loosen when content overflows — adds a special case
for a case the user never complained about, and "any tile is always centrable" is
simpler to reason about. The ambient background makes a half-off blob read like
panning a map, not a bug.

## Risks / Trade-offs

- **[Zoomed-out blob can be pushed half off-screen]** → Intended under the uniform
  rule. At most half the blob leaves view at the per-axis limit, so it never
  disappears; the void invariant still holds.
- **[Windowing mounts tiles further out as pan range grows]** → No new risk: the
  visible-band logic already mounts by viewport intersection and the 40000px dot
  field covers any reachable offset. Larger pans simply mount a different tile set.
- **[Fling can now coast to the looser bound]** → Desirable; the fling path calls
  the same `clampOffset`, so it settles at the new limit with no extra work.

## Migration Plan

Single-function edit to `clampOffset`; no data, config, or API migration. Rollback
is reverting the one function. Verify by zooming to `MAX_SCALE` and panning an
outer-rim tile to the viewport centre on both a wide viewport and a narrow one.

## Open Questions

None. `EDGE_MARGIN` (140px) is retained as-is — it reads as a sensible overscroll
past the centred-tile stop.
