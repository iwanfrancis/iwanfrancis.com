# thingies-authoring Specification

## Purpose

Defines how a new tile ("thingy") is added to the `/thingies` canvas: the
append-only id and registration convention, the tile contract every tile must
satisfy (self-contained, scale-independent, decorative, reduced-motion-safe,
palette-only, lazy-loaded — libraries permitted within the tile), and the authoring
tool that scaffolds a contract-conforming tile and registers it. Runtime canvas
behaviour (placement, pan, zoom, windowing) lives in `thingies-canvas`.
## Requirements
### Requirement: Adding a tile is an append-only operation

A new tile SHALL be added by appending exactly one entry to the end of the ordered
tile registry and creating that tile's component; the operation SHALL NOT modify,
reorder, or remove any existing registry entry or tile. This preserves the
deterministic, stable placement guaranteed by the canvas (appending never moves an
already-placed tile).

#### Scenario: Appending leaves existing tiles untouched

- **WHEN** a new tile is added
- **THEN** a single new entry is appended after the last existing registry entry
- **AND** every existing entry keeps its id, metadata, and order

#### Scenario: Tiles are never inserted mid-list

- **WHEN** a tile is added
- **THEN** it is placed last in the registry, never inserted before an existing
  entry (which would reshuffle later tiles' positions)

### Requirement: Tile ids follow a sequential, kebab-case convention

Every tile SHALL have an id of the form `NNNN-kebab-name`: a four-digit,
zero-padded, sequential integer prefix followed by a kebab-case name. The id SHALL
be unique across all tiles, the new id's number SHALL be one greater than the
highest existing tile number, and the tile's folder name SHALL equal its id and
match the `id` field in its registry entry.

#### Scenario: Next id continues the sequence

- **WHEN** the highest existing tile is `0005-wave-bars`
- **THEN** the next tile's id begins `0006-`

#### Scenario: Id, folder, and registry entry agree

- **WHEN** a tile exists
- **THEN** its folder under the tiles directory is named exactly its id
- **AND** the `id` field of its registry entry equals that folder name

#### Scenario: Ids do not collide

- **WHEN** a new tile is added
- **THEN** its id does not duplicate any existing tile's id

### Requirement: A canonical tile-contract document is the single source of truth

The project SHALL provide one tile-contract document, colocated with the thingies
feature, that enumerates every guarantee a tile must satisfy: self-contained from
other tiles / features / app code (third-party libraries permitted when imported
within the tile, so they are lazy-loaded with it; and the thingies runtime loop
hooks permitted as the sanctioned same-feature API — these are the harness, not
another tile), scale-independent so it looks the same at any tile size, fills a
fixed square, decorative and non-interactive, honours `prefers-reduced-motion`, is
drawn in foreground ink by default with palette colour used only as an optional,
tiered, minority accent (never a whole-tile colour), avoids hairline line work (no
fixed-pixel `border` for scaled lines, no ~1px viewBox strokes) unless a fine line
is deliberately the point, default-exports the component the registry loads, and
prefers SVG / CSS over 2D canvas (with WebGL the exception). The document SHALL
state how a tile may run a JavaScript loop: CSS animation freezes off-screen
automatically, and a tile that needs a JS loop SHALL drive it through the runtime
loop hooks so it freezes off-screen too, whereas a raw `requestAnimationFrame` or
`setInterval` not wired through those hooks SHALL NOT freeze and SHALL keep doing
unseen work until the tile unmounts. The authoring tool and any hand-author SHALL
follow this document, and a change to the contract SHALL be made in this one place.

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

#### Scenario: The contract documents the JS-loop path

- **WHEN** an author needs to run a JavaScript loop in a tile
- **THEN** the contract document directs them to the runtime loop hooks as the
  sanctioned way to make that loop freeze off-screen
- **AND** it warns that a raw `requestAnimationFrame` / `setInterval` not wired
  through those hooks will not freeze and will leak work until the tile unmounts

### Requirement: Tile contents are scale-independent

A tile SHALL render the same at any tile size: its appearance SHALL NOT depend on
the current tile size. Tile geometry SHALL be expressed relative to the tile box —
via an SVG `viewBox` or units relative to the tile's width and height — and SHALL
NOT be hard-coded to fixed pixel dimensions tied to the current size. Changing the
tile size, or zooming, SHALL rescale a tile uniformly rather than altering its
composition.

#### Scenario: Changing the tile size preserves appearance

- **WHEN** the tile size is changed
- **THEN** every tile keeps the same composition, scaled to the new size
- **AND** no tile's contents are clipped, mis-aligned, or otherwise altered beyond a
  uniform scale

### Requirement: A tile may use contained, lazy-loaded dependencies

A tile MAY use third-party libraries. Any such dependency SHALL be imported within
the tile's own module so it is code-split into that tile's lazy-loaded chunk — which
loads only when the tile is on screen — and SHALL NOT affect the initial page load
or any other tile. A tile SHALL NOT import from other tiles, other features, or app
code; the thingies runtime loop hooks are the one sanctioned exception, imported as
the harness API rather than as cross-tile code. A library that runs its own
animation loop SHALL be frozen off-screen only if its loop is driven or gated
through the runtime loop hooks; a loop left to run on its own SHALL remain subject
to the off-screen-freeze caveat and keep working unseen until unmount. A library
that uses WebGL remains subject to the live-context cap and SHALL be used
accordingly.

#### Scenario: A library rides in the tile's own chunk

- **WHEN** a tile imports a third-party library within its module
- **THEN** that library is bundled into the tile's on-demand chunk
- **AND** the initial page bundle and the other tiles are unaffected

#### Scenario: A tile does not reach across the app

- **WHEN** a tile is authored
- **THEN** it does not import from other tiles, other features, or app code
- **AND** the only sanctioned shared import is the thingies runtime loop hooks

#### Scenario: A JS loop freezes only when wired through the hooks

- **WHEN** a tile runs a JavaScript loop driven through the runtime loop hooks
- **THEN** that loop pauses while the tile is off-screen and resumes on return
- **WHEN** a tile instead runs a raw loop not wired through the hooks
- **THEN** that loop keeps running off-screen until the tile unmounts

### Requirement: An authoring tool scaffolds a new tile and registers it

The project SHALL provide an authoring tool (a Claude Code skill) that adds a tile
end to end with no manual id arithmetic or registry editing: it SHALL determine the
next sequential id, create the tile folder and an `index.tsx` from a
contract-conforming template, and append the matching entry to the registry. The
author SHALL only have to write the tile's drawing inside the scaffolded component.

#### Scenario: Running the tool scaffolds and registers a tile

- **WHEN** the author runs the tool with a tile name
- **THEN** a new tile folder and `index.tsx` are created under the tiles directory
- **AND** a matching registry entry (id, title, date, loader) is appended

#### Scenario: The author only writes the drawing

- **WHEN** the tool has finished scaffolding
- **THEN** the boilerplate (folder, default-exported component shell, registry
  wiring) already exists
- **AND** the only remaining work is the tile's visual content

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

### Requirement: The authoring tool directs isolated verification to the preview route

After scaffolding and registering a tile, the authoring tool SHALL direct the author
to verify the tile at its single-tile preview route (`/thingies/<id>`), where the tile
renders in isolation, rather than to locating the tile among the placed tiles on the
canvas. The guidance SHALL reference the scaffolded tile's own id.

#### Scenario: The tool reports the tile's preview URL

- **WHEN** the authoring tool finishes scaffolding and registering a tile
- **THEN** it tells the author the tile's preview route for that tile's id
- **AND** it does not instruct the author to hunt for the tile on the canvas

