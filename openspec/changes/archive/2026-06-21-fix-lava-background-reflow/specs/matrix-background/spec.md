## ADDED Requirements

### Requirement: The field stays stable when page content reflows

The blob field SHALL NOT reposition in response to changes in the page's height
caused by content reflow (for example expanding or collapsing a section). Only an
actual viewport resize MAY re-distribute the blobs. The muting scrim SHALL
continue to cover the full page, including any area revealed by the reflow.

#### Scenario: Expanding or collapsing a section

- **WHEN** a collapsible region of the page expands or collapses, changing the
  overall page height
- **THEN** the blobs stay in place — the field does not slide, lurch, or rescale
  in response to the height change
- **AND** the muting scrim still covers the full page, including any newly
  revealed area

#### Scenario: Resizing the viewport

- **WHEN** the browser viewport is resized
- **THEN** the blob field MAY re-distribute to suit the new viewport size
