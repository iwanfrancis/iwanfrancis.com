## MODIFIED Requirements

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
