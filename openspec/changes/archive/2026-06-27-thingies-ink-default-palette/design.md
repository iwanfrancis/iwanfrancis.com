## Context

`/thingies` is a growing grid of small, self-contained decorative tiles. The
contract that governs them ([`src/features/thingies/thingies/README.md`](../../../src/features/thingies/thingies/README.md))
currently frames colour as "use the fixed accent palette (or be monochrome)" — so
the path of least resistance is to give each tile one palette colour. With six tiles
across five accents, the canvas reads as a rainbow rather than a coherent piece.
Three tiles also use hairline geometry (1.5-unit strokes; Tailwind `border` at 1px)
that looks wireframey against the site's solid, soft matrix-grid + lava theme — and
`border`-based lines additionally violate the existing scale-independence guarantee,
since a 1px CSS border does not grow with `TILE_SIZE`.

The palette tokens live in [`src/globals.css`](../../../src/globals.css#L53-L57) as
five peers (`amber`, `teal`, `blue`, `rose`, `violet`), all near-equal chroma. The
foreground ink (`--foreground`) is near-black on light, near-white on dark, and
essentially neutral.

This change is documentation + tokens + a retrofit of six small components. No
canvas/runtime behaviour changes.

## Goals / Non-Goals

**Goals:**

- Make ink the default and the norm; a tile with no palette colour is fully
  contract-conforming.
- When colour appears, keep it a minority accent, never a whole-tile wash.
- Tier the palette: `blue`/`rose` primary, `amber`/`teal`/`violet` rare.
- Replace hairline geometry with confident, tile-scaled marks; ban fixed-px
  `border` for scaled line work.
- Keep the contract single-sourced (README), with the skill and spec following it.
- Retrofit the six existing tiles so the live canvas demonstrates the new model.

**Non-Goals:**

- No change to canvas placement, pan, zoom, virtualisation (`thingies-canvas`).
- No removal of palette tokens — `amber`/`teal`/`violet` stay available, just rare.
- No new dependencies, no new tiles, no theming/dark-mode token changes beyond the
  `--color-thingy-*` comment.
- Not introducing lint enforcement for the colour/line rules — they stay
  author-and-review guarantees, consistent with how the rest of the contract is held.

## Decisions

### Ink default via `text-foreground` + `currentColor`

The tile root sets `text-foreground`; all fills/strokes derive from `currentColor`.
An accent is introduced by setting a single child element to `text-thingy-blue` /
`text-thingy-rose`, whose `currentColor` then drives just that element. This keeps
the existing "set colour once, derive from currentColor" idiom and means an
ink-only tile is simply one that never overrides the root colour.

- *Alternative — keep palette as default, rely on guidance to "use less colour":*
  rejected. The default is what gets reached for; leaving palette as the default
  reproduces the rainbow. Inverting the default is the actual fix.

### Tiering is documentation + token grouping, not a mechanism

The five tokens remain individually selectable. Tiering is expressed by (a)
grouping/commenting them in `globals.css` as primary vs rare, (b) the README colour
table calling out the tiers, and (c) the skill template defaulting to ink and naming
`blue`/`rose` as the accent choices. No code picks colours by weight.

- *Alternative — a helper that assigns accents by tile id with a weighting:*
  rejected. It fights the "author writes the drawing" model and bakes randomness
  into placement-adjacent logic for no real gain on a hand-curated set.

### "Minority accent, never whole-tile" as the anti-rainbow rule

The rule that actually prevents a softer rainbow is that a tile is never *wholly* one
accent. Colour must be the minority of a tile's marks (a focal dot, a leading bar, a
sweep over an ink track). This is stated normatively in the spec and the README.

### Line-weight rule expressed in viewBox units

Because tiles are scale-independent (geometry in a `0 0 100 100` viewBox, i.e. % of
the tile), the rule is unit-relative: confident strokes ≈ 3–5 viewBox units;
hairlines ≈ 1–1.5 are out. Fixed-px `border` is banned for scaled line work both
because it's a hairline and because it doesn't scale with `TILE_SIZE`. Filled shapes
are preferred over outlines. A deliberate fine-line motif is the only exception.

### Per-tile retrofit mapping

| Tile | Was | Becomes |
| --- | --- | --- |
| `0001-concentric-rings` | teal, stroke 1.5 | ink-only, heavier stroke (~3–4) |
| `0002-nested-squares` | amber, `border` 1px ×2 | ink-only, thick stroke or filled (drop `border`) |
| `0003-pulse-grid` | blue, filled dots | ink-only dot field |
| `0004-orbiting-dot` | rose (whole tile) | ink ring (thicker/softer) + **rose** dot — the exemplar |
| `0005-wave-bars` | violet bars | ink bars + one **blue** leading bar |
| `0006-rotating-arc` | amber, stroke 2 | ink track + **blue** sweep, heavier stroke |

Net: ~half ink-only, `blue` ×2, `rose` ×1, zero `amber`/`teal`/`violet`. While in
`0003`, also fix its pre-existing fixed-px sizing (`h-1.5 w-1.5`, `p-3`) to relative
units so it's genuinely scale-independent.

## Risks / Trade-offs

- **Rules aren't auto-enforced** → a future tile could drift back to a colour wash
  or a hairline. Mitigation: stated normatively in the spec, the README contract,
  and the skill template default — the same enforcement model as every other tile
  guarantee. Accepted for a solo, hand-curated project.
- **Ink-default could feel monotonous as the grid grows** → mitigated by the
  optional blue/rose pops and rare deliberate accents; the canvas is meant to read
  calm, and the dial can be revisited if it tips too austere.
- **Retrofit changes existing tiles' appearance** → intended; these are decorative
  and the change is the point. Each tile keeps its motion, scale-independence, and
  reduced-motion behaviour — only colour and stroke weight change.
- **`0002`/`0004` move off Tailwind `border`** → small rewrite to SVG strokes or
  relatively-sized borders; low risk, and it also repairs their latent
  scale-independence gap.
