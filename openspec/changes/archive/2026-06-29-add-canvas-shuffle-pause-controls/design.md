## Context

The /thingies canvas already has a clean control surface and an animation-freeze
mechanism that both features can reuse:

- **One `frozen` boolean per tile** drives both animation systems. CSS tiles are
  paused by `.thingy-frozen { animation-play-state: paused !important }`
  (`globals.css`); JS-loop tiles read `active = !frozen` through
  `ThingyActiveProvider` → `useThingyActive` and stop their `useThingyFrame` /
  `useThingyInterval` loops. Today `frozen = !intersects(bands.active, …)` —
  purely viewport windowing — plus tab-visibility folded in by the provider.
- **Tile placement** (`utils/place-tiles.ts`) is a pure, deterministic function of
  the tile count: a single gap-free amoeba blob. The canvas computes the layout
  once in `useMemo([])`.
- **Controls** live in `components/zoom-controls.tsx`: a bottom-right stack of
  labelled icon buttons that `stopPropagation` on pointerdown so a press never
  starts a pan.
- **Reduced motion** is honoured at the leaf level, uniformly: the 8 CSS tiles use
  Tailwind's `motion-safe:` variant, the 3 JS tiles gate inside the hooks, the
  lava field (`use-lava-field.ts`) draws a single static frame. So under
  `prefers-reduced-motion: reduce` everything is *already* still — at a layer
  beneath the new `paused` flag.

Both new controls are canvas-level state added to `ThingyCanvas`; `usePanZoom`
(pointer/transform only) is untouched.

## Goals / Non-Goals

**Goals:**

- A shuffle button that reorders the blob's contents in place, instantly.
- A pause toggle that stops all tile animation and the lava drift, seeded from the
  OS reduced-motion preference.
- Reuse the existing freeze mechanism rather than building a parallel one.
- No SSR/hydration regressions; no new dependencies.

**Non-Goals:**

- Persisting pause across reloads, a reset-to-default button, keyboard shortcuts
  for the new controls (all explicitly deferred).
- Animating the shuffle (no per-tile glide — see Decisions).
- Letting a reduced-motion visitor override the OS preference to start motion (see
  Decisions: pause is an additional freeze layer, not a new authority over RM).

## Decisions

### Pause = a third freeze cause, OR'd into the existing signal

Add `paused` state to `ThingyCanvas` and fold it into each tile's `frozen`:

```
frozen = paused || !intersects(bands.active, tile.left, tile.top)
```

`ThingyActiveProvider` / `useThingyActive` additionally AND-out `paused`, so JS
loops stop too. This reuses the whole freeze path — CSS pause, JS-loop stop,
graceful resume (the rAF delta clock already resets, so no catch-up jump) — for
almost no new code. `useThingyFrame` / `useThingyInterval` are defined purely in
terms of "active", so they need no change.

How `paused` reaches the provider: thread it down from `ThingyCanvas` (prop on
`ThingyFrame` → `ThingyActiveProvider`), keeping the active-state context the
single place that ANDs the causes together. *Alternative — a separate pause
context* — was rejected as a parallel mechanism for the same job.

### Pause also stops the lava (external pause input)

The lava field is a separate subsystem, not under `.thingy-frozen`. Give
`LavaBackground` / `use-lava-field` an optional `paused` prop that suspends the
loop exactly as the existing tab-hidden path does (it already has `reduceMq.matches
|| document.hidden` → static frame; add `|| paused`). Default `false`, so the
landing page — which renders `LavaBackground` with no prop — is unaffected.
`ThingyCanvas` passes its `paused` state in.

### Pause-frozen on-screen tiles must stay visible (the fade trap)

`.thingy-frozen` pauses *all* CSS animation, including the mount fade-in — which is
deliberate for off-screen tiles (they hold at opacity 0 until panned in). But pause
and pan are independent: pausing then panning to a fresh region would mount tiles
that freeze at opacity 0 → invisible.

