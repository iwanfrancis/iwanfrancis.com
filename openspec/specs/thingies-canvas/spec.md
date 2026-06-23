# thingies-canvas Specification

## Purpose
TBD - created by archiving change thingies-canvas. Update Purpose after archive.
## Requirements
### Requirement: The /thingies page renders as a full-bleed canvas

The site SHALL serve a page at `/thingies` that occupies the full viewport as a
canvas surface. The page SHALL NOT render the site footer, SHALL NOT scroll the
document (the surface is roamed by panning, not scrolling), and SHALL keep the
existing site header present and usable. The CV / landing page SHALL be
unaffected by this shell.

#### Scenario: Opening the page

- **WHEN** a visitor navigates to `/thingies`
- **THEN** the tile surface fills the viewport between the header and the bottom
  of the screen
- **AND** no footer is shown and the document does not scroll vertically

#### Scenario: The landing page is untouched

- **WHEN** a visitor opens the home page `/`
- **THEN** the header, footer, and existing layout render exactly as before

### Requirement: The page reuses the matrix background visuals

The page SHALL render the existing matrix dot grid and ambient lava background as
its backdrop, deriving colours from the existing theme tokens so it reads
correctly in both light and dark themes, and SHALL honour
`prefers-reduced-motion: reduce` consistently with the rest of the site.

#### Scenario: Background matches the site

- **WHEN** the page is open in either theme
- **THEN** the dot-matrix grid and drifting lava blobs are visible behind the
  tiles, matching the rest of the site

#### Scenario: Reduced motion is requested

- **WHEN** a visitor with `prefers-reduced-motion: reduce` opens the page
- **THEN** continuously animating motion (background drift and any animated seed
  tiles) does not run continuously
- **AND** the dot grid and tiles are still shown

### Requirement: Tiles are equal squares on a lattice

Every tile SHALL be a square of the same fixed size, positioned on an integer
cell lattice so tiles align to a regular grid. The tile size SHALL be a multiple
of the background dot-grid pitch so tiles align with the dots.

#### Scenario: Tiles share a size and grid

- **WHEN** any two tiles are shown
- **THEN** they are the same size
- **AND** each sits on a lattice cell aligned with the others

### Requirement: Tiles are placed automatically as a gap-free connected blob

Tile positions SHALL be derived automatically from the ordered tile list with no
manually authored coordinates. The placed tiles SHALL always form a single
edge-connected region that grows outward from a central origin: each newly added
tile SHALL occupy a cell that shares a full edge (not merely a corner) with an
already-placed tile. The result SHALL read as a solid, ragged-edged blob, not a
spiral, rigid rows, or scattered islands.

#### Scenario: First tile is central

- **WHEN** the list contains one tile
- **THEN** it is placed at the central origin cell

#### Scenario: Each added tile connects by an edge

- **WHEN** a tile is added to the list
- **THEN** its cell shares a full edge with at least one already-placed tile
- **AND** no placed tile is connected to the rest only by a corner or fully
  detached

### Requirement: New tiles never enclose a gap

Adding a tile SHALL NOT seal any empty cell or region so that it becomes
enclosed. An empty cell SHALL be considered enclosed (a hole) unless it can reach
the area outside the blob through a path of edge-adjacent (4-connected) empty
cells; a diagonal-only escape between two tiles counts as enclosed. Placement
SHALL choose only cells that leave every empty cell still able to reach the
outside.

#### Scenario: A move that would trap an empty cell is rejected

- **WHEN** placing the next tile, the only candidate cells that share an edge with
  the blob include one whose placement would leave an empty cell unable to reach
  the outside by edge-adjacent empty cells
- **THEN** that cell is not chosen; a cell that traps nothing is chosen instead

#### Scenario: No holes after growth

- **WHEN** any number of tiles have been placed
- **THEN** the blob contains no enclosed empty cells, including diagonally pinched
  ones

### Requirement: Tile placement is deterministic and stable under additions

For a given ordered tile list, placement SHALL be deterministic — the same list
always yields the same layout, with no run-to-run randomness. Appending a tile to
the end of the list SHALL NOT move any previously placed tile.

#### Scenario: Same list, same layout

- **WHEN** the page is loaded twice with the same tile list
- **THEN** every tile occupies the same cell both times

