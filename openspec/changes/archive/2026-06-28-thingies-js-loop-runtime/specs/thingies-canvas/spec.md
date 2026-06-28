## MODIFIED Requirements

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
