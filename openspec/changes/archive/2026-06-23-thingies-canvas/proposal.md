## Why

The site needs a new page — `/thingies` — as an ongoing art project: a grid of
small square visual experiments that grows over time. This change builds the
foundation so tiles can be added continually without rework: the page shell, the
pannable surface, the gap-free growth that places tiles automatically, and a
reusable tile frame. It deliberately stops short of scale-only work
(virtualisation) and authoring tooling, which follow as separate changes.

Full exploration context: `openspec/notes/thingies.md`.

## What Changes

- **New `/thingies` route** with its own full-bleed shell via an App Router route
  group — no footer, owns the full viewport, no document scroll — reusing the
  existing matrix dot grid (`bg-matrix`) and lava background *visuals* rather than
  the flow-based `MatrixBackground` wrapper.
- **A pannable plane**: the user drags to roam (pointer events, mouse + touch),
  and the dot-grid background pans *with* the tiles so they read as pinned to one
  surface. Panning is clamped to the filled area plus a margin. Pan only — no
  zoom.
- **Automatic gap-free "amoeba" growth**: tiles snap to a square lattice and are
  placed by a deterministic, append-only function of the tile list — each new
  tile shares a full edge with an existing one and never seals an empty cell into
  a hole. Placement favours filled neighbours (stays solid) with a seeded-random
  tie-break and mild outward bias, tuned "middle, leaning amoeba". No manual
  placement.
- **A reusable tile frame component**: a fixed-size square that lazily
  code-splits its content (each tile is its own chunk, loaded on demand), renders
  non-interactively (`pointer-events: none`), and isolates failures behind an
  error boundary so one broken tile can't blank the page.
- **A tile registry**: an explicit list of `{ id, title, date, load }` entries
  driving placement and lazy loading. Tiles float bare (no placard) for now.
- **2–3 seed tiles** to prove the contract end to end.

Out of scope (later changes): virtualisation / off-screen mount-windowing and
animation pause (`thingies-canvas`, Change 2); the add-a-thingy skill, the
single-tile preview route, and the published tile-contract doc
(`thingies-authoring`, Change 3).

## Capabilities

### New Capabilities
- `thingies-canvas`: the `/thingies` page — its full-bleed shell, the pannable
  surface with the background panning in lock-step, the automatic gap-free tile
  growth on a lattice, and the reusable lazy, non-interactive, error-isolated tile
  frame. (Virtualisation requirements will be added to this same capability by
  Change 2.)

### Modified Capabilities
<!-- None. The matrix-background capability is reused as-is (visuals only); no
     existing requirement changes. -->

## Impact

- **New code** under `src/app/` (a route group + `/thingies` page and layout) and
  `src/features/thingies/` (canvas, tile frame, registry, seed tiles), per the
  bulletproof-react feature convention.
- **Reused, unchanged**: the `bg-matrix` CSS utility and the lava background
  components/styles in `src/components/layout/matrix-background/` and
  `src/globals.css` — visuals only.
- **Shell**: the new route opts out of the root layout's footer and document-flow
  wrapping via a route group; the existing CV page is unaffected.
- **Dependencies**: none added — pan is DIY pointer events, in keeping with the
  site's lean dependency set. (A pan/zoom library would only be warranted if zoom
  were added later.)
- **Accessibility**: tile contents are decorative and non-interactive; the page
  must still honour `prefers-reduced-motion` (consistent with the existing
  background) and keep the header usable.
- **Navigation**: a link to `/thingies` may be added from the header/site, but is
  not required by this change.