Fix: distinguish *why* a tile is frozen. Pass a `paused` flag into `ThingyFrame` /
`FadedTile`; when a tile is frozen because of pause (not because it is off-screen),
render it at full opacity with no fade animation. The off-screen freeze keeps
today's deferred-fade behaviour. The two reasons share the loop-stopping plumbing
but diverge on the fade.

*Alternative — scope a CSS selector to exclude `.thingy-fade`* — rejected: the fade
wrapper is an ancestor of tile content, so `.thingy-frozen *` can't cleanly spare
it; a JS flag is simpler and unambiguous.

### Reduced motion seeds the pause toggle; it does not become the RM authority

`paused` initial value is read from `matchMedia('(prefers-reduced-motion: reduce)')`
**in a mount effect**, initialised to `false` for the first render — the same
SSR-safe pattern `ThingyActiveProvider` uses for `tabHidden`. So a reduced-motion
visitor lands paused, with the toggle honest on load.

Because RM already suppresses motion at the leaf layer, a reduced-motion visitor
who pressed "resume" would see nothing move (the `motion-safe:` / hook / lava gates
are independent and authoritative). To avoid a dead button, the toggle is **pressed
+ disabled** under RM. *Alternative — make `paused` the sole motion authority and
strip the leaf RM gates so resume works under RM* — rejected: it rewrites every
tile and the lava hook, and auto-overriding an accessibility preference is the
wrong default. Read the preference once on mount for the seed; after the visitor
clicks, their choice stands.

### Shuffle = permute seats, instant, layout promoted to state

Promote the layout from `useMemo([])` to `useState`, initialised to the
deterministic placement. Shuffle derives a new layout by **permuting the
tile→cell assignment over the same set of cells** (Fisher–Yates over the placed
cells), so the blob's shape is identical and only the seating changes. A small util
beside `place-tiles.ts` does the permutation; `place-tiles.ts` itself (the
deterministic placement) is unchanged and still owns the initial layout.

Tiles stay keyed by `entry.id`, so a tile that remains on-screen after a shuffle is
the same React instance repositioned, and tiles crossing the mount boundary mount /
unmount as usual. The move is **instant**: a uniform glide isn't achievable because
off-screen→on-screen tiles were never mounted, so there is nothing to animate from.
Under reduced motion the instant move is already correct.

*Alternatives:* regenerating a new blob shape each shuffle (more dramatic, but
discards the deliberate amoeba) and free scatter (fights the gap-free design) were
both rejected in favour of permute. Keying by seat index instead of `entry.id`
(swap contents per fixed seat) was rejected — it remounts more and loses tile
identity for survivors.

### Controls: generalise `ZoomControls` → `CanvasControls`

Rename/extend the component into one cluster holding Shuffle, Pause/Resume, and the
existing +/−, preserving the `stopPropagation`-on-pointerdown and per-button
`aria-label`. Pause is a toggle: `aria-pressed={paused}`, label flips
"Pause animations" / "Resume animations", icon swaps lucide `Pause` ↔ `Play`;
`disabled` under RM. `usePanZoom` still supplies `zoomIn` / `zoomOut`;
`ThingyCanvas` supplies `onShuffle`, `paused`, `onTogglePause`.

## Risks / Trade-offs

- **Fade-trap regression if the `paused` reason isn't threaded through** → covered
  by an explicit spec requirement ("A tile paused on-screen stays visible") and a
  task to verify panning-while-paused shows tiles.
- **Disabled toggle under RM reads as broken to some users** → it is shown pressed
  (clearly "paused") with a `title` explaining the OS setting; acceptable given RM
  already stills the page.
- **Shuffle churn at the mount boundary** (mount/unmount + fresh fades on each
  shuffle) → expected and cheap; the windowing already handles mount/unmount, and
  fades on newly-mounted tiles are the normal mount behaviour.
- **Layout as state re-renders the canvas on shuffle** → only on the explicit
  click, not per frame; negligible.

## Open Questions

None — the three design decisions (pause scope incl. lava, permute semantics,
instant transition) and the reduced-motion seeding behaviour were settled during
exploration.
