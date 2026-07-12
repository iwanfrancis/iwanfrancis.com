## ADDED Requirements

### Requirement: Focus rings indicate keyboard focus only

Interactive controls SHALL display their focus ring only when focus is drawn via
`:focus-visible` — that is, keyboard navigation or programmatic focus that the browser
resolves as keyboard-originated. Controls SHALL NOT display a focus ring for pointer-driven
focus (mouse click or touch tap). This applies to all shared interactive controls, including
the dismiss (×) controls of overlays that a library auto-focuses when the overlay opens.

The global focus style already targets `:focus-visible`; individual controls SHALL style
their focus ring off `:focus-visible` rather than plain `:focus`, so a control cannot opt a
pointer-focus ring back in.

#### Scenario: Keyboard focus shows a ring

- **WHEN** a user moves focus to an interactive control with the keyboard (e.g. Tab)
- **THEN** the control shows its focus ring

#### Scenario: Pointer focus shows no ring

- **WHEN** a user focuses an interactive control by clicking or tapping it with a pointer
- **THEN** the control does not show a focus ring

#### Scenario: Overlay opened by pointer does not ring its close control

- **WHEN** a `Dialog` or nav `Sheet` is opened with a mouse or touch, and the library
  auto-focuses the overlay's close (×) control
- **THEN** the close control does not show a focus ring

#### Scenario: Overlay opened by keyboard rings its close control

- **WHEN** a `Dialog` or nav `Sheet` is opened with the keyboard and the close (×) control
  receives focus
- **THEN** the close control shows its focus ring
