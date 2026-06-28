## Context

The `/thingies` canvas virtualises tiles in two stages, both already implemented in
`components/thingy-canvas.tsx` and `components/thingy-frame.tsx`:

- The canvas computes two bands per frame (`active`, `mount`) in
  `utils/visible-band.ts`. A tile inside `mount` but outside `active` is mounted
  but **frozen**; a tile outside `mount` is unmounted.
- `ThingyFrame` receives a `frozen` boolean and, when frozen, adds the
  `.thingy-frozen` class. That class sets `animation-play-state: paused !important`
  on the tile and every descendant (see `globals.css`).

This freeze is **browser-enforced but CSS-only**. `animation-play-state` has no
effect on `requestAnimationFrame`, `setInterval`, canvas draw loops, or any
JS-driven animation. So the tile contract (`thingies/README.md`) tells authors to
"prefer CSS over JS" and warns that a JS loop "keeps doing unseen work" off-screen.

We want JS-loop tiles — a snake game, a physics toy, a library with its own loop —
to be first-class while still freezing off-screen, in step with the CSS freeze.
The canvas already knows the exact freeze boundary (the `frozen` boolean it passes
to every frame); the work is to make that signal reach a tile's JavaScript.

## Goals / Non-Goals

**Goals:**

- Let a tile run a JS loop that pauses while off-screen (within the freeze band) or
  while the tab is hidden, and resumes on return — riding the *same* `frozen`
  signal the CSS freeze already uses.
- Expose a flexible, layered API from day one: a raw escape-hatch primitive plus
  ergonomic wrappers for the two common loop shapes (per-frame and fixed-cadence).
- Require **zero changes** to existing CSS-only tiles.
- Keep the single source of truth for the freeze boundary in the canvas; do not
  reinvent visibility detection per tile.

**Non-Goals:**

- Persisting tile state across unmount. Leaving the margin band tears the tile down
  and a later return starts fresh — accepted and intended (it keeps tile state
  inside the tile, where it belongs).
- Enforcing the freeze on uncooperative tiles. The JS freeze is cooperative; a tile
  that hand-rolls a loop and ignores the API will leak (bounded by unmount).
- Catch-up / fast-forward simulation after a long freeze. Resume is pause-and-skip,
  matching CSS `animation-play-state`.
- Changing the default scaffold. The `add-a-thingy` template stays a CSS tile.

## Decisions

### 1. Deliver the freeze signal by React context, not a prop or IntersectionObserver

`ThingyFrame` wraps its `<Content/>` in an active-state provider whose value is
`!frozen` (folded with tab visibility — see decision 4). The hooks read it.

- **Why not a prop?** The contract's "tiles take no props, they render themselves"
  rule keeps tiles uniform and self-placing. `frozen` is *ambient runtime state*,
  not per-tile configuration, so context is the right tool — and crucially a CSS
  tile that ignores the context needs no signature change. A prop would force every
  tile to thread it.
- **Why not a per-tile `IntersectionObserver`?** It would duplicate the band maths
  the canvas already does, add an observer per tile, and miss the `active`/`mount`
  hysteresis. The canvas already computed the answer; broadcasting it is cheaper and
  keeps one source of truth.

The `.thingy-frozen` CSS path is untouched. Both mechanisms ride the one `frozen`
boolean: CSS animations freeze via the class (browser-enforced); JS loops freeze via
the context (cooperative).

```
ThingyFrame frozen={bool}
  ├─ <div class={frozen && 'thingy-frozen'}>     ← CSS path (unchanged)
  └─ <ThingyActiveProvider value={active}>        ← NEW ambient signal
       └─ <Content/>  → useThingyActive() / useThingyFrame() / useThingyInterval()
```

### 2. A layered API: one primitive + two wrappers

```ts
// the primitive / escape hatch
function useThingyActive(): boolean

// rAF convenience — continuous motion
function useThingyFrame(
  tick: (deltaMs: number) => void,
  opts?: { respectReducedMotion?: boolean } // default true
): void

// fixed-cadence convenience — a game clock
function useThingyInterval(
  fn: () => void,
  ms: number,
  opts?: { respectReducedMotion?: boolean } // default true
): void
```

- `useThingyActive` is the floor everything builds on — a truthful boolean, no
  opinion. It is the sanctioned escape hatch for custom loops, Workers, or a
  third-party engine the author must `.start()`/`.stop()`.
- `useThingyFrame` owns the rAF loop so authors never touch `performance.now()` or
  cancellation (see decision 3). It covers continuous integrators.
- `useThingyInterval` covers discrete cadence and is snake's natural fit ("advance
  one cell every N ms"). Shipping it now — rather than making the flagship example
  hand-roll a dt-accumulator — is the point of "flexible from the outset".

**Alternative considered:** ship only the primitive and let authors build loops.
Rejected — the `dt`-correctness and cancellation details (decision 3) are exactly
the easy-to-get-wrong parts; baking them into wrappers is where the value is.

