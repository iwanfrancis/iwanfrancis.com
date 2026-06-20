# section-navigation Specification

## Purpose
TBD - created by archiving change fix-section-nav-scroll. Update Purpose after archive.
## Requirements
### Requirement: Fragment links scroll the window, not a nested container

Activating an in-page fragment link (e.g. `#hero`, `#experience`) SHALL scroll the
document/window to the target section. No ancestor wrapper of the page sections
SHALL act as a scroll container that intercepts fragment navigation, so the window
scroll position always reflects the visible content.

#### Scenario: Navigating to a section moves the window scroll position

- **WHEN** a visitor activates a header link targeting `#experience`
- **THEN** the window scroll position (`document.scrollingElement.scrollTop`) moves
  to bring the Experience section into view
- **AND** no nested wrapper element holds a non-zero `scrollTop` that hides content
  from the window scroll

### Requirement: Visitors can always scroll back up after navigating

Normal scrolling (mouse wheel, trackpad, or the window scrollbar) SHALL remain able
to reach every section after following a fragment link, including scrolling back up
to the Hero. The page SHALL NOT become stuck such that content scrolled out of view
is unreachable by ordinary scrolling.

#### Scenario: Scrolling back to the Hero after jumping to Experience

- **WHEN** a visitor activates a link targeting `#experience` and then scrolls up
- **THEN** the Hero section returns into view

### Requirement: Fragment navigation scrolls smoothly

Following an in-page fragment link SHALL animate the scroll smoothly rather than
jumping instantly to the target.

#### Scenario: Smooth scroll on link activation

- **WHEN** a visitor activates a header link targeting `#hero` or `#experience`
- **THEN** the page animates the scroll to the target rather than jumping in a
  single frame

### Requirement: Sections land clear of the fixed header

A section reached via a fragment link SHALL come to rest with visible space above
its heading rather than underneath the fixed site header. This offset SHALL be
applied once, globally (via `scroll-padding-top` on the root scroll element), so it
applies uniformly to every fragment target.

#### Scenario: Anchored section is not hidden behind the header

- **WHEN** a visitor activates a link targeting `#experience`
- **THEN** the Experience heading rests below the fixed header with space above it,
  not obscured by the header

### Requirement: Header navigation links behave consistently

The header's in-page navigation links SHALL use consistent history behaviour as one
another, so that activating any of them affects browser history the same way.

#### Scenario: Header links share history behaviour

- **WHEN** the header renders its in-page navigation links (e.g. `Home`,
  `Experience`)
- **THEN** each link applies the same history behaviour (either all replace the
  current history entry, or none do)

