## ADDED Requirements

### Requirement: Tile colour defaults to foreground ink, with palette as a minority accent

A tile SHALL be drawn in the site foreground ink (`text-foreground`, via
`currentColor`) by default, and an ink-only tile SHALL be the norm. Palette colour
is OPTIONAL: a tile MAY use no palette colour at all. When a tile does use palette
colour, that colour SHALL be a minority accent — a pop within an ink drawing — and
the tile SHALL NOT be rendered wholly in one accent colour. The palette is tiered:
`blue` and `rose` are the primary accents and SHALL be preferred; `amber`, `teal`,
and `violet` are rare accents and SHALL be reached for only deliberately. All five
`--color-thingy-*` tokens remain defined and selectable; the tiering governs
preference, not availability.

#### Scenario: Ink is the default

- **WHEN** a tile is authored or scaffolded without a deliberate colour choice
- **THEN** it is drawn in foreground ink (`text-foreground` + `currentColor`)
- **AND** an ink-only tile fully satisfies the contract

#### Scenario: Accent is a minority pop, never the whole tile

- **WHEN** a tile uses a palette colour
- **THEN** the colour is applied to a minority of the tile's marks as an accent
- **AND** the tile is not rendered wholly in a single accent colour

#### Scenario: Blue and rose are preferred over the rare accents

- **WHEN** an accent colour is chosen
- **THEN** `blue` or `rose` is used by default
- **AND** `amber`, `teal`, or `violet` is used only as a deliberate, rare choice

### Requirement: Tile line work avoids hairlines

A tile SHALL NOT rely on hairline geometry for its structure. Stroked lines SHALL be
confident marks scaled to the tile (e.g. roughly 3–5 units in a `0 0 100 100`
viewBox), and a tile SHALL NOT use a fixed-pixel `border` for scaled line work nor
~1px-equivalent viewBox strokes as its primary geometry. Filled shapes SHALL be
preferred over thin outlines where they suit the drawing. A thin line is permitted
only when a fine line is deliberately the point of the tile.

#### Scenario: No hairline geometry by default

- **WHEN** a tile is authored or scaffolded
- **THEN** its structural strokes are confident, tile-scaled widths (not ~1px hairlines)
- **AND** it does not use a fixed-pixel `border` for scaled line work

#### Scenario: A deliberate fine line is allowed

- **WHEN** a thin line is the explicit intent of a tile's design
- **THEN** the tile MAY use a fine line for that motif

## MODIFIED Requirements

### Requirement: A canonical tile-contract document is the single source of truth

The project SHALL provide one tile-contract document, colocated with the thingies
feature, that enumerates every guarantee a tile must satisfy: self-contained from
other tiles / features / app code (third-party libraries permitted when imported
within the tile, so they are lazy-loaded with it), scale-independent so it looks
the same at any tile size, fills a fixed square, decorative and non-interactive,
honours `prefers-reduced-motion`, is drawn in foreground ink by default with palette
colour used only as an optional, tiered, minority accent (never a whole-tile
colour), avoids hairline line work (no fixed-pixel `border` for scaled lines, no
~1px viewBox strokes) unless a fine line is deliberately the point, default-exports
the component the registry loads, and prefers SVG / CSS over 2D canvas (with WebGL
the exception). The authoring tool and any hand-author SHALL follow this document,
and a change to the contract SHALL be made in this one place.

#### Scenario: The contract is documented in one place

- **WHEN** an author needs to know what a tile must satisfy
- **THEN** a single tile-contract document states the full contract
- **AND** no competing, separate definition of the contract exists

#### Scenario: The contract covers each guarantee

- **WHEN** the contract document is read
- **THEN** it lists, at minimum: scale-independence, the contained-and-lazy
  dependency allowance, decorative / non-interactive, reduced-motion-safe, fills the
  square, ink-by-default colour with palette as a tiered minority accent, the
  no-hairline line-weight guidance, default export, and the
  prefer-SVG/CSS-over-canvas guidance

### Requirement: Scaffolded tiles conform to the contract by default

The template the tool produces SHALL satisfy the tile contract out of the box,
before any authoring: the scaffolded component SHALL be decorative and
non-interactive, SHALL gate any animation behind `prefers-reduced-motion` so a
reduced-motion visitor sees a static result, SHALL fill its square, SHALL be
scale-independent (the template uses an SVG `viewBox`), SHALL be drawn in foreground
ink (`text-foreground` + `currentColor`) by default — using no palette colour, or at
most a single minority accent from the tier (`blue` / `rose` preferred) — SHALL avoid
hairline line work (confident, tile-scaled strokes, no fixed-pixel `border`), and
SHALL be the default export the registry loader imports.

#### Scenario: A freshly scaffolded tile is reduced-motion-safe

- **WHEN** a tile is scaffolded and rendered for a visitor with
  `prefers-reduced-motion: reduce`
- **THEN** it shows a static result and runs no continuous animation

#### Scenario: A freshly scaffolded tile is decorative and importable

- **WHEN** a tile is scaffolded
- **THEN** its component is non-interactive and marked decorative
- **AND** it is the default export, so the registry's `load` import resolves it
  without changes

#### Scenario: A freshly scaffolded tile is ink-first and hairline-free

- **WHEN** a tile is scaffolded
- **THEN** it is drawn in foreground ink by default with no rainbow accent forced on it
- **AND** its strokes are confident, tile-scaled widths rather than ~1px hairlines
