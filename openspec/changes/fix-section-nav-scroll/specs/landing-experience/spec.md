## MODIFIED Requirements

### Requirement: The experience anchor jump lands with space above the heading

Following the "See my work" link to `#experience` SHALL bring the heading into
view with space above it, not flush to the top of the viewport. The space above
the heading is provided by the global header-clearance offset defined by the
`section-navigation` capability, not by a per-target `scroll-margin-top`.

#### Scenario: Following the "See my work" link

- **WHEN** a visitor activates the "See my work" link targeting `#experience`
- **THEN** the page scrolls so the "Experience" heading is visible with space
  above it rather than flush to the top of the viewport
