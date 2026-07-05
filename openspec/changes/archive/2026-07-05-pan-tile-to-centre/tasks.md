## 1. Re-ground the pan clamp

- [x] 1.1 In [use-pan-zoom.ts](src/features/thingies/hooks/use-pan-zoom.ts), import `TILE_SIZE` from `../constants` alongside the existing imports.
- [x] 1.2 Rewrite the `maxX` / `maxY` computation in `clampOffset` to the Option A formula: per axis, `half = (content·scale)/2`, `keepOverlap = max(0, half − viewport/2)`, `centreTile = max(0, half − (TILE_SIZE·scale)/2)`, `max = max(keepOverlap, centreTile) + EDGE_MARGIN`. Keep the existing `clamp(offset, −max, max)` calls unchanged. (Extracted an `axisMax(content, viewport)` helper.)
- [x] 1.3 Confirm no other code paths reference the old bound arithmetic — `onDrag`, `flingStep`, wheel-pan, `onResize`, and `zoomTo` all funnel through `clampOffset`; no other bound arithmetic exists.

## 2. Verify behaviour

- [x] 2.1 `yarn lint` passes (Biome). Also ran `tsc --noEmit` — clean.
- [x] 2.2 Driven at MAX_SCALE (scale=3): panned to the rim, rightmost tile centre reached x=493 vs viewport centre 640 (centre + EDGE_MARGIN overscroll), not pinned near the edge.
- [x] 2.3 Verified in the content-fits-viewport case (contentW·scale 1200 < vw 1280): edge tile still centrable, offset bounded at −590 despite a 40000px pan input — not endless.
- [x] 2.4 At 500px (desktop min window width) the blob stays overlapping the viewport and clamps sensibly. The sub-300px `keepOverlap` floor is a defensive guard verified by formula + typecheck (a desktop window can't go below ~500px to drive it live).
- [x] 2.5 Resize re-clamp driven and clean; fling shares the identical `clampOffset` bound (see 1.3), so it settles within the same verified limit.
