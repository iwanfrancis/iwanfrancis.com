## Context

The background today is a clever, cheap trick (see
`src/components/layout/matrix-background/matrix-background.tsx` and the
`bg-matrix` / `bg-hover-effect-overlay` / `bg-hover-effect-mask` utilities in
`src/globals.css`):

- `bg-matrix` paints a 20px dot grid everywhere using a `radial-gradient`
  background image, coloured by the `--matrix-dot` token.
- A huge (`1000vw × 1000vh`) solid `--matrix-overlay` scrim at `opacity: 0.8`
  sits on top, muting the dots.
- A `mask-image: radial-gradient(200px …)` punches one soft transparent hole in
  that scrim, revealing vivid dots in a ~100px circle.
- A `mousemove` listener sets `transform: translate(x, y)` on the scrim so the
  hole follows the cursor. There is **no animation loop** — the compositor does
  the work. The effect is disabled on touch (`isTouchScreen()`), and dark mode is
  handled purely by swapping `--matrix-dot` / `--matrix-overlay`.

This change keeps the dot grid and scrim model but replaces the single
cursor-driven hole with several holes (blobs) that drift on their own and **fuse
like liquid**. The hard, open question is whether a CSS/SVG approach looks
genuinely liquid or merely "rubbery"; the design is built around de-risking that
cheaply.

## Goals / Non-Goals

**Goals:**

- Ambient, continuously drifting blobs of contrast over the dot grid, with
  liquid metaball-style fusion.
- Runs on all devices (including touch); no pointer needed.
- Respects `prefers-reduced-motion`; pauses when the tab is hidden.
- Reuses the existing `--matrix-*` tokens so dark mode keeps working with no new
  theming logic.
- Keep the renderer a **swappable internal layer** so we can try the cheap
  approach first and fall back without redoing the surrounding scaffolding.

**Non-Goals:**

- Pointer / mouse interaction (cursor warping or seeding blobs) — deferred to a
  later change.
- Configurable / themeable blob counts, palettes, or controls exposed to the
  page. Tuning stays internal.
- Any change to page content, layout, header/footer, or the theme-toggle reveal
  itself (only the stale spotlight references in its spec are corrected).

## Decisions

### Decision 1: Reuse the scrim-and-reveal model, swap one hole for many

The observable model stays "muted dots everywhere, vivid dots inside the blobs."
The blobs are the holes. This keeps the dark-mode theming (`--matrix-overlay`
scrim, `--matrix-dot` dots) working unchanged and means the renderer only has to
produce **one thing**: a drifting, fusing greyscale "gooey shape" that acts as a
mask/clip for the reveal.

Concretely, the gooey shape masks the scrim so the scrim is *absent* inside
blobs (vivid dots show through) and present everywhere else (muted periphery).
Whichever renderer we use produces that shape; everything around it is identical.

_Alternative considered:_ recolour individual dots (per-dot contrast driven by a
field). Rejected — far more elements/work, and it throws away the cheap
CSS-background dot grid we already have.

### Decision 2: Renderer is a swappable layer; ship the lightest one that looks liquid

Two candidate renderers, same inputs (theme tokens) and same output (a gooey
mask over the dot grid):

| Renderer | Fusion | Animation loop | Cost | Liquid quality (predicted) |
| --- | --- | --- | --- | --- |
| **SVG gooey filter** (primary) | `feGaussianBlur` + `feColorMatrix` alpha threshold | none — CSS `@keyframes` drift | low, stays in `globals.css` + a few divs | good; risk of "rubbery" because blobs stay circular |
| **Canvas 2D metaballs** (fallback) | summed scalar field + threshold | `requestAnimationFrame` | medium; new client hook | genuinely liquid; blobs deform naturally |

We build the **SVG gooey filter** first because it is the smallest leap from
today's CSS-only effect and gets battery-friendly behaviour for free (browsers
pause CSS animations in background tabs). Each blob is a blurred element drifting
on its own `@keyframes` loop, with a per-blob out-of-phase `scaleX/scaleY` wobble
and 2–3 overlapping sub-circles so the silhouette deforms rather than reading as
a clean disc. Prime-number durations (e.g. 23s/31s/37s/41s) keep the combined
pattern from visibly repeating.

If the SVG result reads as rubbery/bubbly rather than liquid, we swap the
renderer for **Canvas 2D metaballs** computed at reduced resolution (the field is
low-frequency, so ~¼ res scaled up is cheap and stays smooth). The Canvas path
adds a RAF loop and a manual `visibilitychange` pause; it is also where future
mouse-warping naturally lives.

