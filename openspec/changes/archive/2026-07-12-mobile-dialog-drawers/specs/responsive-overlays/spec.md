## ADDED Requirements

### Requirement: Viewport-appropriate overlay presentation

The system SHALL present its shared modal overlays (`Dialog` and `AlertDialog`) differently
by viewport width, sharing one presentation recipe:

- At or above the Tailwind `sm` breakpoint, content SHALL be a vertically centred panel
  (the existing desktop behaviour), unchanged.
- Below the `sm` breakpoint, content SHALL be a bottom-anchored sheet: seated against the
  bottom edge, spanning the full viewport width, with a rounded top edge, entering by
  sliding up from the bottom edge and leaving by sliding back down.

#### Scenario: Sheet presentation on a narrow viewport

- **WHEN** a `Dialog` or `AlertDialog` opens on a viewport narrower than the `sm` breakpoint
- **THEN** its content is anchored to the bottom edge, spans the full width, has a rounded
  top, and enters by sliding up from the bottom

#### Scenario: Centred presentation on a wide viewport

- **WHEN** a `Dialog` or `AlertDialog` opens on a viewport at or above the `sm` breakpoint
- **THEN** its content is centred exactly as it was before this change, with no grabber and
  no drag behaviour

### Requirement: Swipe-to-dismiss for non-destructive dialogs

Below the `sm` breakpoint, a non-destructive `Dialog` SHALL display a grabber handle at the
top of the sheet and SHALL allow the user to dismiss it by dragging the sheet downward from
that handle. A downward drag that passes the dismissal threshold SHALL close the dialog; a
drag released before the threshold SHALL animate the sheet back to its resting position and
stay open. Dragging SHALL originate from the grabber region so that scrollable content
inside the sheet is unaffected.

#### Scenario: Drag past the threshold closes the dialog

- **WHEN** the user drags the grabber downward past the dismissal threshold and releases
- **THEN** the dialog closes

#### Scenario: Drag released early snaps back

- **WHEN** the user drags the sheet downward but releases before the dismissal threshold
- **THEN** the sheet animates back to its resting position and the dialog stays open

#### Scenario: No drag affordance on desktop

- **WHEN** the same `Dialog` is shown at or above the `sm` breakpoint
- **THEN** no grabber handle is rendered and drag-to-dismiss is inactive

### Requirement: Destructive alerts require a deliberate choice

A destructive `AlertDialog` SHALL adopt the bottom-sheet presentation on mobile but SHALL
NOT display a grabber handle and SHALL NOT be dismissable by dragging. It SHALL remain
dismissable only through its explicit controls (Cancel / confirm actions) and the standard
overlay affordances it already supports.

#### Scenario: No grabber on a destructive alert

- **WHEN** an `AlertDialog` is shown as a mobile sheet
- **THEN** no grabber handle is present

#### Scenario: Dragging does not dismiss a destructive alert

- **WHEN** the user drags downward on an `AlertDialog` sheet
- **THEN** the alert does not close as a result of the drag

#### Scenario: Explicit controls still dismiss

- **WHEN** the user activates Cancel (or presses Escape)
- **THEN** the alert closes exactly as it did before this change

### Requirement: Dismissal decision combines distance and velocity

The drag-to-dismiss decision SHALL be a pure function of the drag distance, the sheet
height, and the release velocity. The dialog SHALL dismiss when the downward drag distance
exceeds a fixed fraction of the sheet height, OR when the downward release velocity exceeds
a fixed threshold; otherwise the sheet SHALL snap back. This decision function SHALL be
independent of the DOM so it can be unit-tested directly.

#### Scenario: Long drag dismisses regardless of speed

- **WHEN** the release distance exceeds the configured fraction of the sheet height
- **THEN** the decision is to dismiss

#### Scenario: Fast flick dismisses despite a short drag

- **WHEN** the release distance is below the fraction but the downward release velocity
  exceeds the configured threshold
- **THEN** the decision is to dismiss

#### Scenario: Short, slow drag snaps back

- **WHEN** both the release distance and the release velocity are below their thresholds
- **THEN** the decision is to snap back and keep the dialog open

### Requirement: Motion honours the reduced-motion preference

The sheet's enter, snap-back, and dismiss motion SHALL honour the user's
`prefers-reduced-motion` setting: when reduced motion is requested, positional transitions
SHALL be suppressed or minimised rather than animating the sheet's slide.

#### Scenario: Reduced motion suppresses the slide

- **WHEN** `prefers-reduced-motion: reduce` is set and a mobile sheet opens or closes
- **THEN** it appears or disappears without a sustained slide animation

### Requirement: Standard overlay affordances are preserved

Introducing the mobile sheet presentation SHALL NOT remove the overlay behaviours the
components provide today: focus is trapped while the overlay is open, Escape closes it per
its existing rules, overlay-click closes the non-alert `Dialog`, and the close (×) control
remains where it is currently rendered.

#### Scenario: Focus stays trapped in a mobile sheet

- **WHEN** a mobile sheet is open
- **THEN** keyboard focus is trapped within the sheet until it closes

#### Scenario: Escape and overlay-click still work

- **WHEN** the user presses Escape, or clicks the overlay of a non-alert `Dialog`
- **THEN** the overlay closes following the same rules as before this change
