## ADDED Requirements

### Requirement: The drift can be paused by the host

The background SHALL accept an external pause input from its host. While that input
is set, the drift animation SHALL be suspended in the same way it is while the
document is hidden — holding a static frame and performing no continuous animation
work — and SHALL resume when the input is cleared (subject to the document being
visible and reduced motion not being requested). The input SHALL default to
un-paused, so existing usages that do not pass it — such as the landing page — are
unaffected and continue to drift.

#### Scenario: Host pauses the drift

- **WHEN** the host sets the background's pause input
- **THEN** the drifting blobs hold still and the animation does no continuous work

#### Scenario: Host resumes the drift

- **WHEN** the host clears the pause input while the document is visible and motion
  is allowed
- **THEN** the drift resumes

#### Scenario: Default usage is unaffected

- **WHEN** a host renders the background without supplying a pause input
- **THEN** the background drifts as before, with no behaviour change
