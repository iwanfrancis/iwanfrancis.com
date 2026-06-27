## Why

The `/thingies` canvas reads as a rainbow: the current contract treats "one
palette colour per tile" as the default, so six tiles use five different accents
and each tile is *wholly* one colour. There's no shared theme for the eye to settle
on. Several tiles also lean on hairline geometry (1.5-unit SVG strokes, Tailwind
`border` at 1px) that looks wireframey and clashes with the site's solid, soft
aesthetic — and `border`-based lines also break the tile scale-independence
guarantee (they don't grow with `TILE_SIZE`). We want a calm, consistent ink field
with small pops of colour, set before the grid grows further.

## What Changes

- **Invert the colour default to ink.** A tile is drawn in the site foreground ink
  (`text-foreground`) by default, and that is the norm — many tiles will use no
  palette colour at all. **BREAKING** to the contract wording, which currently
  frames palette colour as the default and monochrome as the alternative.
- **Palette colour becomes an optional, minority accent.** When a tile colours, the
  accent is a *pop* within an ink drawing — never the whole tile. A tile is never
  wholly one accent colour.
- **Tier the palette.** `blue` and `rose` are the primary accents; `amber`, `teal`,
  and `violet` are rare, reach-for-deliberately accents. The five tokens stay
  defined; the tiering is documented in `globals.css` and the contract.
- **Add a line-weight guarantee.** No hairlines: prefer filled shapes and confident
  strokes (~3–5 viewBox units); do not use Tailwind `border` for scaled line work or
  ~1px viewBox strokes, unless a fine line is deliberately the point.
- **Update the authoring surface** to match: the canonical contract README, the
  `add-a-thingy` skill template + guidance, and the `globals.css` palette comment.
- **Retrofit the six existing tiles** to the new model: `0001` concentric-rings
  ink-only, heavier stroke; `0002` nested-squares ink-only, thick/filled (drop the
  1px border); `0003` pulse-grid ink-only; `0004` orbiting-dot ink ring + rose dot
  (the exemplar); `0005` wave-bars ink bars + one blue leading bar; `0006`
  rotating-arc ink track + blue sweep.

## Capabilities

### New Capabilities
<!-- none -->

### Modified Capabilities
- `thingies-authoring`: the colour guarantee changes from "uses only the fixed
  accent palette (or is monochrome)" to "foreground ink by default; palette colour
  optional, tiered, and only ever a minority accent"; a new line-weight guarantee
  (no hairlines) is added; the scaffolded-tile requirement updates accordingly.

## Impact

- **Specs**: `openspec/specs/thingies-authoring/spec.md` (contract + scaffold
  requirements).
- **Docs / contract**: `src/features/thingies/thingies/README.md` (canonical tile
  contract), `.claude/skills/add-a-thingy/SKILL.md` (template default + guidance).
- **Styling tokens**: `src/globals.css` (`--color-thingy-*` palette comment / tiering).
- **Tiles**: all six `src/features/thingies/thingies/000{1..6}-*/index.tsx`.
- No runtime/canvas behaviour changes (`thingies-canvas` untouched); no new
  dependencies. Tiles stay decorative, scale-independent, and reduced-motion-safe.
