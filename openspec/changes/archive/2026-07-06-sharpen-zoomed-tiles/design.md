## Context

The `/thingies` surface drives pan/zoom through one imperative engine in
`use-pan-zoom.ts`, which writes a single `translate(...) scale(...)` transform to
two layers (`dotsRef`, `tilesRef`) on every drag/wheel/pinch/fling/zoom frame.
Both layers carry a permanent inline `willChange: 'transform'` (set in
`thingy-canvas.tsx`).

`will-change: transform` promotes each layer to its own GPU compositor layer and
pins its raster: the browser rasterises the layer to a texture once and, on a
transform-only change, stretches that cached texture instead of re-rasterising.
That is what makes the zoom smooth — but it also means a static SVG, drawn while
the layer was last rasterised at some scale, is a *bitmap* being magnified. It
only becomes crisp again when the layer's content is invalidated (a repaint).
Animating tiles repaint every frame and self-heal; static tiles (and everything
under `prefers-reduced-motion`) stay blurred. `will-change` is documented as a
short-lived hint applied around an interaction, not a permanent style — the fix
is to use it that way.

## Goals / Non-Goals

**Goals:**
- After a zoom settles, tile and dot content renders crisp at the resting scale,
  including static / reduced-motion tiles, without relying on a later repaint.
- No perceptible regression in pan/zoom smoothness during an active gesture.
- Keep the change confined to the pan/zoom engine and the two layer refs; no
  change to transform maths, bounds, or focal anchoring.

**Non-Goals:**
- Changing the single-transform layer architecture (no per-tile counter-scaling).
- Improving crispness *during* an in-flight gesture (a moving target being
  composited is expected; the target is the resting state).
- Any change to how individual tiles draw or animate.

## Decisions

### Decision: Arm `will-change` on gesture start, release it after the transform settles

Drive `will-change` imperatively from the engine, mirroring how the transform is
already written. On the first transform change of a gesture, set
`willChange = 'transform'` on both layers; a fixed debounce after the last
transform change (no further drag/wheel/pinch frame, and any button/keyboard zoom
animation and fling have finished), set it back to `'auto'`. Dropping the hint
un-pins the raster, so the browser re-rasterises the layers at the resting scale —
crisp — and the next gesture re-arms it before movement is visible.

A single `markActive()` called from the existing `applyTransform()` chokepoint is
the natural hook: every path (drag, wheel, pinch, fling, zoom animation, resize)
already funnels through `applyTransform`, so one call there arms the hint and
(re)starts the settle timer. Releasing keys off a `setTimeout` cleared on each
`applyTransform`.

- **Alternative — remove `will-change` entirely:** simplest, but risks
  reintroducing compositing jank on lower-end devices during pan/zoom, which is
  exactly what the hint was added to prevent. Rejected: gives up a known win to
  fix a rest-state issue.
- **Alternative — force a repaint nudge on settle** (toggle a trivial style to
  invalidate the layer while keeping `will-change`): keeps the hint permanent but
  fights it; flicker-prone and less predictable than simply releasing the hint.
  Rejected.
- **Alternative — counter-scale each tile's geometry** so the layer never scales
  as a bitmap: crisp at all times but abandons the single-transform architecture
  and adds per-frame paint cost across many tiles. Over-engineered for a
  decorative surface. Rejected.

### Decision: Move the `willChange` style off the JSX into the engine

The layers currently declare `willChange: 'transform'` as a static inline style
in `thingy-canvas.tsx`. Ownership of that property moves to `use-pan-zoom.ts` so
there is a single writer. The JSX keeps `transformOrigin` and layout; it no longer
sets `willChange`. Initial value is `'auto'` (crisp at first paint; the first
gesture arms it).

### Decision: Settle debounce is a named constant

Add a `WILL_CHANGE_SETTLE_MS` tunable to `constants.ts` alongside the other
felt-out timings. It must outlast the button/keyboard zoom animation
(`ZOOM_ANIM_MS = 200`) and a typical wheel-session gap (`WHEEL_SESSION_GAP = 140`)
so the hint is not released mid-gesture and re-armed immediately. A starting value
around 250–400 ms is reasonable; final value felt out in-browser.

## Risks / Trade-offs

- **Large dot-field re-raster on release** → The dots layer wraps a ~40 000px
  element; re-rasterising it when the hint drops could be a visible hitch. Mitigate
  by measuring first; if it hitches, keep the dots layer promoted permanently
  (dots blur far less noticeably than line-art tiles) and release the hint on the
  tiles layer only. The spec requires crisp *tiles*; dot crispness is desirable
  but secondary.
- **Re-arm latency at gesture start** → If the hint is armed on the first
  transform frame, the very first frame of a new gesture may composite from an
  un-promoted state. In practice promotion is fast and the first frame's movement
  is tiny; acceptable. If it shows, arm on pointer/wheel *start* rather than first
  transform.
- **Timer lifecycle** → The settle timeout must be cleared in the effect cleanup
  alongside the existing rAF cancellations, or a release could fire after unmount.

## Migration Plan

Pure client-side behaviour change; no data, API, or SSR impact. Ship as one
commit. Rollback is reverting the commit (restores the permanent `will-change`).
Verify in-browser: zoom into a static tile (or with reduced motion forced) and
confirm it is sharp at rest, and that pan/zoom still feels smooth.

## Open Questions

- Does releasing the hint on the dot-field layer hitch enough to warrant keeping
  dots permanently promoted? Resolve by measurement during implementation.
- Final `WILL_CHANGE_SETTLE_MS` value — felt out in-browser, like the other
  canvas timings.
