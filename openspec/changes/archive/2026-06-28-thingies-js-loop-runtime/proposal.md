## Why

The off-screen freeze only pauses CSS animation (it sets `animation-play-state:
paused`). A tile that needs a JavaScript loop — a simulation like a snake game, a
physics toy, or a third-party library with its own `requestAnimationFrame` — keeps
running unseen off-screen, the exact waste the windowing exists to prevent. So the
tile contract currently steers authors away from JS loops altogether. We want
JS-loop tiles to be first-class while still freezing off-screen, in step with the
existing CSS freeze.

## What Changes

- Add a small, feature-scoped **runtime API** (React hooks) that lets a tile run a
  JS loop the canvas can freeze. One primitive plus two ergonomic wrappers:
  - `useThingyActive(): boolean` — the **primitive / escape hatch**. `false` while
    the tile is off-screen (outside the active band) or the tab is hidden. A tile
    using a custom loop or third-party engine reads this and stops its own work.
  - `useThingyFrame(tick, opts?)` — **rAF convenience** (continuous motion). Calls
    `tick(dt)` only while active; `dt` is measured from the last tick that actually
    ran, so resume after a freeze yields a normal-sized `dt`, never a jump; skips
    under `prefers-reduced-motion`.
  - `useThingyInterval(fn, ms)` — **fixed-cadence convenience** (a game clock).
    Fires only while active; auto-clears when inactive or unmounted. This is the
    natural fit for a grid game like snake ("move one cell every N ms").
- The tile frame **broadcasts** its active/frozen state — already computed for the
  CSS freeze — to its content via React context, giving the hooks a signal to read.
  The existing `.thingy-frozen` CSS path is unchanged; both mechanisms ride the one
  `frozen` boolean.
- **Freeze semantics**: pause-and-resume (skip the lost time, like CSS), state
  preserved while a tile stays within the margin band, **full reset on unmount**
  (panning far enough away and back restarts the loop). No tile state persists
  outside the tile.
- **Update the tile contract**: rewrite the current "prefer CSS, JS isn't frozen"
  guidance into "use the loop hooks for JS loops; raw `rAF`/`setInterval` still
  won't freeze and leaks until unmount", and carve out the hooks as a **sanctioned
  same-feature import** (the harness API, not "another tile").
- Add a **snake-game tile** as the proving ground and reference for the new API.

## Capabilities

### New Capabilities

- `thingies-runtime`: the runtime hook API — an active-state primitive plus rAF and
  interval convenience hooks — that lets a tile run a JS loop which auto-pauses
  while off-screen or the tab is hidden, resumes on return without a time jump, and
  honours reduced motion.

### Modified Capabilities

- `thingies-canvas`: the off-screen-pause requirement — the frame additionally
  exposes its active/frozen state to tile content (not only the CSS
  `animation-play-state` freeze), so JS-driven animation can freeze in step with
  CSS animation.
- `thingies-authoring`: the tile-contract document and the contained-dependency
  requirement — JS loops become first-class via the runtime hooks; the contract
  documents the sanctioned loop API and the caveat that raw `rAF`/`setInterval`
  still won't freeze.

## Impact

- **Code**: new hooks under `src/features/thingies/hooks/`
  (`use-thingy-active`, `use-thingy-frame`, `use-thingy-interval`); an active-state
  context provider added in `components/thingy-frame.tsx` wrapping tile content;
  a rewrite of the tile-contract `thingies/README.md`; a new reference tile
  `src/features/thingies/thingies/0007-snake/`.
- **APIs**: a new feature-internal hook API consumed by tiles. No change to
  existing tiles — they ignore the context and keep working unchanged.
- **Authoring tool**: the `add-a-thingy` skill's default scaffold stays a CSS tile;
  the runtime hooks are documented as the opt-in JS-loop path, not the default.
- **Dependencies**: none — the hooks are hand-rolled; no new packages.
- **Risk**: the JS freeze is cooperative, not browser-enforced. A tile that ignores
  the hooks and hand-rolls a loop will leak off-screen work — bounded by the
  existing unmount at the mount-band edge, which kills even a rogue loop.
