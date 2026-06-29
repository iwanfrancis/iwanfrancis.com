# thingies-runtime Specification

## Purpose

Defines the runtime loop primitives the thingies feature provides to tiles so a
JavaScript-driven tile can pause and resume its work in step with the canvas's
off-screen freeze. Covers the active-state primitive (`useThingyActive`), the
frame loop (`useThingyFrame`), the fixed-cadence loop (`useThingyInterval`), and
the rule that loop state resets on unmount rather than on freeze. Canvas
behaviour (placement, pan, zoom, windowing, freeze) lives in `thingies-canvas`;
the tile contract lives in `thingies-authoring`.
## Requirements
### Requirement: A tile can read whether it is currently active

The thingies feature SHALL provide a hook (`useThingyActive`) that returns a single
boolean telling a tile whether it is currently active. The value SHALL be `true`
only when the tile is on-screen-active (within the active band the canvas already
computes) AND the document is visible AND the canvas is not globally paused; it
SHALL be `false` whenever the tile is off-screen within the freeze band OR the
browser tab is hidden OR the canvas is globally paused. The pause causes —
off-screen, tab-hidden, and global pause — SHALL be folded into this one boolean,
so a consumer need not distinguish them. When the hook is used outside a tile frame
(no active-state provider present), it SHALL default to `true` so a tile rendered in
isolation still runs.

This hook is the primitive escape hatch: a tile running a custom loop, a Web Worker,
or a third-party engine reads it and starts/stops its own work accordingly.

#### Scenario: Active while on-screen, visible, and not paused

- **WHEN** a tile is within the active band, the tab is visible, and the canvas is
  not paused
- **THEN** `useThingyActive()` returns `true`

#### Scenario: Inactive while off-screen

- **WHEN** a mounted tile is off-screen within the freeze band
- **THEN** `useThingyActive()` returns `false`

#### Scenario: Inactive while the tab is hidden

- **WHEN** the browser tab hosting an on-screen tile becomes hidden
- **THEN** `useThingyActive()` returns `false`
- **AND** it returns `true` again once the tab is visible

#### Scenario: Inactive while globally paused

- **WHEN** the canvas is globally paused while an on-screen tile is mounted
- **THEN** `useThingyActive()` returns `false`
- **AND** it returns `true` again once the canvas is unpaused (subject to the tile
  still being on-screen and the tab visible)

#### Scenario: Defaults to active without a provider

- **WHEN** the hook is used by a component rendered outside a tile frame
- **THEN** it returns `true` rather than throwing or returning `false`

### Requirement: A tile can run a frame loop that pauses off-screen

The thingies feature SHALL provide a hook (`useThingyFrame`) that runs a
`requestAnimationFrame` loop on the tile's behalf and invokes the tile's callback
once per frame, passing the elapsed time since the previous invocation. The loop
SHALL invoke the callback ONLY while the tile is active (per the active-state
rule above), and SHALL NOT invoke it while the tile is off-screen or the tab is
hidden. The elapsed time passed to the callback SHALL be measured from the last
invocation that actually ran, so the first frame after a freeze yields an ordinary
small delta rather than the whole frozen duration. The loop SHALL stop and release
its frame request when the tile unmounts, and SHALL NOT invoke the callback when
`prefers-reduced-motion: reduce` is set.

#### Scenario: Ticks only while active

- **WHEN** a tile drives animation with `useThingyFrame` and is on-screen
- **THEN** the callback is invoked each animation frame
- **WHEN** the tile moves off-screen into the freeze band
- **THEN** the callback stops being invoked until the tile is active again

#### Scenario: No time jump on resume

- **WHEN** a tile's frame loop has been frozen for several seconds and then resumes
- **THEN** the first elapsed-time value after resuming is an ordinary per-frame
  delta, not the accumulated frozen duration

#### Scenario: Reduced motion suppresses the loop

- **WHEN** a visitor has `prefers-reduced-motion: reduce`
- **THEN** `useThingyFrame` does not invoke the callback
- **AND** the tile shows its static initial render

#### Scenario: Unmount stops the loop

- **WHEN** a tile using `useThingyFrame` is unmounted
- **THEN** the pending animation-frame request is cancelled and the callback is no
  longer invoked

### Requirement: A tile can run a fixed-cadence loop that pauses off-screen

The thingies feature SHALL provide a hook (`useThingyInterval`) that invokes a
tile's callback on a fixed cadence (a given interval in milliseconds) ONLY while
the tile is active. The cadence SHALL be suspended while the tile is off-screen or
the tab is hidden, and SHALL resume when the tile becomes active again without
firing a burst of catch-up invocations for the suspended period. The interval SHALL
be cleared when the tile unmounts, and SHALL NOT run when `prefers-reduced-motion:
reduce` is set. This is the intended path for a discrete game clock such as a
grid-based snake that advances one step per tick.

#### Scenario: Fires only while active

- **WHEN** a tile schedules a callback with `useThingyInterval` and is on-screen
- **THEN** the callback fires on the fixed cadence
- **WHEN** the tile moves off-screen
- **THEN** the callback stops firing until the tile is active again

#### Scenario: No catch-up burst on resume

- **WHEN** a tile's interval has been suspended off-screen across many missed ticks
  and then resumes
- **THEN** the callback does not fire once per missed tick in a burst; it resumes
  at the normal cadence

#### Scenario: Unmount clears the interval

- **WHEN** a tile using `useThingyInterval` is unmounted
- **THEN** the interval is cleared and the callback is no longer invoked

### Requirement: Loop state resets on unmount, not on freeze

A tile's loop SHALL pause and resume in place while the tile remains mounted within
the margin band: the tile's own state (positions, score, simulation state held in
the component) SHALL be preserved across a freeze, so resuming continues from where
it paused. The runtime SHALL NOT persist any tile state outside the tile, so once a
tile leaves the margin band and unmounts, a later return SHALL start the tile —
and its loop — from its initial state.

#### Scenario: Resume continues mid-state within the band

- **WHEN** a tile is frozen off-screen within the band and then panned back into view
- **THEN** its loop resumes from the state it held when it froze, not from the start

#### Scenario: Return after unmount starts fresh

- **WHEN** a tile is panned far enough to leave the margin band and unmount, then
  later panned back into view
- **THEN** the tile mounts fresh and its loop begins from its initial state

