## 1. Geometry constants

- [x] 1.1 In `src/features/thingies/constants.ts`, set `GUTTER = 0` (so `PITCH` becomes `TILE_SIZE` = 100, a whole 5× the 20px dot pitch) and update its doc comment to say tiles sit flush so no dots show between them.
- [x] 1.2 Add `TILE_PADDING`, derived from `TILE_SIZE` (e.g. `Math.round(TILE_SIZE * 0.1)`), with a comment noting it is the per-tile safe-area inset that gives `2 × TILE_PADDING` breathing room between flush tiles.
- [x] 1.3 Add `BLEED` (≈1px, ≤ `TILE_PADDING`) with a comment that it is the opaque outset that hides sub-pixel hairlines between flush tiles at fractional zoom.
- [x] 1.4 Grep for all uses of `GUTTER` and `PITCH` across the thingies feature and confirm none assumed a non-zero gutter (centre calc, windowing bands stay correct).

## 2. Frame rendering

- [x] 2.1 In `src/features/thingies/components/thingy-frame.tsx`, apply `TILE_PADDING` to the content wrapper (the `h-full w-full` div) so content is inset on all sides; rely on Tailwind's `border-box` default so the frame size is unchanged.
- [x] 2.2 Add the opaque outset ring to the frame box via `box-shadow: 0 0 0 ${BLEED}px var(--background)` (or equivalent token), so adjacent flush tiles never reveal a sliver of the matrix. Keep the content box and clip region unchanged.

## 3. Documentation

- [x] 3.1 In `src/features/thingies/thingies/README.md`, add a short note that the frame insets every tile by a uniform safe area and that tiles should not rely on bleeding to the very cell edge.

## 4. Verification

- [x] 4.1 Run `yarn lint` and fix any Biome issues.
- [x] 4.2 In-browser on `/thingies`: confirm no dot matrix shows between tiles (interior of the blob is solid), dots still frame the blob's outer edge and concavities, and adjacent tiles have visible breathing room.
- [x] 4.3 Zoom across the full range (`MIN_SCALE` 0.4 → `MAX_SCALE` 3) and pan: confirm no sub-pixel sliver of the matrix appears between tiles at any zoom; nudge `BLEED` / `TILE_PADDING` if needed.
- [x] 4.4 Check both light and dark themes, and that tiles remain matrix-aligned (tile edges line up with the dot grid across the blob, not just the first tile).
