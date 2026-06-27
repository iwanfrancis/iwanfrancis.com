## RENAMED Requirements

- FROM: `### Requirement: Visitors can toggle the theme from the footer`
- TO: `### Requirement: Visitors can toggle the theme from anywhere on the site`

## MODIFIED Requirements

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
