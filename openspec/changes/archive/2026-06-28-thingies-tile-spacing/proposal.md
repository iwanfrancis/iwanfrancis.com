## Why

Two related visual flaws sit on the `/thingies` canvas, both caused by the same
2px inter-tile gutter:

1. Tile contents reach right to the frame edge, so neighbouring tiles read as
   squashed together with no breathing room.
2. A thin sliver of the background dot-matrix shows through the gutter between
   tiles. Worse, the gutter makes the lattice pitch `102px` — not a multiple of
   the 20px dot pitch — so every tile after the first drifts out of alignment
   with the dots, and the revealed sliver looks ragged rather than clean.

The original design treated that seam as a feature ("the dot grid shows as a thin
seam"). On the live canvas it reads as a defect. We want tiles to sit flush and
matrix-aligned, with their *contents* given consistent breathing room from inside
the frame instead.

## What Changes

- **Remove the inter-tile gutter** so adjacent tile frames sit flush. The dot
  matrix will no longer show *between* tiles — only around the outer edge of the
  blob (and in genuine concavities of its perimeter), which is the wanted effect.
- **Restore full matrix alignment.** With no gutter the lattice pitch becomes
  `100px` (a whole 5× the 20px dot pitch), so every tile — not just the first —
  lands exactly on the dot grid.
- **Add a uniform inner padding (a "safe area") to every tile frame**, so tile
  content never touches the frame edge and adjacent tiles always have a guaranteed
  minimum of breathing room. Applied once in the frame, so existing tiles get it
  for free with no per-tile edits.
- **Guard against sub-pixel hairline slivers** at fractional zoom, so the dot grid
  cannot peek through the join between two flush tiles at any zoom level. (The
  *how* — a small frame bleed/overlap — is in design.md.)
- Document the safe-area inset in the canonical tile-contract README so authors
  know the frame insets their drawing and they should not rely on full-bleed.

## Capabilities

### New Capabilities

(None — this refines existing canvas behaviour.)

### Modified Capabilities

- `thingies-canvas`: reverse the "seam reveals the dot grid between tiles"
  guarantee (now: no dot grid between adjacent tiles); strengthen the
  lattice-alignment guarantee so the *pitch*, not just the tile size, is a
  multiple of the dot pitch; add a requirement that every tile has a uniform
  inner padding so contents never sit squashed against the frame edge or each
  other.

## Impact

- **Code**: `src/features/thingies/constants.ts` (`GUTTER` → 0; new
  `TILE_PADDING`, optional `BLEED`), `src/features/thingies/components/thingy-frame.tsx`
  (frame sizing + content padding).
- **Docs**: `src/features/thingies/thingies/README.md` (note the safe-area inset).
- **Behaviour**: purely visual — placement, pan, zoom, and windowing are
  unchanged. No API or dependency changes.
- **Visual side-effect**: any tile currently drawn full-bleed to the frame edge
  will gain a uniform background-coloured margin. This is the intended, consistent
  look; no tile needs editing.
