## ADDED Requirements

### Requirement: Zoomed content renders crisp once the zoom settles

The tile and dot-grid content SHALL render at full resolution for the resting
scale once a zoom has settled — the input gesture has ended and any zoom
animation has completed — rather than as a stretched raster of a smaller scale.
This SHALL hold for static content (a tile that is not animating, including under
`prefers-reduced-motion: reduce`), so crispness does not depend on a subsequent
repaint. The smooth transform behaviour during an active pan or zoom gesture (see
"The surface can be zoomed") SHALL be retained.

#### Scenario: A static tile is crisp after zooming in

- **WHEN** the visitor zooms in and stops on a tile whose content is not
  currently animating
- **THEN** that tile's content renders sharp at the new scale without waiting for
  a further repaint or animation frame

#### Scenario: Reduced-motion tiles are crisp after zooming

- **WHEN** a visitor with `prefers-reduced-motion: reduce` zooms into the surface
- **THEN** the (non-animating) tiles render sharp at the resting scale rather than
  remaining blurred

#### Scenario: Panning and zooming stay smooth

- **WHEN** the visitor is actively panning or zooming
- **THEN** the surface still moves and scales smoothly, with no regression in
  transform performance introduced by the crispness handling
