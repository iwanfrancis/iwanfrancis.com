## Context

Change 1 (`thingies-canvas`) and the zoom follow-up (`thingies-zoom`) shipped a
full-bleed `/thingies` surface. Today `ThingyCanvas` renders **all** tiles
unconditionally (`layout.tiles.map(...)`), and `ThingyFrame` keeps each tile's
CSS animations running for the lifetime of the component. The seed tiles all
animate via `motion-safe:animate-*` (no JS/rAF, no canvas yet).

The pan/zoom engine in `use-pan-zoom.ts` is deliberately **imperative**: `offset`
and `scale` live in closure variables inside one `useEffect`, and
`applyTransform()` writes `translate(...) scale(...)` straight to the dots and
tiles layers' `style.transform` at 60fps. React never re-renders during a pan —
that is what keeps it smooth. The tiles layer is positioned at `left/top: 50%`
with `transform-origin: 0 0`, and each tile sits at layer-local `left =
col·PITCH − centreX`, `top = row·PITCH − centreY` (blob bbox centre at 0,0).

This change adds mount-windowing and off-screen pausing as a layer on top, without
disturbing that imperative core or the tile contract.

## Goals / Non-Goals

**Goals:**

- Mount only tiles within the visible world rect + a margin band; keep the mounted
  count bounded by viewport × zoom, not by list length.
- Make the window scale-aware: visible world rect = viewport ÷ scale.
- Stop off-screen animation work in a settled view, and avoid an unmount stutter
  at the visible edge during a fast pan (pause first, unmount deeper out).
- Zero change to the tile contract, the registry, or how tiles are authored.
- No new dependencies; keep the 60fps imperative pan/zoom path intact.

**Non-Goals:**

- Reworking placement, pan, zoom, fling, bounds, or error isolation (all unchanged).
- A general off-screen-pause API for arbitrary JS/canvas tiles (current tiles are
  CSS; see Risks). The contract still says "prefer SVG/CSS".
- Baking coordinates into the registry, or any persistence change.
- Inertia/scroll changes, authoring tooling (Change 3).

## Decisions

### 1. React owns mount/unmount; the engine stays imperative

Tiles are dynamically-imported React components, so mounting/unmounting them — to
free their chunk instance, DOM, and animations — must go through React's tree.
`ThingyCanvas` will hold a small piece of state describing the **visible cell
band** and render `tiles.filter(inBand)`.

- **Alternative — toggle `display:none` imperatively** (no React state): rejected.
  It keeps every tile mounted (no memory freed) and, for future JS tiles, keeps
  timers running. It doesn't deliver the actual win.
- **Alternative — lift `offset`/`scale` into React state**: rejected. It would
  re-render every frame and destroy the imperative 60fps path that Change 1/zoom
  built on purpose.

### 2. Engine → React via an rAF-throttled, change-only notification

`usePanZoom` gains an optional `onViewport` callback (stored in a ref like
`layoutRef`, so the once-bound listeners see the live one). A
`scheduleViewportNotify()` coalesces calls to **one per animation frame**: it sets
a pending flag + a single `requestAnimationFrame` that invokes
`onViewport({ offsetX, offsetY, scale, vw, vh })`. It is called at the end of the
existing transform paths (drag, wheel, pinch, fling step, zoom step, resize).

`ThingyCanvas` converts that viewport into an integer cell band and calls
`setState` **only when the band changes** (crosses a cell boundary) — a few times
per second during a pan, not 60×. So: continuous notify (so tiles appear while you
pan, not only when you stop), but re-render only on band change.

- **Alternative — notify only on interaction-end** (pointerup / wheel-session-end
  / zoom-settle): rejected. You'd pan into blank space and tiles would pop in only
  after stopping.

### 3. Visibility maths: a pure helper over the known lattice

A new pure module `src/features/thingies/utils/visible-band.ts` computes the
visible band from the viewport. With the layer anchored at viewport centre,
`transform-origin: 0 0`, transform `translate(offset) scale(scale)`, a screen
point maps to layer-local coords by `local = (screen − centre − offset) / scale`.
The visible world rect (layer-local) is therefore:

```
cx = vw / 2;  cy = vh / 2
worldLeft   = (0  − cx − offsetX) / scale
worldRight  = (vw − cx − offsetX) / scale
worldTop    = (0  − cy − offsetY) / scale
worldBottom = (vh − cy − offsetY) / scale
```

