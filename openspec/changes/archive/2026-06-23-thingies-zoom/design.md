## Context

`/thingies` is a full-bleed, pan-only canvas (shipped in `thingies-canvas`). The
surface is three stacked layers in a fixed viewport container:

```
  z20  tiles   ── translate3d(offset)          ← transformed
  z10  lava    ── fixed to viewport             ← NOT transformed
  z0   dots    ── translate3d(offset)          ← transformed (40000px bg-matrix field)
```

Panning is hand-rolled Pointer Events writing the **same** `translate3d` string to
both the dots and tiles layers; the lava stays put. The offset is screen-space,
clamped to the tiles' bounding box + margin, with a rAF friction fling. All
layers are `pointer-events: none` so the container catches every drag.

The lava sits *between* dots and tiles deliberately: it lays a scrim over the
dots and punches holes to reveal them, and the opaque tiles ride on top so they
aren't muted. This sandwich is load-bearing — it forbids collapsing dots+tiles
into a single transformed wrapper.

This change adds zoom. The `thingies-canvas` notes anticipated it ("design the
transform so zoom slots in later"); the offset-is-screen-space, one-transform-
string design is most of the way there. The gap is a scale factor, focal-point
maths, a zoom-aware clamp, and one structural fix to how the two layers scale.

## Goals / Non-Goals

**Goals:**

- Zoom in/out on `/thingies`, layered on the existing pan without regressing it.
- Miro-style gesture mapping: mouse wheel → zoom, trackpad swipe → pan, pinch →
  zoom (trackpad and touch), drag → pan.
- Zoom anchored to a focal point (cursor for wheel, midpoint for pinch).
- Dots and tiles stay locked together (pinned-to-one-surface) under zoom, not
  just under pan.
- Accessible zoom: +/− controls and keyboard, honouring `prefers-reduced-motion`.

**Non-Goals:**

- Progressive-enhancement lazy-load of `@use-gesture` (route-splitting already
  isolates it from the landing entry; deferred as an optional refinement).
- Hard-specified zoom range — start/end bounds are an in-browser tuning note.
- Virtualisation / off-screen pausing (the deferred Change 2). Zoom-out renders
  more tiles at once; the future windowing must make its viewport-intersection
  test scale-aware — flagged there, not solved here.
- Making tile contents interactive (they stay `pointer-events: none`).

## Decisions

### 1. Transform model — `translate(offset) scale(s)`, shared anchor and origin

The offset stays **screen-space** and is applied *outside* the scale:
`translate(offset.x, offset.y) scale(s)`. This keeps drag/fling velocity in
screen pixels (no rescaling of velocity) and keeps the focal-point maths simple.

**The one real fix:** today both layers get an identical `translate3d` string and
rely on default `transform-origin` (each element's own box centre). The dots
field and the tiles div have *different* box geometry, so their default origins
are different physical pixels. That's invisible under pure translate but makes the
two layers **scale about different points** and drift apart the instant `scale()`
is added.

Fix: pin both layers to the **same physical anchor** — the container centre — with
an explicit `transform-origin`, and write the identical `translate(...) scale(...)`
string to both. Concretely:

- Tiles div already anchors its (0,0) at the container centre (`left/top: 50%`,
  no margin). Set `transform-origin: 0 0`.
- The dots field currently centres via `margin: -20000px` (top-left corner offset
  from centre), so `transform-origin: 0 0` would scale it about the wrong pixel.
  Re-centre it with an **inner static offset** instead: an outer div anchored at
  the container centre (`left/top: 50%`, `transform-origin: 0 0`) carries the
  pan/zoom transform; an inner div holds the 40000px `bg-matrix` field shifted by
  `-20000px`. The static shift rides inside the transformed element, so it pans
  and scales correctly while the visible field stays centred.

The 40000px field needs no other change: a CSS `transform: scale()` scales the
element's painted `background-size` along with it, so the 20px dots render larger
when zoomed in and the dots stay pinned to the tiles for free. At the minimum
zoom we'll use, 40000px still over-covers the viewport.

**Alternative considered — infinite-grid via `background-position`/`-size`:** drive
the dots by `background-position: offset` and `background-size: 20px * s` on a
viewport-fixed div, decoupled from the transform. Rejected: it introduces a
second update path for the dots (position+size vs transform) that must be kept in
perfect sync with the tiles' transform *and* with the focal-point maths — more
surface area to drift, for no gain over the shared-anchor approach.

**Alternative considered — one transformed wrapper for dots+tiles:** rejected; the
lava sandwich (lava must sit over the dots and under the tiles) forbids it.

### 2. Focal-point zoom

Zoom keeps the point under the pointer fixed. With offset screen-space and the
anchor `A` = container centre, for a focal screen point `f` and a scale change
`s0 → s1`:

```
  offset' = (s1 / s0) · offset + (f − A) · (1 − s1 / s0)
```

- **Wheel:** `f` = cursor position.
- **Pinch:** `f` = gesture midpoint (from `@use-gesture`'s pinch origin).
- **Buttons / keyboard:** `f` = `A` (container centre), so the formula reduces to
  scaling the offset by `s1/s0`.

### 3. Gesture recognition — `@use-gesture/react`, standalone

**What the library actually provides (verified against the installed source):**
`@use-gesture`'s pinch engine routes `ctrl+wheel` (trackpad pinch) and multi-touch
(touch pinch) to `onPinch`, and its drag engine gives unified pointer drag with
velocity. It does **not** classify a mouse wheel versus a trackpad two-finger
swipe — both are plain `wheel` events; `wheelValues` only normalises `deltaMode`.
So the dep's value here is **robust cross-device pinch + drag/velocity** (the
genuinely fiddly bits, especially iOS Safari), not the mouse-vs-trackpad split.

- The mouse-wheel-vs-trackpad-swipe distinction is **hand-rolled in the wheel
  handler**. There is no clean browser API for it. The signal used is the
  **horizontal axis**: a mouse wheel has none (`deltaX` stays 0) so a plain wheel
  defaults to zoom, while any `deltaX` is strong evidence of a trackpad swipe and
  switches to pan. (An earlier per-event magnitude/`deltaMode`/fractional
  heuristic was found, during verification, to misclassify a *mouse's own* event
  stream — Chrome smooth-scrolling emits mixed small/large/fractional deltas — so
  one scroll produced both zoom and pan frames, reading as janky simultaneous
  zoom+scroll.)
- **Wheel-session locking:** a continuous scroll fires a stream of events, so the
  zoom-vs-pan mode is classified once and **locked for the burst**, resetting only
  after a brief idle gap (`WHEEL_SESSION_GAP`). This prevents any mid-gesture flip
  — including a trackpad swipe whose momentum tail loses its `deltaX`. Pinch (the
  unambiguous ctrl+wheel / touch case) always zooms regardless.
- Used **standalone** — no react-spring. It supplies normalised
  `onWheel` / `onPinch` / `onDrag` deltas, velocity, and origin; we keep our own
  rAF fling loop, clamp, and the transform `apply()`.
- Bound via the `target` option on the container ref with
  `eventOptions: { passive: false }`, so the wheel listener can `preventDefault`
  (required for both trackpad pinch and page-zoom suppression).
- `onDrag` velocity feeds the existing friction inertia (velocity stays in screen
  px, so no rescaling).
- The controller still writes the transform to **two** layers itself —
  `@use-gesture` recognises gestures, it does not render, so the two-sibling /
  lava-sandwich structure is unaffected.

Mapping: pinch (touch or ctrl+wheel) → zoom; drag → pan; plain wheel → zoom if it
looks like a mouse wheel, pan if it looks like a trackpad swipe.

**Alternative considered — full pan/zoom lib (`react-zoom-pan-pinch`, `panzoom`):**
rejected. They own a single transformed wrapper; our two-transformed-siblings +
fixed-lava structure can't accept one without mirroring its transform onto the
dots by hand or inverting the lava reveal effect.

**Alternative considered — fully DIY recognition (drop the dep):** credible, since
the mouse-vs-trackpad heuristic is DIY either way and the pan is already
hand-rolled. Kept the dep for robust touch/trackpad **pinch** (mobile matters for
this project) and unified drag velocity. Reversibility note: the coordinate maths
(offset/scale/focal/clamp/apply) is identical whether recognition is DIY or
library-driven, so the dep is a low-stakes, reversible front-end choice.

### 4. Zoom-aware bounds

The pan clamp scales with zoom: the scaled content extent is `contentW · s` and
`contentH · s`. When the scaled blob is **larger** than the viewport, clamp to
its bounding box + margin as today. When it is **smaller** (zoomed out far
enough), the clamp must **centre** the blob rather than allow drift into the void.
Re-clamp on every zoom step and on resize.

### 5. Accessible zoom controls

A small, unobtrusive +/− control (a new component) plus keyboard support, so the
surface isn't gesture-only (the repo enforces the a11y lint group). Buttons and
keyboard zoom about the container centre. Button/keyboard zoom **animates** the
scale (eased over a few frames) and **must** short-circuit to an instant jump
under `prefers-reduced-motion`. Wheel and pinch zoom are direct/instant 1:1.

### 6. Constants

Zoom range (`MIN_SCALE`, `MAX_SCALE`) and wheel/pinch sensitivity live in
`constants.ts` alongside the existing pan constants. Start at roughly `0.4×` to
`3×`; treat as in-browser tuning dials (as `JITTER` was in `thingies-canvas`),
not fixed contract.

## Risks / Trade-offs

- **Mouse-vs-trackpad heuristic is imperfect** → some exotic mice/trackpads may
  misclassify a wheel as a swipe or vice-versa. Mitigation: lean on
  `@use-gesture`'s tested heuristic rather than our own; pinch (the unambiguous
  case) always zooms, so the worst case is wheel-zoom occasionally behaving as a
  small pan, which is recoverable by the user.
- **Browser page-zoom / scroll hijack** → ctrl+wheel zooms the page and wheel
  scrolls it by default. Mitigation: the wheel listener must be registered
  non-passive (`passive: false`) and call `preventDefault`.
- **Layer drift if origins aren't pinned** → the whole illusion breaks if the two
  layers scale about different points. Mitigation: explicit `transform-origin` +
  shared anchor is the core decision (1), verified visually in-browser.
- **2D-canvas tiles blur when zoomed in** → CSS scale upsamples raster canvas
  tiles past ~2×. SVG/CSS tiles stay crisp. Accepted for decorative tiles; add a
  line to the tile-contract note steering authors toward SVG/CSS.
- **Performance under zoom-out** → zooming out can mount the whole blob at once.
  Accepted for the current handful of tiles; this is exactly what the deferred
  virtualisation change addresses, and that change must make its
  viewport-intersection test divide by scale.
- **Regressing instant pan** → reworking the pan onto `@use-gesture` could blank
  the snappy drag. Mitigation: keep velocity screen-space and the rAF fling loop
  intact; verify pan feel in-browser before considering the change done.

## Migration Plan

No data or API migration. Additive UI change behind a single route. Rollback is
reverting the change and removing the `@use-gesture/react` dependency. The
existing pan behaviour and all `thingies-canvas` requirements except the
panning-only constraint are preserved.

## Open Questions

- Exact `MIN_SCALE` / `MAX_SCALE` and wheel/pinch sensitivity — to be felt out in
  the browser, not blocking the spec.
- Whether button/keyboard zoom uses fixed scale steps (e.g. ×1.2 per press) or
  snaps to preset levels — minor, decide during implementation.
