## Why

The ambient lava-lamp background positions each blob as a fraction of the matrix
container's **live** height. So whenever the page height changes, every blob
repositions. The Experience section's collapsibles animate their height open and
shut (~200ms), which drags the whole field up and down on every "see more"
toggle.

Measured (with drift frozen so height is the only variable): expanding one
collapsible grew the page 2055px → 2711px (**+656px**) and shifted the blob
field's vertical centre **330px downward** — blobs in the hero visibly drained
away even though the hero content never moved. An ambient background should not
react to a UI toggle elsewhere on the page.

## What Changes

- Decouple blob **vertical anchoring** from the live container height: anchor to
  a height captured at mount and refreshed only on an actual **viewport (window)
  resize**, not on content reflow.
- Keep the canvas backing store tracking the live container size, so the muting
  scrim and effect always cover the full page, including any newly revealed area.
- Defensive: redraw immediately after a backing-store resize so a reflow can
  never leave an unmuted frame (a possible, though not yet observed, flicker).
- No change to drift, fusion, soft edges, the fade-in, theming, reduced-motion,
  visibility pausing, or scroll-with-content behaviour.

## Capabilities

### New Capabilities

<!-- none -->

### Modified Capabilities

- `matrix-background`: add a requirement that the blob field stays stable when
  page content reflows (height changes from expanding/collapsing a section do not
  move the blobs); only a viewport resize may re-distribute them. The existing
  scroll-with-content behaviour is unchanged.

## Impact

- **`src/components/layout/matrix-background/use-lava-field.ts`** — the only code
  change: anchor blob `y` to a stable captured height; refresh that reference on
  `window` resize only (not on the `ResizeObserver` content-reflow path); keep the
  canvas backing store sized to the live container; redraw right after a resize.
- No CSS or component-structure changes expected.
- No new dependencies.