A tile occupying local `[left, left+TILE_SIZE] × [top, top+TILE_SIZE]` is in a
band if its rect intersects the world rect expanded by that band's margin. Margins
are in **world (layer-local) px**, so they're constant across zoom (the rect
already divides by scale). The helper returns, per tile index, whether it is in
the **mount** band and whether it is **active**. Cheap to run over hundreds of
tiles; no windowing library needed (consistent with the lean-deps stance).

### 4. Two bands: ACTIVE ⊂ MOUNT, unmount beyond

- **ACTIVE** = visible world rect + small `ACTIVE_MARGIN`. Tiles here are mounted
  **and** animating.
- **MOUNT** = visible world rect + larger `MOUNT_MARGIN`. Tiles here are mounted.
  A tile in MOUNT but outside ACTIVE is **frozen** (mounted, animation paused).
- Beyond MOUNT → unmounted (resources freed).

This directly implements "pause, don't just unmount": animation stops the moment a
tile leaves the strict viewport (the perf win), while the actual teardown happens
deeper out — ideally after the pan has slowed — so there's no unmount stutter
right at the visible edge. `MOUNT_MARGIN` is generous enough that crossing it
needs sustained panning.

### 5. Generic freeze via a CSS class, not per-tile cooperation

`ThingyFrame` takes a `frozen` boolean. When frozen it adds a `thingy-frozen`
class whose rule (added to `globals.css`) pauses all descendant CSS animations:

```css
.thingy-frozen, .thingy-frozen * { animation-play-state: paused !important; }
```

`animation-play-state` is not inherited, hence the descendant selector. This is
generic (tile authors do nothing), matches the all-CSS reality of current tiles,
and composes with `prefers-reduced-motion` (a non-animating tile has nothing to
pause). Unmounting (band exit) remains the universal stop for anything CSS can't
cover.

- **Alternative — `content-visibility: hidden`** on frozen tiles: considered. It
  also skips paint/layout and is generic, but adds a style-recalc on every toggle
  and complicates intrinsic sizing. Kept in reserve; the animation-pause class is
  the simpler, sufficient first cut.

## Risks / Trade-offs

- **A future JS/rAF or canvas tile won't auto-freeze while in the MOUNT band** →
  the CSS-class pause only stops CSS animations. Mitigation: the contract already
  says "prefer SVG/CSS, WebGL is the exception"; such tiles still fully stop on
  unmount beyond the band, so the unbounded-growth risk is still solved. A
  cooperative visibility hook can be added with Change 3 if a JS tile ever needs it.
- **Re-render churn if the band thrashes at a cell boundary** → mitigated by
  computing an integer band and only setting state on change, plus the ACTIVE/MOUNT
  hysteresis gap (a tile must travel the whole margin gap to flip mount state).
- **Remount cost on fast pans (chunk re-evaluation, dynamic import)** → the import
  is cached after first load, so remount is cheap; `MOUNT_MARGIN` keeps remounts
  away from the visible edge. If profiling shows churn, widen the margin.
- **First paint before the container is measured** → on mount, compute an initial
  band from the measured container rect at offset 0 / scale 1; until then render
  the central band. No layout shift because the frame reserves tile-sized space.
- **Hard to unit-test without a runner** (no test suite yet) → keep the maths in
  the pure `visible-band.ts` helper so it's verifiable by inspection and ready for
  tests when a runner lands; verify the rest in-browser (as JITTER/zoom were).

## Migration Plan

Additive and behind no flag — with a handful of tiles the page looks and pans
identically. Steps: (1) add the viewport notification to `usePanZoom`; (2) add the
pure `visible-band` helper + margin constants; (3) filter rendered tiles and pass
`frozen` in `ThingyCanvas`/`ThingyFrame`; (4) add the freeze CSS. Rollback is
reverting these edits; no data, route, or contract changes. Verify in-browser by
temporarily padding the registry with many tiles and watching the mounted count
and frame rate while panning/zooming.

## Open Questions

- Exact `ACTIVE_MARGIN` / `MOUNT_MARGIN` values — to be felt out in-browser (like
  `JITTER` and the zoom tunables); start around half a tile and a few tiles
  respectively.
- Whether to also adopt `content-visibility` for frozen tiles — defer until
  profiling with realistic tile counts says it's needed.
