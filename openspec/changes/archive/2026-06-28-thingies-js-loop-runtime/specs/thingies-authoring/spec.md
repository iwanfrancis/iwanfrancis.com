## MODIFIED Requirements

### Requirement: A canonical tile-contract document is the single source of truth

The project SHALL provide one tile-contract document, colocated with the thingies
feature, that enumerates every guarantee a tile must satisfy: self-contained from
other tiles / features / app code (third-party libraries permitted when imported
within the tile, so they are lazy-loaded with it; and the thingies runtime loop
hooks permitted as the sanctioned same-feature API — these are the harness, not
another tile), scale-independent so it looks the same at any tile size, fills a
fixed square, decorative and non-interactive, honours `prefers-reduced-motion`, is
drawn in foreground ink by default with palette colour used only as an optional,
tiered, minority accent (never a whole-tile colour), avoids hairline line work (no
fixed-pixel `border` for scaled lines, no ~1px viewBox strokes) unless a fine line
is deliberately the point, default-exports the component the registry loads, and
prefers SVG / CSS over 2D canvas (with WebGL the exception). The document SHALL
state how a tile may run a JavaScript loop: CSS animation freezes off-screen
automatically, and a tile that needs a JS loop SHALL drive it through the runtime
loop hooks so it freezes off-screen too, whereas a raw `requestAnimationFrame` or
`setInterval` not wired through those hooks SHALL NOT freeze and SHALL keep doing
unseen work until the tile unmounts. The authoring tool and any hand-author SHALL
follow this document, and a change to the contract SHALL be made in this one place.

#### Scenario: The contract is documented in one place

- **WHEN** an author needs to know what a tile must satisfy
- **THEN** a single tile-contract document states the full contract
- **AND** no competing, separate definition of the contract exists

#### Scenario: The contract covers each guarantee

- **WHEN** the contract document is read
- **THEN** it lists, at minimum: scale-independence, the contained-and-lazy
  dependency allowance, decorative / non-interactive, reduced-motion-safe, fills the
  square, ink-by-default colour with palette as a tiered minority accent, the
  no-hairline line-weight guidance, default export, and the
  prefer-SVG/CSS-over-canvas guidance

#### Scenario: The contract documents the JS-loop path

- **WHEN** an author needs to run a JavaScript loop in a tile
- **THEN** the contract document directs them to the runtime loop hooks as the
  sanctioned way to make that loop freeze off-screen
- **AND** it warns that a raw `requestAnimationFrame` / `setInterval` not wired
  through those hooks will not freeze and will leak work until the tile unmounts

### Requirement: A tile may use contained, lazy-loaded dependencies

A tile MAY use third-party libraries. Any such dependency SHALL be imported within
the tile's own module so it is code-split into that tile's lazy-loaded chunk — which
loads only when the tile is on screen — and SHALL NOT affect the initial page load
or any other tile. A tile SHALL NOT import from other tiles, other features, or app
code; the thingies runtime loop hooks are the one sanctioned exception, imported as
the harness API rather than as cross-tile code. A library that runs its own
animation loop SHALL be frozen off-screen only if its loop is driven or gated
through the runtime loop hooks; a loop left to run on its own SHALL remain subject
to the off-screen-freeze caveat and keep working unseen until unmount. A library
that uses WebGL remains subject to the live-context cap and SHALL be used
accordingly.

#### Scenario: A library rides in the tile's own chunk

- **WHEN** a tile imports a third-party library within its module
- **THEN** that library is bundled into the tile's on-demand chunk
- **AND** the initial page bundle and the other tiles are unaffected

#### Scenario: A tile does not reach across the app

- **WHEN** a tile is authored
- **THEN** it does not import from other tiles, other features, or app code
- **AND** the only sanctioned shared import is the thingies runtime loop hooks

#### Scenario: A JS loop freezes only when wired through the hooks

- **WHEN** a tile runs a JavaScript loop driven through the runtime loop hooks
- **THEN** that loop pauses while the tile is off-screen and resumes on return
- **WHEN** a tile instead runs a raw loop not wired through the hooks
- **THEN** that loop keeps running off-screen until the tile unmounts
