# matrix-background Specification

## Purpose
TBD - created by archiving change lava-lamp-background. Update Purpose after archive.
## Requirements
### Requirement: The background shows ambient drifting blobs of contrast

The site background SHALL render the dot-matrix grid overlaid with several
soft-edged blobs of heightened contrast that drift continuously and autonomously
across the viewport. The drift SHALL require no pointer input and SHALL not
visibly repeat over short periods.

#### Scenario: Blobs drift on a still page

- **WHEN** the landing page is open on a device with motion enabled and the
  visitor does not move the pointer
- **THEN** several soft contrast blobs are visible over the dot grid
- **AND** they continue to drift and reposition over time with no pointer
  movement

### Requirement: Blobs fuse like liquid

When drifting blobs meet or pass close to one another they SHALL merge with a
smooth, liquid "necking" (metaball-style fusion) and separate smoothly, rather
than rendering as hard-edged discs or as independent shapes stacked on top of one
another.

#### Scenario: Two blobs pass close together

- **WHEN** two drifting blobs move close enough to touch
- **THEN** their edges join into a single shape with a smooth liquid neck
- **AND** as they continue past one another they separate smoothly back into
  distinct blobs

### Requirement: Blob edges fade softly

Each blob SHALL fade from full-contrast dots at its core to muted dots at its
edge with a soft, feathered gradient, with no hard outline — matching the
feathered falloff of the original cursor spotlight.

#### Scenario: A blob over the dot grid

- **WHEN** a blob is shown over the dot grid
- **THEN** its core reveals the dots at full contrast
- **AND** its edge fades gradually back to the muted periphery rather than ending
  at a hard edge

### Requirement: Blobs are anchored to the page, not the viewport

The blobs SHALL be positioned relative to the page content, so they drift with
the page as it scrolls rather than holding a fixed position on screen.

#### Scenario: Scrolling the page

- **WHEN** the visitor scrolls the page
- **THEN** each blob stays anchored to its place in the page content, moving with
  the content rather than appearing pinned to the viewport

### Requirement: The effect is ambient and runs on every device

Because the effect needs no pointer, it SHALL run on touch and mobile devices as
well as on pointer devices. The effect SHALL NOT be disabled for the absence of a
hover-capable pointer.

#### Scenario: Touch device

- **WHEN** the site is opened on a touch device
- **THEN** the ambient drifting blobs are shown over the dot grid

### Requirement: The background does not track the pointer in this version

The background SHALL NOT change in response to pointer position; the previous
cursor-follow spotlight reveal is no longer present. Pointer-driven interaction is
out of scope for this version.

#### Scenario: Moving the pointer

- **WHEN** the visitor moves the mouse across the page
- **THEN** the blobs continue their autonomous drift and do not follow, gather at,
  or otherwise react to the cursor

### Requirement: The drift respects reduced-motion preferences

When the visitor has `prefers-reduced-motion: reduce`, the background SHALL NOT
animate continuously. It SHALL present either a static composition of blobs or no
blob effect at all, with the dot grid still shown.

#### Scenario: Reduced motion is requested

- **WHEN** a visitor with `prefers-reduced-motion: reduce` loads the site
- **THEN** the blobs do not drift or animate continuously
- **AND** the dot-matrix grid is still visible

### Requirement: The animation pauses when the page is not visible

The drift animation SHALL pause while the document is hidden (e.g. a background
tab) and resume when the document becomes visible again, so it does not consume
resources off-screen.

#### Scenario: Tab is backgrounded and restored

- **WHEN** the tab is hidden
- **THEN** the drift animation is paused
- **WHEN** the tab becomes visible again
- **THEN** the drift resumes

### Requirement: The background reads correctly in both themes

The background SHALL derive its dot and overlay colours from the existing theme
tokens so that both the dot grid and the contrast blobs read correctly in light
and dark themes.

#### Scenario: Switching theme

- **WHEN** the active theme changes between light and dark
- **THEN** the dot grid and the drifting blobs remain legible against the page
  background in the new theme, with no manual recolouring required

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

