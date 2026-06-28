## ADDED Requirements

### Requirement: Tiles fade in when they mount

Each tile's content SHALL fade in — ramp from transparent to opaque — when it
mounts (when its lazily-loaded chunk resolves), rather than appearing instantly.
The fade SHALL apply to the **whole tile as one unit** — its opaque background, its
edge hairline-cover, and its drawing ramping opacity together — so the tile
materialises from the backdrop with no instantly-appearing square beneath a fading
drawing. The fade SHALL be triggered by content arrival, not by frame mount, so it
is not consumed while the tile is still a blank placeholder.

Each tile SHALL begin its fade after a small, per-tile randomised delay, so tiles
that mount together fade in over a short, staggered window rather than in unison.
The randomised delay carries no determinism guarantee and MAY differ each time a
tile is mounted.

The fade and its stagger SHALL be a transient mount effect only: tiles SHALL still
unmount instantly when they leave the mount band, and the fade SHALL NOT re-run
when an already-mounted tile merely freezes and thaws within the band. The fade
SHALL be consistent with `prefers-reduced-motion`: a reduced-motion visitor SHALL
see tiles appear at full opacity with no fade animation.

#### Scenario: A tile fades in instead of popping

- **WHEN** a tile mounts and its content chunk resolves
- **THEN** its content ramps from transparent to fully opaque over a short duration
- **AND** it does not appear instantly at full opacity

#### Scenario: The whole tile materialises as one

- **WHEN** a tile fades in
- **THEN** its opaque background, its edge hairline-cover, and its drawing ramp
  opacity together as a single unit
- **AND** there is no opaque square that appears instantly beneath a separately
  fading drawing

#### Scenario: A batch of tiles is staggered

- **WHEN** several tiles mount at the same time (for example on first load)
- **THEN** they begin fading in over a short, randomised window rather than all at
  the same instant

#### Scenario: Reduced motion shows tiles instantly

- **WHEN** a visitor with `prefers-reduced-motion: reduce` mounts a tile
- **THEN** the tile appears at full opacity with no fade animation

#### Scenario: Re-freezing within the band does not re-fade

- **WHEN** an already-mounted tile freezes (pans off-screen within the band) and
  later thaws (pans back into the active region) without being unmounted
- **THEN** it does not replay its fade-in; it resumes at full opacity

## MODIFIED Requirements

### Requirement: Tiles render on an opaque page-matched background

Each tile SHALL render on an opaque background matching the page background
colour, so the dot matrix is not visible through the body of the tile. Adjacent
tiles SHALL sit flush, with their opaque backgrounds meeting so that no dot grid
is visible between them at any zoom level. The dot grid SHALL be visible only
around the outer edge of the blob and within genuine concavities of its
perimeter, not in the joins between neighbouring tiles.

These guarantees describe the **settled** tile — a tile that has finished fading in
(see "Tiles fade in when they mount"). During the brief mount fade, a tile's
background and hairline-cover ramp opacity together with its drawing, so any matrix
visible through the tile body or between flush neighbours SHALL be only a transient,
sub-second, lock-step effect of the fade — never a persistent gap.

#### Scenario: A tile over the matrix

- **WHEN** a settled tile is shown over the dot matrix
- **THEN** its square is filled with the page background colour and the dots do
  not show through it

#### Scenario: No dots between adjacent tiles

- **WHEN** two settled tiles sit edge-to-edge within the blob
- **THEN** no dot grid is visible in the join between them
- **AND** this holds at every zoom level, with no sub-pixel sliver of the matrix
  showing through

#### Scenario: Dots frame the blob

- **WHEN** the blob is shown over the dot matrix
- **THEN** the dot grid is visible around the blob's outer edge and in any
  concavities of its perimeter
- **AND** the interior of a solidly filled region shows no dots between its tiles
