## MODIFIED Requirements

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
