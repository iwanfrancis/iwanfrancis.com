## ADDED Requirements

### Requirement: A single-tile preview route renders one tile in isolation

The project SHALL provide a route at `/thingies/[id]` that renders exactly one tile
on its own page, outside the `/thingies` canvas, so a specific tile can be viewed and
verified without locating it among the placed tiles. The route SHALL render the same
tile component the registry loads for the canvas (via the tile's registry loader), so
the preview reflects the real tile.

#### Scenario: Visiting a tile's preview shows only that tile

- **WHEN** a visitor navigates to `/thingies/<id>` for a registered tile
- **THEN** the page renders that single tile and no other tiles
- **AND** the tile is the same component the canvas would load for that id

#### Scenario: A tile that throws does not break the page

- **WHEN** the previewed tile throws while rendering
- **THEN** the failure is isolated to a quiet fallback in place of the tile
- **AND** the surrounding page (caption, navigation) still renders

### Requirement: A tile is addressable by full id or by bare number

The route SHALL resolve `[id]` to a tile when the segment is either the tile's full
id (`NNNN-kebab-name`) or just its number (with or without zero-padding). A bare
number SHALL match the single tile whose id begins with that zero-padded number. When
the segment is not the canonical full id, the route SHALL redirect to the canonical
full-id URL. A segment that matches no tile SHALL produce a 404 (not-found) response.

#### Scenario: Full id resolves directly

- **WHEN** a visitor navigates to `/thingies/0013-slinky-steps`
- **THEN** the tile `0013-slinky-steps` is previewed at that URL without redirecting

#### Scenario: Bare number redirects to the canonical id

- **WHEN** a visitor navigates to `/thingies/13` or `/thingies/0013`
- **THEN** the response redirects to `/thingies/0013-slinky-steps`
- **AND** that tile is previewed

#### Scenario: Unknown id is not found

- **WHEN** a visitor navigates to `/thingies/<id>` that matches no registered tile
- **THEN** the route returns a not-found (404) response

### Requirement: The previewed tile renders large, centred, and always active

The preview SHALL render the tile large and centred in the viewport rather than at
the small canvas tile size, taking advantage of the tile contract's
scale-independence. The tile SHALL be always active — it SHALL NOT be frozen by the
canvas off-screen windowing — so JS-loop tiles animate while previewed. The tile's
own `prefers-reduced-motion` handling SHALL be preserved, so a reduced-motion visitor
still sees a static result. The drawing SHALL fill its square edge-to-edge with no
safe-area inset, so the surrounding ambient background frames it.

#### Scenario: A JS-loop tile animates in the preview

- **WHEN** a tile that drives a runtime JS loop is previewed
- **THEN** its loop runs (the tile is treated as active), without depending on canvas
  visibility windowing

#### Scenario: Reduced motion is still honoured

- **WHEN** a tile is previewed by a visitor with `prefers-reduced-motion: reduce`
- **THEN** the tile shows a static result and runs no continuous animation

### Requirement: The preview shares the site's ambient background, unbroken across navigation

The preview SHALL render on the same ambient background as the rest of the site — the
dot matrix muted and drifted by the lava layer. That background SHALL persist across
navigation between preview pages: stepping from one tile to another SHALL NOT reset or
restart it. Page-level text (the caption and prev/next links) SHALL remain legible over
the background.

#### Scenario: Ambient background matches the site

- **WHEN** a tile preview is rendered
- **THEN** it shows the site's dot-matrix-and-lava ambient background

#### Scenario: Background is uninterrupted across tile navigation

- **WHEN** the visitor navigates from one tile's preview to an adjacent tile via the
  prev/next links
- **THEN** the ambient background continues uninterrupted rather than resetting to its
  initial state

### Requirement: The preview labels the tile and links to its neighbours

The preview SHALL display the tile's identifying metadata (id, title, and date) and
SHALL provide navigation to the previous and next tiles in registry order. The
navigation SHALL be clamped, not wrapping: the first tile SHALL offer no previous link
and the last tile SHALL offer no next link.

#### Scenario: Caption identifies the tile

- **WHEN** a tile is previewed
- **THEN** its id, title, and date are shown on the page

#### Scenario: Prev/next walk the registry order

- **WHEN** a middle tile is previewed
- **THEN** links to the previous and next tiles in registry order are available
- **AND** following them navigates to those tiles' preview routes

#### Scenario: Ends are clamped

- **WHEN** the first tile is previewed
- **THEN** no previous link is offered
- **WHEN** the last tile is previewed
- **THEN** no next link is offered

### Requirement: The preview route is a direct-URL utility, excluded from navigation and indexing

The preview route SHALL NOT appear in the site's navigation and SHALL be excluded from
search indexing (marked `noindex`). It is reached by direct URL only.

#### Scenario: Not listed in navigation

- **WHEN** the site chrome renders its navigation links
- **THEN** no link to a tile preview route is present

#### Scenario: Excluded from indexing

- **WHEN** a preview route is served
- **THEN** its metadata marks it `noindex`
