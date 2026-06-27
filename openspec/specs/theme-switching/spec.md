# theme-switching Specification

## Purpose

Gives the site a light and dark theme that visitors can switch between. On first
visit the theme follows the operating-system colour preference; an explicit choice
is persisted across visits and applied before first paint to avoid a flash of the
wrong theme. Toggling animates as a circular reveal where supported, and all
surfaces — including bespoke ones like the matrix background and company logo
plates — adapt to the active theme.
## Requirements
### Requirement: First visit follows the operating-system colour preference

On a visitor's first load, with no stored preference, the site SHALL render in the
theme matching the visitor's OS-level colour scheme (`prefers-color-scheme`).

#### Scenario: OS set to dark, no stored preference

- **WHEN** a visitor with no previously stored theme loads the site and their OS
  colour scheme is dark
- **THEN** the site renders in dark mode

#### Scenario: OS set to light, no stored preference

- **WHEN** a visitor with no previously stored theme loads the site and their OS
  colour scheme is light
- **THEN** the site renders in light mode

### Requirement: The chosen theme persists across visits

An explicitly chosen theme SHALL be stored and reapplied on subsequent loads,
overriding the OS preference until the visitor changes it again.

#### Scenario: Returning after choosing dark

- **WHEN** a visitor selects dark mode and later reloads or returns to the site
- **THEN** the site renders in dark mode regardless of the OS colour scheme

### Requirement: No flash of the wrong theme on load

The resolved theme SHALL be applied before first paint so the page does not render
in one theme and then visibly switch to another.

#### Scenario: Loading with a stored dark preference

- **WHEN** a visitor with a stored dark preference loads the site
- **THEN** the page paints in dark mode from the first frame, with no flash of
  light mode

### Requirement: Theme changes animate with a circular reveal

When supported, toggling the theme SHALL animate as a soft-edged circular reveal of
the new theme expanding from the toggle button, with a feathered (gradient) edge
echoing the soft-edged reveals of the matrix background. Where the View Transitions
API is unavailable (e.g. Firefox) or the visitor prefers reduced motion, the theme
SHALL change instantly with no animation.

#### Scenario: Reveal on a supporting browser

- **WHEN** a visitor on a browser that supports the View Transitions API activates
  the theme toggle
- **THEN** the new theme is revealed by a soft-edged circle expanding from the
  toggle button to cover the viewport
- **AND** the resulting theme and persistence behave exactly as an instant switch

#### Scenario: Instant fallback

- **WHEN** a visitor activates the toggle on a browser without View Transitions
  support, or with `prefers-reduced-motion: reduce` set
- **THEN** the theme changes instantly without animation

### Requirement: Theme-aware surfaces adapt to the active theme

All visible surfaces SHALL present correctly in both themes. Token-driven surfaces
(page background, text, header, footer, header logo, buttons, badges, cards,
borders, focus rings) follow the active theme automatically via the existing
shadcn tokens. The bespoke surfaces SHALL be made theme-aware:

- The matrix dot-grid background SHALL use a dot colour that reads correctly in
  both themes.
- The overlay surrounding the drifting contrast blobs SHALL lighten the page
  periphery in light mode and darken it in dark mode (not wash near-white in dark
  mode).
- Company logo plates SHALL keep a light (white) background in both themes so dark
  company marks stay legible against a dark page.

#### Scenario: Matrix background in dark mode

- **WHEN** the site is in dark mode
- **THEN** the matrix dot grid is visible against the dark background
- **AND** the area around the drifting blobs darkens rather than washing near-white

### Requirement: Visitors can toggle the theme from anywhere on the site

Site-wide chrome SHALL present a theme toggle that switches between light and dark
themes from every page, including pages whose layout does not render a footer. The
persistent header SHALL present the toggle on all routes; the footer SHALL also
present it on routes where the footer is rendered. Each toggle SHALL show a moon
while light is active and a sun while dark is active (or an equivalent two-icon
affordance), and SHALL expose an accessible label describing the action.

#### Scenario: Toggling from light to dark

- **WHEN** the site is in light mode and the visitor activates a theme toggle
- **THEN** the site switches to dark mode
- **AND** the toggle's icon updates to reflect the new state

#### Scenario: Toggling from dark to light

- **WHEN** the site is in dark mode and the visitor activates a theme toggle
- **THEN** the site switches to light mode

#### Scenario: Theme is switchable on a page without a footer

- **WHEN** a visitor is on a page whose layout does not render the footer (for
  example `/thingies`) and activates the theme toggle in the header
- **THEN** the site switches theme exactly as it would from the footer toggle

#### Scenario: Toggle is keyboard accessible

- **WHEN** a visitor focuses a theme toggle and activates it with the keyboard
- **THEN** the theme switches, and the control carries an accessible name stating
  it toggles the theme

