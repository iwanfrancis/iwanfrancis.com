## MODIFIED Requirements

### Requirement: Chrome layout and behaviour are preserved

Making the chrome generic SHALL NOT change how navigation behaves or the footer's
composition. The header SHALL keep its logo-left layout, sticky positioning, and
on-scroll shadow, with the site actions (e.g. the theme toggle) and the nav menu
control on the right. Its nav links SHALL continue to drive in-page fragment
navigation — now from within the menu (see "Header nav collapses into a responsive
menu control"). The footer SHALL keep its centred row, the `actions` slot, and an
always-present scroll-to-top control.

#### Scenario: Header still navigates and reacts to scroll

- **WHEN** a visitor opens the header menu, activates an in-page nav link, and then
  scrolls the page
- **THEN** the page navigates to the target section as before
- **AND** the header gains its shadow once the page is scrolled away from the top

#### Scenario: Footer still offers actions and scroll-to-top

- **WHEN** the footer is rendered with an `actions` slot supplied
- **THEN** the actions appear alongside the social links
- **AND** a scroll-to-top control is present that returns the visitor to the top

## ADDED Requirements

### Requirement: Header nav collapses into a responsive menu control

The header SHALL NOT render its nav links as an always-visible inline row. Instead it
SHALL present a single burger control that opens a menu containing the links. On
larger (desktop) viewports the control SHALL open a dropdown menu anchored to the
control; on smaller (mobile) viewports it SHALL open a side sheet panel. Both
surfaces SHALL render the same link list from the `links` prop. The burger control
SHALL have an accessible label, and the menu SHALL be keyboard-operable and close on
selection or dismissal. Site actions supplied via the actions slot (e.g. the theme
toggle) SHALL remain inline in the header rather than moving inside the menu.

#### Scenario: Desktop opens a dropdown menu

- **WHEN** a visitor on a desktop-width viewport activates the header burger control
- **THEN** a dropdown menu opens listing the nav links
- **AND** the same links defined in `siteConfig` appear in it

#### Scenario: Mobile opens a sheet panel

- **WHEN** a visitor on a mobile-width viewport activates the header burger control
- **THEN** a sheet panel opens listing the nav links
- **AND** the same links defined in `siteConfig` appear in it

#### Scenario: Selecting a link closes the menu and navigates

- **WHEN** a visitor selects a nav link from the open menu or sheet
- **THEN** navigation to that link's destination occurs
- **AND** the menu or sheet closes

#### Scenario: Theme toggle stays inline

- **WHEN** the header is rendered with an `actions` slot supplied
- **THEN** the actions (e.g. the theme toggle) are visible in the header bar itself
- **AND** they are not hidden inside the burger menu

#### Scenario: Opening the menu does not shift the page

- **WHEN** a visitor opens the menu on a page that has a vertical scrollbar
- **THEN** the page content does not shift horizontally as the menu opens or closes

### Requirement: Nav links may be external away-links

A nav link SHALL be able to point to an external destination. Each `NavLink` MAY
carry an `external` flag; when set, the rendered link SHALL open in a new tab with
`rel="noopener noreferrer"` and SHALL carry a visible affordance indicating it leaves
the site. Links without the flag (in-page fragment anchors and internal routes) SHALL
keep their existing same-tab navigation. Within the menu, external away-links SHALL be
visually separated from internal links.

#### Scenario: External away-link opens safely in a new tab

- **WHEN** the menu renders a nav link marked `external` (e.g. the game at
  `balls.iwans.space`)
- **THEN** the link opens in a new tab with `rel="noopener noreferrer"`
- **AND** it shows an affordance indicating it is an external link

#### Scenario: Internal and anchor links keep same-tab behaviour

- **WHEN** the menu renders a nav link that is not marked `external` (e.g. `/#hero` or
  `/thingies`)
- **THEN** activating it navigates in the same tab
- **AND** in-page fragment links still scroll to their target section

#### Scenario: External links are separated from internal ones

- **WHEN** the menu contains both internal nav links and one or more external
  away-links
- **THEN** the external away-links are grouped below a separator from the internal
  links
