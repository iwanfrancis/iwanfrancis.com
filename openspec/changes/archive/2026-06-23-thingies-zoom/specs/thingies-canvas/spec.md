## MODIFIED Requirements

### Requirement: The surface is roamed by dragging

The visitor SHALL be able to pan the tile surface in any direction by dragging
with a mouse or a touch gesture, using a single code path for both. Dragging
SHALL pan the surface; it SHALL NOT change the zoom level. (Zoom is provided by
separate gestures and controls — see the zoom requirements.)

#### Scenario: Dragging pans the surface

- **WHEN** the visitor presses and drags anywhere on the surface
- **THEN** the tiles move with the drag, revealing tiles that were off-screen
- **AND** the zoom level does not change

#### Scenario: Touch dragging on mobile

- **WHEN** the visitor drags with a single finger on a touch device
- **THEN** the surface pans the same way it does with a mouse

## ADDED Requirements

### Requirement: The surface can be zoomed

The visitor SHALL be able to zoom the tile surface in and out, in addition to
panning. Zoom SHALL be bounded between a minimum and maximum scale so the surface
cannot be zoomed to an unusable extreme. Zooming SHALL scale the tiles and the
dot-grid background together so they remain a single pinned surface at every zoom
level.

#### Scenario: Zooming in and out

- **WHEN** the visitor zooms in
- **THEN** the tiles and the dot grid both grow, showing more detail of fewer
  tiles
- **WHEN** the visitor zooms out
- **THEN** the tiles and the dot grid both shrink, framing more of the blob

#### Scenario: Zoom is bounded

- **WHEN** the visitor keeps zooming in or out past the configured limits
- **THEN** the zoom stops at the maximum (or minimum) scale rather than continuing

#### Scenario: Dots stay locked to tiles while zooming

- **WHEN** the visitor zooms by any means
- **THEN** every tile stays over the same dots throughout the zoom, with no drift
  between the dot grid and the tiles

### Requirement: Zoom is anchored to a focal point

Zooming SHALL keep the point under the input focus fixed on screen: the content
beneath the cursor (for pointer-wheel zoom) or beneath the gesture midpoint (for
pinch) SHALL remain under that same screen position as the scale changes. Zoom
triggered by controls or the keyboard, which have no pointer focus, SHALL anchor
to the centre of the viewport.

#### Scenario: Wheel zoom keeps the cursor point fixed

- **WHEN** the visitor zooms with the mouse wheel while pointing at a particular
  tile
- **THEN** that tile stays under the cursor as the surface scales

#### Scenario: Pinch zoom keeps the midpoint fixed

- **WHEN** the visitor pinches to zoom
- **THEN** the content under the midpoint of the two fingers stays under that
  midpoint as the surface scales

### Requirement: Input gestures map to pan and zoom by device

Pointer and gesture input SHALL map to pan or zoom in a way that matches platform
conventions, using a single recognition path across devices:

- a mouse wheel SHALL zoom;
- a trackpad two-finger swipe SHALL pan;
- a trackpad pinch SHALL zoom;
- a touch pinch SHALL zoom;
- a drag (mouse or single-finger touch) SHALL pan.

The browser's own page zoom and document scroll SHALL be prevented while
interacting with the surface, so wheel and pinch input act on the canvas rather
than the page.

#### Scenario: Mouse wheel zooms

- **WHEN** the visitor turns the mouse wheel over the surface
- **THEN** the surface zooms and the page itself neither scrolls nor zooms

#### Scenario: Trackpad swipe pans and pinch zooms

- **WHEN** the visitor two-finger-swipes on a trackpad
- **THEN** the surface pans
- **WHEN** the visitor pinches on a trackpad
- **THEN** the surface zooms

#### Scenario: Touch pinch zooms

- **WHEN** the visitor pinches with two fingers on a touch device
- **THEN** the surface zooms and the page itself does not zoom

### Requirement: Panning bounds adapt to the zoom level

The pan clamp SHALL account for the current zoom: bounds SHALL be computed from
the tiles' bounding area at the current scale. When the scaled content is larger
than the viewport, panning SHALL be clamped to that scaled area plus a margin.
When the scaled content is smaller than the viewport (zoomed far out), the
surface SHALL keep the blob within view rather than letting it drift into empty
space.

#### Scenario: Bounds tighten as you zoom in

- **WHEN** the visitor zooms in and then pans to an edge
- **THEN** the pan stops at the edge of the scaled blob plus its margin, not the
  unscaled extent

#### Scenario: Zoomed-out blob stays in view

- **WHEN** the visitor zooms out until the whole blob is smaller than the viewport
- **THEN** the surface keeps the blob in view rather than allowing it to drift
  into empty space

### Requirement: Zoom is operable without gestures

The surface SHALL provide an accessible way to zoom that does not require a wheel,
trackpad, or touch gesture: on-screen zoom-in and zoom-out controls and keyboard
operation. Zoom driven by controls or the keyboard MAY animate the scale change,
and SHALL respect `prefers-reduced-motion: reduce` by changing zoom without a
continuous animation.

#### Scenario: Zoom controls work

- **WHEN** the visitor activates the on-screen zoom-in or zoom-out control
- **THEN** the surface zooms in or out about the centre of the viewport

#### Scenario: Keyboard zoom works

- **WHEN** the visitor uses the keyboard to zoom in or out
- **THEN** the surface zooms accordingly

#### Scenario: Reduced motion is honoured

- **WHEN** a visitor with `prefers-reduced-motion: reduce` zooms via a control or
  the keyboard
- **THEN** the zoom level changes without a continuous zoom animation
