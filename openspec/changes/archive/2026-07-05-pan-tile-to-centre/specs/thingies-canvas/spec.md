## MODIFIED Requirements

### Requirement: Panning is bounded to the tiles

Panning SHALL be constrained so the visitor cannot drift far into empty space,
while still allowing any single tile to be brought to the centre of the viewport.
The pan offset SHALL be clamped so that, at the limit, the outermost tile's centre
can reach the viewport centre (plus a small overscroll margin) — not merely so the
blob's edge reaches the viewport edge. Because at most half the blob leaves view at
the limit, the tiles always remain on screen. Overscrolling past the bound MAY
rubber-band but SHALL settle back within the bound.

#### Scenario: Cannot get lost in the void

- **WHEN** the visitor drags well past the point where the outermost tile is
  centred
- **THEN** the surface stops (or rubber-bands and settles) so the tiles remain in
  view rather than scrolling endlessly into empty space

#### Scenario: An edge tile can be centred

- **WHEN** the visitor pans toward a tile on the outer rim of the blob
- **THEN** the pan allows that tile to reach the centre of the viewport, rather
  than stopping with it pinned near the viewport edge

### Requirement: Panning bounds adapt to the zoom level

The pan clamp SHALL account for the current zoom: bounds SHALL be computed from the
tiles' bounding area at the current scale. At every zoom level the bound SHALL be
grounded on the outermost tile's centre reaching the viewport centre (plus a
margin), applied uniformly — it SHALL NOT switch behaviour based on whether the
scaled content is larger or smaller than the viewport. The bound SHALL never be
tighter than one that keeps the scaled blob overlapping the viewport, so the rule
stays robust when a scaled tile is wider than the viewport.

#### Scenario: Bounds are computed from the scaled blob

- **WHEN** the visitor zooms in and then pans to the limit
- **THEN** the reachable pan is computed from the scaled blob (not its unscaled
  extent), stopping once the outermost tile is centred plus the margin

#### Scenario: Any tile is centrable when zoomed out

- **WHEN** the visitor zooms out until the whole blob is smaller than the viewport
  and pans toward an edge tile
- **THEN** the surface allows that tile to reach the viewport centre — up to half
  the blob may leave the screen — rather than holding the blob rigidly centred, yet
  the visitor still cannot scroll endlessly into empty space
