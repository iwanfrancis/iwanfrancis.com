## ADDED Requirements

### Requirement: The blob's tiles can be shuffled

The canvas SHALL provide a control that, when activated, permutes which tile
occupies each cell of the blob. The shuffle SHALL preserve the blob exactly — the
same set of occupied cells, the same outline and the same total tile count — and
change only the assignment of tiles to those cells, so the silhouette is unchanged
and only the contents are rearranged. The rearrangement SHALL apply immediately on
activation.

Shuffle SHALL be a visitor-triggered action only; it SHALL NOT run on load. The
initial layout SHALL remain the deterministic placement defined by "Tile placement
is deterministic and stable under additions", so the first render is unaffected by
this control.

#### Scenario: Shuffling rearranges the contents

- **WHEN** the visitor activates the shuffle control
- **THEN** at least some tiles move to different cells than they occupied before
- **AND** the change is applied immediately rather than after a load or reload

#### Scenario: The blob shape is preserved

- **WHEN** the visitor shuffles
- **THEN** the set of occupied cells, the blob's outline, and the tile count are
  unchanged
- **AND** only which tile sits in each cell differs

#### Scenario: Initial load is unaffected

- **WHEN** the page is first loaded, before any shuffle
- **THEN** the tiles occupy the deterministic placement, identical between loads of
  the same tile list

### Requirement: The canvas animation can be paused

The canvas SHALL provide a toggle control that pauses and resumes all of its
continuous animation. While paused, no tile SHALL animate — whether the tile
animates with CSS or drives its own JavaScript loop — and the ambient lava
background SHALL stop drifting. Resuming SHALL restore motion across the tiles and
the background. Pausing and resuming SHALL NOT tear down or rebuild tiles, and
SHALL NOT change the pan offset, the zoom level, or which tiles are mounted.

Pause SHALL fold into the same per-tile active/freeze signal the canvas already
uses for off-screen and tab-hidden, so a single state stops every tile regardless
of how it animates.

#### Scenario: Pausing stops all motion

- **WHEN** the visitor activates the pause toggle
- **THEN** every visible tile holds still, including tiles that animate in CSS and
  tiles that drive a JavaScript loop
- **AND** the lava background stops drifting

#### Scenario: Resuming restores motion

- **WHEN** the visitor activates the toggle again while paused
- **THEN** the tiles and the background resume animating
- **AND** no tile is rebuilt and the pan and zoom are unchanged

#### Scenario: Pausing does not move the surface

- **WHEN** the visitor pauses or resumes
- **THEN** the pan offset, the zoom level, and the set of mounted tiles are
  unchanged

### Requirement: The pause control reflects the reduced-motion preference

The pause toggle's initial state SHALL be derived from the visitor's
`prefers-reduced-motion` setting: a visitor with `prefers-reduced-motion: reduce`
SHALL find the canvas paused on load, and a visitor with no such preference SHALL
find it running. Because reduced motion already suppresses the canvas's continuous
animation at a lower layer, under `prefers-reduced-motion: reduce` the toggle SHALL
be shown in its pressed (paused) state and SHALL be disabled, conveying the state
rather than offering to start motion. When no reduced-motion preference is set, the
toggle SHALL be fully operable.

Deriving the initial state SHALL NOT introduce a server/client hydration mismatch:
the first render SHALL use a deterministic default and the preference SHALL be read
after mount.

#### Scenario: Reduced-motion visitor lands paused

- **WHEN** a visitor with `prefers-reduced-motion: reduce` opens the canvas
- **THEN** the canvas is paused and the toggle shows its pressed (paused) state

#### Scenario: The toggle is disabled under reduced motion

- **WHEN** a visitor with `prefers-reduced-motion: reduce` views the pause toggle
- **THEN** the toggle is disabled and does not offer to start motion

#### Scenario: Standard visitor lands running and can toggle

- **WHEN** a visitor with no reduced-motion preference opens the canvas
- **THEN** the canvas is running and the pause toggle is operable

### Requirement: A tile paused on-screen stays visible

A tile that is frozen because the canvas is paused, while it is on-screen, SHALL
remain visible at full opacity. In particular, a tile that mounts while the canvas
is paused — for example one panned into view after pausing — SHALL appear at full
opacity rather than being held transparent by the paused mount fade. This differs
from the off-screen freeze, which MAY deliberately hold an off-screen tile's mount
fade at zero opacity until it is panned into view.

#### Scenario: Panning to new tiles while paused shows them

- **WHEN** the visitor pauses and then pans so that previously unmounted tiles
  enter the viewport
- **THEN** those tiles appear at full opacity, held still
- **AND** they are not stuck transparent

#### Scenario: Off-screen freeze still defers the fade

- **WHEN** the canvas is not paused and a tile mounts off-screen within the margin
  band
- **THEN** its mount fade is still deferred until it is panned into view, unchanged
  by this control

### Requirement: The shuffle and pause controls are accessible and do not start a pan

The shuffle and pause controls SHALL be on-screen, focusable, labelled controls
operable by pointer and keyboard, presented together with the existing zoom
controls. The pause toggle SHALL expose its pressed state to assistive technology
and SHALL carry a label that reflects its action (pause when running, resume when
paused). A press that begins on any of these controls SHALL NOT start a pan of the
surface behind them.

#### Scenario: Controls are labelled and operable

- **WHEN** a visitor reaches the controls by keyboard or pointer
- **THEN** the shuffle and pause controls are focusable and labelled, and the pause
  toggle reports whether it is currently pressed (paused)

#### Scenario: Pressing a control does not pan

- **WHEN** the visitor presses on the shuffle or pause control
- **THEN** the control activates and the surface behind it does not begin to pan