### 3. `useThingyFrame` measures `deltaMs` from the last tick that ran

The loop records the timestamp of each executed tick. While frozen it runs no
ticks. On resume, the first `deltaMs` is computed against the last *executed* tick's
timestamp clamped to a normal frame — **not** wall-clock since freeze. So a tile
frozen for 10s resumes with a ~16ms delta, never a 10,000ms jump that would teleport
a simulation. This correctness guarantee is the main reason to own the loop in the
harness rather than expose raw `frozen` + rAF. The raw primitive cannot make this
guarantee, which is documented as the escape hatch's responsibility.

### 4. Fold "off-screen" and "tab-hidden" into the one boolean

`active = !frozen && !document.hidden`. The provider subscribes to
`visibilitychange` and recomputes. Consumers get correct pause-on-hidden for free
and never have to ask *why* they're inactive.

- rAF self-throttles when the tab is hidden, but `setInterval` does **not** (it is
  only clamped to ~1/s), so `useThingyInterval` genuinely needs this. The lava
  background already pauses on `document.hidden` — this matches that precedent.
- **Alternative considered:** expose `{ active, reason }`. Rejected as YAGNI for
  decorative tiles; a single boolean keeps the escape hatch trivial. Add `reason`
  only if a real need appears.

### 5. Reset-on-unmount; no state outside the tile

Within the band a frozen tile is never unmounted, so React state survives and the
loop resumes mid-simulation for free. Past the `mount` edge the tile unmounts and
its state is gone; a later return mounts it fresh from initial state. The runtime
stores nothing outside the tile. This mirrors how a freshly mounted CSS tile starts
its animation from 0, and is the accepted behaviour (snake restarts after a long
pan).

### 6. Reduced motion lives in the wrappers, not the primitive

`useThingyActive` reports pure active state (visibility + tab). The convenience
hooks additionally suppress ticking under `prefers-reduced-motion: reduce`, so a
tile using them shows its static initial render to reduced-motion visitors with no
extra code. An escape-hatch author handles reduced motion themselves (the contract
already requires a sensible static result). Keeping the two concerns separate avoids
conflating "is on-screen" with "should animate".

### 7. File layout (bulletproof-react, feature-scoped)

- `src/features/thingies/hooks/use-thingy-active.ts` — context + primitive hook.
- `src/features/thingies/hooks/use-thingy-frame.ts` — rAF wrapper.
- `src/features/thingies/hooks/use-thingy-interval.ts` — interval wrapper.
- Provider rendered in `components/thingy-frame.tsx` around `<Content/>`.
- Tiles import these via a relative same-feature path. The unidirectional import
  rule already permits same-feature imports; the contract gains a one-line carve-out
  that these hooks are the harness API, not "another tile".

## Risks / Trade-offs

- **Cooperative freeze can leak.** A tile that ignores the hooks and runs its own
  `setInterval` keeps working off-screen. → Bounded by the existing unmount at the
  `mount` edge, which tears down even a rogue loop. The sanctioned hooks are the
  path of least resistance, and the contract documents the caveat.
- **Context re-render on every freeze toggle.** The provider value flips when a tile
  crosses the active band. → It already re-renders at exactly those moments (the
  `frozen` prop changes today); the provider adds no new render cadence. Bands are
  gated to change only on cell crossings, not per pan frame.
- **`useThingyInterval` cadence drift / background clamping.** Long intervals while
  hidden are throttled by the browser. → We suspend on hidden anyway, so this is
  moot; on resume we restart the timer rather than replay missed ticks.
- **Authors reach for 2D canvas for a snake.** Canvas blurs past ~2× zoom and is not
  scale-independent. → Orthogonal to this change; the contract's prefer-SVG guidance
  still applies. The reference snake tile will use SVG `<rect>`s on a `0 0 100 100`
  viewBox to stay crisp and prove the API without a canvas.

## Migration Plan

Backward compatible; no data, no deploy choreography.

1. Add the hooks and the provider. Existing tiles ignore the context — no change.
2. Rewrite the `thingies/README.md` contract section (CSS-vs-JS) and add the
   same-feature carve-out for the hooks.
3. Add the `0007-snake` reference tile using `useThingyInterval` (proving ground).
4. Verify in-browser: snake runs on-screen, freezes when panned into the band,
   resumes on return, restarts after unmount, and stops with reduced motion.

Rollback is removal of the hooks, provider, and reference tile; nothing else depends
on them.

## Open Questions

- **Default cadence/`opts` surface.** Start minimal (`respectReducedMotion` only);
  add options (e.g. an explicit fps cap on `useThingyFrame`) only if a tile needs
  them.
- **Should the `add-a-thingy` skill gain a "JS-loop tile" template variant?** Out of
  scope here; revisit once a second JS-loop tile exists and a shared shape emerges.
