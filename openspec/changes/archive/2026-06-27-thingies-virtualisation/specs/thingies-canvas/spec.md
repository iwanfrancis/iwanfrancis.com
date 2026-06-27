# thingies-canvas Specification (delta)

## ADDED Requirements

### Requirement: Only tiles near the viewport are mounted

The page SHALL render only the tiles whose cell intersects the visible region of
the surface plus a surrounding margin band; tiles whose cell falls entirely
outside that band SHALL NOT be mounted. The number of mounted tiles SHALL be
bounded by the viewport size and zoom level, not by the total number of tiles in
the list, so the page stays performant as the list grows without limit. Mounting
and unmounting a tile SHALL NOT change which cell it occupies or shift the
position of any other tile.

#### Scenario: Off-screen tiles are not mounted

- **WHEN** the surface holds many more tiles than fit on screen and the view is
  settled
- **THEN** only the tiles whose cells fall within the viewport plus the margin
  band are present in the document
- **AND** tiles far outside the viewport are absent from the document

#### Scenario: Panning mounts and unmounts tiles

- **WHEN** the visitor pans so that an off-screen tile's cell moves into the
  viewport
- **THEN** that tile is mounted and appears in its cell
- **AND** a tile panned far enough out of view is removed from the document

#### Scenario: Mounted count tracks the viewport, not the list

- **WHEN** tiles are appended to the list far from the current view
- **THEN** the count of mounted tiles does not grow as a result
- **AND** the appended tiles mount only when panned or zoomed into view

#### Scenario: Windowing does not move tiles

- **WHEN** a tile is unmounted by panning away and later remounted by panning
  back
- **THEN** it reappears in exactly the same cell as before
- **AND** no other tile's position changes as tiles mount or unmount

### Requirement: The mount window adapts to the zoom level

The set of mounted tiles SHALL be computed in world coordinates from the visible
region at the current scale: the visible world rect SHALL be the viewport size
divided by the current zoom scale. Zooming out (smaller scale) SHALL widen the
visible world rect and therefore mount more tiles; zooming in SHALL narrow it and
mount fewer. The margin band SHALL be applied in the same world coordinates so it
remains consistent across zoom levels.

#### Scenario: Zooming out mounts more tiles

- **WHEN** the visitor zooms out so a larger area of the blob is framed
- **THEN** tiles that were off-screen at the previous scale become mounted as they
  enter the widened visible world rect

#### Scenario: Zooming in mounts fewer tiles

- **WHEN** the visitor zooms in on a small part of the blob
- **THEN** tiles that fall outside the narrowed visible world rect are unmounted

### Requirement: Off-screen tiles pause before unmounting

A tile off-screen but still within the margin band SHALL freeze its animation rather than continue animating unseen, so a settled view performs no off-screen animation work. A tile SHALL fully unmount only once it leaves the margin band entirely. Freezing and unmounting SHALL be
handled by the tile frame generically, requiring no change to how individual
tiles are authored. Freezing SHALL be consistent with `prefers-reduced-motion`
(a tile that does not animate has nothing to freeze).

#### Scenario: A settled view does no off-screen animation

- **WHEN** the view is settled and a tile sits off-screen but within the margin
  band
- **THEN** that tile's animation is frozen rather than running

#### Scenario: Re-entering the viewport resumes animation

- **WHEN** a frozen tile within the margin band is panned back into the viewport
- **THEN** its animation resumes without the tile being torn down and rebuilt

#### Scenario: Leaving the band unmounts the tile

- **WHEN** the visitor keeps panning so a frozen tile leaves the margin band
- **THEN** the tile is unmounted and its resources are released