_Alternative considered:_ WebGL fragment shader. Best-looking and trivial mouse
reaction, but the largest jump in code and bundle for a personal site; held in
reserve for a future "showpiece" version, not this change.

### Decision 3: Spike before committing

The first task is a throwaway SVG-goo spike judged by eye against one question:
**does it look liquid?** This converts the riskiest unknown into a cheap, early
decision rather than discovering it after the effect is fully wired in. Because
the scrim/dot/theme scaffolding is shared, a "no" only costs the renderer.

**Outcome (spike done): chose Canvas.** The SVG goo spike fused and drifted, but
two pieces of feedback decided it:

1. The goo filter's hard alpha threshold (what creates the fusion) also produces
   hard blob edges. The original cursor spotlight's appeal was its _feathered_
   gradient edge, which the threshold destroys.
2. The blobs should drift _with_ the page content, not sit fixed to the viewport
   — and a single stretched SVG fights arbitrary page height (blobs distort and
   thin out vertically).

The **Canvas 2D** renderer answers both cleanly: soft holes are punched out of
the scrim with radial gradients (`destination-out`), reproducing the exact
feathered falloff; overlapping holes remove more alpha in the gap between them,
so they still fuse — but softly. Each hole is positioned in document coordinates
(offset by `scrollY`), so blobs are anchored to the page. The field renders at
half resolution, so the per-frame cost is negligible.

### Decision 4: Keep it in the existing component location

The effect stays in `src/components/layout/matrix-background/` (shared layout
component, mounted once in `app/layout.tsx`). The `mousemove` handler and
`isTouchScreen()` guard are removed. If the Canvas fallback is taken, its RAF
loop goes in a co-located hook (e.g. `use-metaball-field`) under that component's
folder, not a shared hook, until reused.

### Decision 5: Accessibility and lifecycle are first-class, not add-ons

- `prefers-reduced-motion: reduce` → no continuous motion. SVG path: gate the
  drift `@keyframes` behind `@media (prefers-reduced-motion: no-preference)` so
  reduced-motion users get a static composition. Canvas path: skip starting the
  RAF loop.
- Tab hidden → pause. SVG path is largely automatic (CSS animations throttle in
  background tabs); Canvas path stops/starts the loop on `visibilitychange`.

### Decision 6: Server-rendered fallback scrim avoids a load flash

The canvas is client-only, so the server-rendered HTML shows the dot matrix at
full contrast until JS hydrates and draws the first frame — a visible flash. To
prevent it, `LavaBackground` also renders a plain `div` scrim with the same
colour and opacity as the canvas scrim. Being in the SSR markup, it mutes the
matrix from the first paint; the hook sets its opacity to `0` the instant the
canvas has drawn a frame, so the hand-off is seamless (identical muting, blobs
simply appear). If JS never runs, the matrix stays gracefully muted.

## Risks / Trade-offs

- **SVG goo may not look liquid enough** → mitigated by Decision 3 (spike first)
  and the wobble / sub-circle / prime-duration tricks; explicit Canvas fallback
  if it fails the eye test.
- **Animated full-viewport SVG blur + colour-matrix filter is paint-heavy on weak
  GPUs** → keep blur radius and blob count modest; measure on a low-end profile
  during the spike; the Canvas fallback at reduced resolution is the escape hatch.
- **Always-on animation costs battery (esp. mobile, now that touch is enabled)**
  → pause when hidden (Decision 5); honour reduced-motion; keep the element/loop
  count small. Re-evaluate enabling on mobile if profiling is poor.
- **Mask-inversion fiddliness** (scrim must be absent *inside* blobs, present
  outside) → resolve during the spike; if CSS mask compositing is awkward, flip
  to a second vivid-dot layer clipped *to* the gooey shape instead of masking the
  scrim. Same visual result.
- **Removing the cursor spotlight is a visible behaviour change** → intended and
  called out as BREAKING in the proposal; the loved reveal returns as pointer
  interaction in a later change.

## Open Questions

- ~~SVG goo or Canvas~~ — **resolved: Canvas** (see Decision 3 outcome).
- Exact blob count, size, feather, and drift speed — currently hand-tuned in
  `use-lava-field.ts`; easy to adjust by eye.
- Whether mobile keeps the effect long-term, pending battery/perf profiling
  (default: enabled, per the proposal).
