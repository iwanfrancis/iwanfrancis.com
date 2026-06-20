# landing-experience Specification

## Purpose

Define how the landing page's Experience section presents Iwan's roles — their
ordering, the current Valve Space position, and the vertical spacing that keeps
the section's heading from hugging the top of the viewport (both on scroll and
when reached via the in-page anchor).
## Requirements
### Requirement: Experience roles are listed most-recent first

The Experience section SHALL present roles in reverse-chronological order, with
the most recent role first.

#### Scenario: Current role appears at the top

- **WHEN** the landing page renders the Experience section
- **THEN** the current role (Valve Space) appears as the first `Company` entry,
  above Apadmi, Red Hat and IBM

### Requirement: Valve Space role is shown as the current position

The Experience section SHALL include a Valve Space entry representing Iwan's
current role. The entry SHALL link to the Valve Space website and display a
title, dates ending in a present-tense marker (e.g. "Present"), and a summary.

#### Scenario: Valve Space entry is rendered

- **WHEN** the landing page renders the Experience section
- **THEN** a `Company` entry titled "Valve Space" is shown
- **AND** its dates indicate the role is ongoing (e.g. ends with "Present")
- **AND** the company name links to the Valve Space website

#### Scenario: Valve Space copy is supplied, not invented

- **WHEN** the Valve Space entry is implemented
- **THEN** its title, dates, summary, highlights and skills are the values Iwan
  supplied, with no fabricated figures or claims

### Requirement: Experience content does not hug the top of the viewport

The Experience section SHALL leave visible vertical breathing room above its
heading so that, when the section follows the full-height Hero, its content does
not sit flush against the top edge of the viewport.

#### Scenario: Scrolling past the Hero

- **WHEN** a visitor scrolls from the Hero into the Experience section
- **THEN** the "Experience" heading has clear space above it rather than meeting
  the top edge of the viewport directly

### Requirement: The experience anchor jump lands with space above the heading

Following the "See my work" link to `#experience` SHALL bring the heading into
view with space above it, not flush to the top of the viewport. The space above
the heading is provided by the global header-clearance offset defined by the
`section-navigation` capability, not by a per-target `scroll-margin-top`.

#### Scenario: Following the "See my work" link

- **WHEN** a visitor activates the "See my work" link targeting `#experience`
- **THEN** the page scrolls so the "Experience" heading is visible with space
  above it rather than flush to the top of the viewport