#### Scenario: Appending leaves existing tiles in place

- **WHEN** a new tile is appended to the list and the page is reloaded
- **THEN** all previously placed tiles remain in their original cells
- **AND** only the new tile occupies a new cell

### Requirement: The surface is roamed by dragging

The visitor SHALL be able to pan the tile surface in any direction by dragging
with a mouse or a touch gesture, using a single code path for both. The page
SHALL support panning only; it SHALL NOT zoom in this version.

#### Scenario: Dragging pans the surface

- **WHEN** the visitor presses and drags anywhere on the surface
- **THEN** the tiles move with the drag, revealing tiles that were off-screen

#### Scenario: Touch dragging on mobile

- **WHEN** the visitor drags with a finger on a touch device
- **THEN** the surface pans the same way it does with a mouse

### Requirement: The background pans with the tiles

The dot-grid background SHALL pan in lock-step with the tiles so the tiles read as
pinned to one continuous surface rather than floating over a fixed backdrop.

#### Scenario: Dots move with the tiles

- **WHEN** the visitor pans the surface
- **THEN** the dot grid translates by the same offset as the tiles, keeping each
  tile over the same dots throughout the pan

### Requirement: Panning is bounded to the tiles

Panning SHALL be constrained so the visitor cannot drift far into empty space:
the pan offset SHALL be clamped to the filled tiles' bounding area plus a margin.
Overscrolling past the bound MAY rubber-band but SHALL settle back within the
bound.

#### Scenario: Cannot get lost in the void

- **WHEN** the visitor drags well past the edge of the placed tiles
- **THEN** the surface stops (or rubber-bands and settles) so the tiles remain in
  view rather than scrolling endlessly into empty space

### Requirement: Tile contents are non-interactive

Tile contents SHALL NOT capture pointer input: they SHALL NOT receive clicks,
hovers, or focus, and SHALL NOT interrupt a drag that begins or passes over them.
A drag started anywhere on the surface, including on top of a tile, SHALL pan the
surface.

#### Scenario: Dragging on a tile still pans

- **WHEN** the visitor presses on a tile and drags
- **THEN** the surface pans and the tile does not react to the pointer

### Requirement: Tile content loads lazily without blocking the page

Each tile's content SHALL be code-split into its own bundle and loaded on demand,
so the initial page render is not blocked waiting for tile code. Tiles SHALL
appear progressively as their content loads; a single slow tile SHALL NOT delay
the shell or the other tiles.

#### Scenario: Page shell renders before tile code

- **WHEN** the page is opened
- **THEN** the shell and background render without waiting for every tile's code
  to download
- **AND** tiles appear as their individual bundles arrive

### Requirement: A failing tile is isolated

If a single tile fails to load or throws while rendering, the failure SHALL be
contained to that tile. The rest of the page — shell, background, panning, and
the other tiles — SHALL continue to function.

#### Scenario: One broken tile

- **WHEN** one tile errors on load or render
- **THEN** the page does not blank or crash
- **AND** the other tiles and panning still work

### Requirement: Tiles render on an opaque page-matched background

Each tile SHALL render on an opaque background matching the page background
colour, so the dot matrix is not visible through the body of the tile. Only the
seam between adjacent tiles SHALL reveal the dot grid.

#### Scenario: A tile over the matrix

- **WHEN** a tile is shown over the dot matrix
- **THEN** its square is filled with the page background colour and the dots do
  not show through it
- **AND** the gap between adjacent tiles still reveals the dot grid

### Requirement: Tiles draw accent colour from a fixed palette

Accent colour used by a tile SHALL come from a single fixed, shared palette
(alongside the existing foreground/background tokens), so the page's visual
intensity stays controlled as tiles are added. Tiles MAY be monochrome; if a tile
uses accent colour, it MUST be a palette colour rather than an arbitrary one. The
palette SHALL be defined once and consumable by any tile.

#### Scenario: A tile uses accent colour

- **WHEN** a tile renders with an accent colour
- **THEN** that colour is one of the fixed palette accents, not an arbitrary value

#### Scenario: Adding a palette colour

- **WHEN** a new accent colour is added to the palette in one place
- **THEN** it becomes available to every tile without per-tile colour definitions

