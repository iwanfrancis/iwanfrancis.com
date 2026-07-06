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

### Requirement: The background pans with the tiles

The dot-grid background SHALL pan in lock-step with the tiles so the tiles read as
pinned to one continuous surface rather than floating over a fixed backdrop.

#### Scenario: Dots move with the tiles

- **WHEN** the visitor pans the surface
- **THEN** the dot grid translates by the same offset as the tiles, keeping each
  tile over the same dots throughout the pan

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

A tile off-screen but still within the margin band SHALL freeze its animation rather than continue animating unseen, so a settled view performs no off-screen animation work. A tile SHALL fully unmount only once it leaves the margin band entirely. Freezing and unmounting SHALL be handled by the tile frame generically. CSS-driven animation SHALL freeze with no change to how individual tiles are authored.

The frame SHALL additionally expose its current active/frozen state to its tile content (for example via React context), so that a tile which drives animation in JavaScript rather than CSS can pause and resume that work in step with the CSS freeze. Reading and acting on that state SHALL be opt-in for the tile — a CSS-only tile ignores it and is unaffected. Freezing SHALL be consistent with `prefers-reduced-motion` (a tile that does not animate has nothing to freeze).

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

#### Scenario: A JS-driven tile reads its frozen state

- **WHEN** a tile that consumes the frame's exposed active/frozen state sits
  off-screen within the margin band
- **THEN** that state reports the tile as frozen, so the tile can stop its
  JavaScript loop
- **AND** when the tile is panned back into view the state reports it active again,
  so the tile can resume

#### Scenario: A CSS-only tile is unaffected by the exposed state

- **WHEN** a tile animates purely with CSS and does not read the exposed state
- **THEN** it freezes and resumes exactly as before, with no authoring change

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

