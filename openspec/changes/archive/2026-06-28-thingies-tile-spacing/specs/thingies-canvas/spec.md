## MODIFIED Requirements

### Requirement: Tiles are equal squares on a lattice

Every tile SHALL be a square of the same fixed size, positioned on an integer
cell lattice so tiles align to a regular grid. Both the tile size AND the lattice
pitch (the cell-to-cell distance) SHALL be whole multiples of the background
dot-grid pitch, so that every tile — not only the first — aligns with the dots
across the whole blob.

#### Scenario: Tiles share a size and grid

- **WHEN** any two tiles are shown
- **THEN** they are the same size
- **AND** each sits on a lattice cell aligned with the others

#### Scenario: Alignment holds across many tiles

- **WHEN** a run of adjacent tiles is shown
- **THEN** each tile's edges line up with the dot grid the same way as the first
  tile
- **AND** the alignment does not drift from tile to tile across the blob

### Requirement: Tiles render on an opaque page-matched background

Each tile SHALL render on an opaque background matching the page background
colour, so the dot matrix is not visible through the body of the tile. Adjacent
tiles SHALL sit flush, with their opaque backgrounds meeting so that no dot grid
is visible between them at any zoom level. The dot grid SHALL be visible only
around the outer edge of the blob and within genuine concavities of its
perimeter, not in the joins between neighbouring tiles.

#### Scenario: A tile over the matrix

- **WHEN** a tile is shown over the dot matrix
- **THEN** its square is filled with the page background colour and the dots do
  not show through it

#### Scenario: No dots between adjacent tiles

- **WHEN** two tiles sit edge-to-edge within the blob
- **THEN** no dot grid is visible in the join between them
- **AND** this holds at every zoom level, with no sub-pixel sliver of the matrix
  showing through

#### Scenario: Dots frame the blob

- **WHEN** the blob is shown over the dot matrix
- **THEN** the dot grid is visible around the blob's outer edge and in any
  concavities of its perimeter
- **AND** the interior of a solidly filled region shows no dots between its tiles

## ADDED Requirements

### Requirement: Tiles have a uniform inner safe area

Each tile's content SHALL be inset from the frame edge by a uniform padding (a
safe area) on all sides, so tile content never touches the frame edge. The frame
SHALL apply this padding to every tile uniformly, requiring no per-tile
authoring. The padding SHALL be proportional to the tile size so it is preserved
under zoom and under any change to the tile size, never collapsing to zero nor
dominating the tile. Because adjacent tiles sit flush, this safe area SHALL
guarantee a minimum visible separation between neighbouring tiles' drawn contents
equal to twice the padding.

#### Scenario: Content has breathing room

- **WHEN** a tile is rendered
- **THEN** its drawn content is inset from the frame edge on all sides
- **AND** the content does not touch or overflow the frame edge

#### Scenario: Neighbouring contents are never squashed

- **WHEN** two tiles sit adjacent within the blob
- **THEN** their drawn contents are separated by at least twice the safe-area
  padding of background colour
- **AND** the tiles do not read as squashed together

#### Scenario: The safe area survives zoom and size changes

- **WHEN** the canvas is zoomed, or the tile size is changed
- **THEN** the inset stays proportional to the tile
- **AND** it neither collapses to zero nor grows to dominate the tile
