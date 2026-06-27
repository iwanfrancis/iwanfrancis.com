# site-chrome Specification

## Purpose

Defines the shared header and footer shell that wraps the site's pages. The chrome is
presentational: its nav links, branding, and social/contact links are supplied as props
from a single `siteConfig` rather than hard-coded, so the header, footer, and landing
hero all draw their link data from one source of truth. Covers what the chrome renders,
how site-specific content is passed in, the shared `SocialLinks` component, and the rule
that the chrome stays free of site-specific data — all while preserving the existing
layout and navigation behaviour.

## Requirements

### Requirement: Site chrome holds no site-specific content

The shared `Header` and `Footer` components SHALL be presentational. They SHALL NOT
hard-code site-specific data — nav-link labels and destinations, social-link URLs,
contact addresses, or branding. All such content SHALL be supplied to them as props.
The chrome components SHALL NOT import site-specific values (e.g. `EMAIL`, hard-coded
profile URLs) directly.

#### Scenario: Header receives its nav links and logo as props

- **WHEN** the `Header` is rendered
- **THEN** the nav links it shows come from a `links` prop and its brand mark comes
  from a `logo` prop/slot
- **AND** the `Header` source contains no hard-coded link destinations or branded
  logo import

#### Scenario: Footer receives its social links as props

- **WHEN** the `Footer` is rendered
- **THEN** the social/contact links it shows come from a `socials` prop
- **AND** the `Footer` source contains no hard-coded GitHub/LinkedIn/email values

### Requirement: One source of truth for site links

The site's nav links and social links SHALL be defined once, in a single
`siteConfig` module under `config/`. Every place that renders these links — the
header, the footer, and the landing hero — SHALL read from that config rather than
declaring its own copy.

#### Scenario: Changing a link in one place updates every surface

- **WHEN** a social link's URL is changed in `siteConfig`
- **THEN** the footer and the landing hero both reflect the new URL
- **AND** no other copy of that URL exists elsewhere in the source

### Requirement: Social links render through one shared component

A single shared `SocialLinks` component SHALL render the icon-link cluster. The
`Footer` and the landing `Hero` SHALL both use it rather than each repeating the
icon-button-and-anchor markup. Each external social link SHALL keep its accessible
label and open safely (external links use `rel="noopener noreferrer"`).

#### Scenario: Footer and hero share one implementation

- **WHEN** the social-link markup needs to change (e.g. button size or a11y label)
- **THEN** the change is made once in `SocialLinks` and applies to both the footer
  and the hero

#### Scenario: External social links remain accessible and safe

- **WHEN** `SocialLinks` renders an external link
- **THEN** the link has an `aria-label` and opens with `target="_blank"` and
  `rel="noopener noreferrer"`

### Requirement: Chrome layout and behaviour are preserved

Making the chrome generic SHALL NOT change what visitors see or how navigation
behaves. The header SHALL keep its logo-left / nav-right layout, sticky positioning,
and on-scroll shadow; its links SHALL continue to drive in-page fragment navigation.
The footer SHALL keep its centred row, the `actions` slot, and an always-present
scroll-to-top control.

#### Scenario: Header still navigates and reacts to scroll

- **WHEN** a visitor activates a header nav link and then scrolls the page
- **THEN** the page navigates to the target section as before
- **AND** the header gains its shadow once the page is scrolled away from the top

#### Scenario: Footer still offers actions and scroll-to-top

- **WHEN** the footer is rendered with an `actions` slot supplied
- **THEN** the actions appear alongside the social links
- **AND** a scroll-to-top control is present that returns the visitor to the top
