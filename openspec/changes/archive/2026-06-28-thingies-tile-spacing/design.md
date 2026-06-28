## Context

The `/thingies` canvas places equal square tiles on an integer cell lattice over
a continuous dot-matrix field. Three constants in
`src/features/thingies/constants.ts` govern the geometry:

```
TILE_SIZE = 100   // tile edge, a multiple of the 20px dot pitch (5 cells)
GUTTER    = 2     // gap between adjacent tiles — currently reveals dots as a seam
PITCH     = 102   // TILE_SIZE + GUTTER — cell-to-cell distance
```

Each tile is a `TILE_SIZE` square with `overflow-hidden bg-background`
(`thingy-frame.tsx`), positioned at `col * PITCH, row * PITCH`. The opaque
`bg-background` hides the dot field beneath the tile body; the 2px gutter was a
deliberate "seam" that let the dots show between tiles.

Two problems result, both rooted in `GUTTER`:

- The seam reveals a sliver of dots between tiles — now read as a defect.
- `PITCH = 102` is **not** a multiple of the 20px dot pitch, so each successive
  tile is offset from the dot grid by 2px more than the last. Only the first tile
  is truly aligned; the rest drift, making the revealed sliver look ragged.

Separately, tile content fills the frame edge-to-edge (`h-full w-full`), so
neighbouring tiles look squashed with no breathing room.

## Goals / Non-Goals

**Goals:**

- No dot matrix visible *between* tiles, at any zoom level. Dots show only around
  the outer edge of the blob and in genuine perimeter concavities.
- Every tile aligned to the dot grid, not just the first — the lattice *pitch*
  becomes a whole multiple of the dot pitch.
- A guaranteed minimum breathing space between neighbouring tile contents, applied
  uniformly with no per-tile work.
- Keep tiles scale-independent: the new spacing must survive zoom and any future
  `TILE_SIZE` change.

**Non-Goals:**

- No change to tile placement, pan, zoom, windowing, or the freeze/mount logic.
- No change to the matrix dot pitch (stays 20px) or to how individual tiles are
  authored beyond a documentation note.
- Not introducing a per-tile opt-out for full-bleed art; the uniform safe area is
  the contract for now.

## Decisions

### Decision 1: Remove the gutter (flush tiles) rather than widen it

Set `GUTTER = 0`, making `PITCH = TILE_SIZE = 100` — exactly 5× the 20px dot
pitch. Adjacent frames sit flush; their opaque `bg-background` fills meet with no
gap, so no dots show between tiles, and every tile lands on the dot grid.

- **Why not a gutter that is a multiple of 20 (e.g. 20px)?** Any non-zero gap
  reveals whatever is behind it — i.e. dots. The requirement is *no* dots between
  tiles, so the gap must be zero. A gap can never both exist and hide the field.
- **Why not a single continuous backdrop rectangle behind the whole blob?** The
  blob is a ragged, non-rectangular region; covering exactly the occupied cells
  with one shape is more code than flush per-tile fills and buys nothing once
  tiles are flush.

The visual separation the gutter used to provide is replaced by *internal*
padding (Decision 2) — separating contents instead of frames keeps the dot field
covered.

### Decision 2: Uniform inner padding applied by the frame, proportional to tile size

Add a `TILE_PADDING` constant derived from `TILE_SIZE`
(`Math.round(TILE_SIZE * 0.1)` ≈ 10px) and apply it once on the frame's content
wrapper (`thingy-frame.tsx`), inside the `overflow-hidden` box. Tailwind's
`border-box` default means the padding shrinks the content area rather than
growing the frame.

- Because frames are flush, two adjacent tiles' contents are separated by
  `2 × TILE_PADDING` (≈ 20px, one dot cell) of `bg-background` — the breathing
  room.
- **Why in the frame, not per tile?** One change covers every existing and future
  tile, and guarantees the *minimum* the proposal asks for. Per-tile padding
  couldn't guarantee a floor and would need editing every tile.
- **Why proportional to `TILE_SIZE`?** The tile contract requires
  scale-independence. Deriving padding from `TILE_SIZE` keeps the inset
  proportional if the tile size ever changes; and because the whole layer is
  transformed, it scales correctly with zoom for free.
- Tiles author against `viewBox="0 0 100 100"` / `h-full w-full` as before — they
  simply fill the (now slightly smaller) content box. No tile code changes.

### Decision 3: Cover sub-pixel hairlines with an opaque outset ring

Flush frames at scale 1 with integer geometry leave no gap. But at fractional
zoom, two adjacent boxes can land on non-integer device pixels and anti-alias to
a faint 1px sliver of the field. To guarantee "no dots between tiles *at any
zoom*", paint an opaque ring just outside each frame's box using
`box-shadow: 0 0 0 BLEED var(--background)` (with `BLEED ≈ 1`, in layer-local px).

- The shadow is drawn outside the border box, is not clipped by the frame's own
  `overflow-hidden`, and does not affect layout, the content box, or clipping —
  so content geometry stays clean.
- It is the same opaque colour as the fill, so it is invisible except where it
  covers a would-be sliver; neighbouring rings overlap harmlessly.
- It lives inside the scaled transform, so it scales with zoom like everything
  else.
- **Why not grow the frame to `TILE_SIZE + BLEED`?** That shifts the content box
  and the clip region by the bleed; the box-shadow ring achieves the overlap with
  zero effect on content. **Why not device-pixel snapping?** Hard and brittle
  under a CSS `scale()` transform.

`BLEED` must stay ≤ `TILE_PADDING` so the ring never reaches drawn content; at
1px vs ~10px this holds comfortably.

### Decision 4: Document the safe area; do not change the authoring spec

Tiles still "fill their square" — the frame, not the tile, owns the inset — so the
`thingies-authoring` spec requirements do not change. Add a short note to the
canonical tile-contract README (`src/features/thingies/thingies/README.md`) so
authors know the frame insets their drawing by a uniform safe area and should not
rely on bleeding to the very cell edge.

## Risks / Trade-offs

- **Full-bleed tiles gain a margin.** Any tile currently drawn edge-to-edge (e.g.
  a colour-filling or snake-style tile) will show a uniform `bg-background` ring.
  → Accepted: this is the intended consistent look. If a future tile genuinely
  needs full-bleed, that is a separate, deliberate change.
- **Padding value is a feel decision.** ~10% is a starting point; like the other
  canvas tunables it should be felt out in-browser. → Single constant, trivial to
  adjust; no structural risk.
- **box-shadow rendering quirks across browsers.** A spread-only shadow is widely
  and reliably supported; risk is low. → If a browser ever mis-renders it, fall
  back to the `TILE_SIZE + BLEED` frame-outset alternative.
- **Other consumers of `GUTTER` / `PITCH`.** Changing `GUTTER` to 0 changes
  `PITCH` everywhere it is used (centre calc, windowing bands). → It is used
  consistently as the cell stride, so the math stays correct; a grep during
  implementation confirms no consumer assumed a non-zero gutter.

## Migration Plan

Pure front-end visual change, no data or API surface. Ship by editing the two
source files and the README; verify in-browser at several zoom levels and in both
themes. Rollback is reverting the constants and frame edits.

## Open Questions

- Exact `TILE_PADDING` fraction (8% vs 10% vs 12%) — settle by eye during apply.
- Whether `BLEED` of 1px fully kills slivers at the extreme zoom-out
  (`MIN_SCALE = 0.4`); confirm in-browser and nudge if needed.
