## Context

Tiles are code-split and mounted on demand by the canvas windowing logic
(`thingy-canvas.tsx` filters by the mount band; `thingy-frame.tsx` loads each
tile via `next/dynamic(entry.load, { ssr: false, loading: () => null })`). When a
tile's chunk resolves, its drawing renders at full opacity — a hard pop. Because
the initially-visible tiles mount in near-unison, the whole surface pops at once.

Two facts shape the design:

- **The fade must key to content arrival, not frame mount.** The frame mounts
  immediately and renders `loading: () => null` (nothing) until the chunk resolves.
  A fade applied to the frame's own wrapper would start during the blank phase and
  largely elapse before the drawing exists. The fade therefore has to live on a
  wrapper that mounts *with the resolved content*, i.e. inside the dynamic boundary.
- **The opaque background and the hairline cover are deliberate.** Each tile paints
  an opaque `bg-background` square plus a `BLEED`-px box-shadow "ring" just past its
  edge, so flush tiles never reveal a sub-pixel matrix sliver between them
  (`thingies-tile-spacing` work). Whatever fades must keep that invariant in the
  settled state.

There is an existing precedent for a slow, reduced-motion-gated fade: the lava
background cross-fade (`globals.css`, `transition: opacity 4200ms` under
`@media (prefers-reduced-motion: no-preference)`).

## Goals / Non-Goals

**Goals:**

- Lazily-mounted tiles fade in smoothly instead of popping.
- The *whole* tile materialises as one unit (background + hairline cover + drawing).
- A small per-tile random delay breaks the mount-unison without a noticeable wait.
- Reduced-motion visitors get instant appearance.
- Zero change to the tile contract or any individual tile — the effect is entirely
  in the frame.

**Non-Goals:**

- No staggered *ordering* logic (e.g. centre-out reveal) — the stagger is random,
  not choreographed.
- No fade-*out* on unmount — tiles still unmount instantly when they leave the band.
- No per-tile duration jitter in this change (delay-only stagger; revisit if 600ms
  flat still reads too uniform).
- No change to the windowing/freeze logic itself.

## Decisions

### Option B — fade the whole tile, not just the drawing

The drawing-only alternative (option A) leaves the opaque square popping in under a
fading drawing, so it does not actually remove the pop — it swaps a drawing-pop for
a square-pop. Option B fades background + box-shadow + drawing together, so the tile
genuinely materialises from the matrix. Chosen despite the transient-translucency
trade-off (see Risks), because the request is specifically "fade in instead of pop".

### Fade wrapper lives inside the dynamic boundary

The fade element is generated *inside* the `next/dynamic` loader, wrapping the tile's
default export:

```
dynamic(
  () => entry.load().then((mod) => {
    const Inner = mod.default
    return function FadedTile() {
      const [delay] = useState(() => Math.random() * FADE_DELAY_MAX_MS)
      return (
        <div className="thingy-fade" style={{ animationDelay: `${delay}ms`, /* bg, shadow, clip */ }}>
          <div style={{ padding: TILE_PADDING }}>
            <Inner />
          </div>
        </div>
      )
    }
  }),
  { ssr: false, loading: () => null }
)
```

This wrapper mounts exactly when the chunk resolves, so a CSS `@keyframes` fade
(which auto-plays on mount) fires on cue. Keeping `useMemo(..., [entry.load])` means
the dynamic component identity is stable, so the fade does **not** re-fire on every
pan/band change — only on a genuine unmount → remount. The random delay is read once
per mount (`useState` lazy init), so re-panning a tile back in re-scatters it.

Alternative considered — `React.lazy` + `Suspense`: equivalent timing (the children
subtree mounts on resolve), but it would replace the working `next/dynamic` path for
no functional gain. Keep `next/dynamic`.

### The clip moves off the positioning div

Today the positioning div carries both `overflow-hidden` *and* the box-shadow — fine,
because an element's own shadow is not clipped by its own overflow. Under option B the
visible tile (bg + shadow + drawing) sits *inside* the positioning div, so if that div
kept `overflow-hidden` it would clip the inner wrapper's outward box-shadow and destroy
the hairline cover. Therefore:

- **Outer positioning div**: `absolute` left/top/size only — transparent, *no* clip,
  *no* background, *no* shadow.
- **Inner fade wrapper** (`h-full w-full`): `overflow-hidden` (clips the drawing) +
  `bg-background` + `BLEED` box-shadow (casts outward, unclipped by its own overflow) +
  the fade animation + the per-tile `animation-delay`.

The `TILE_PADDING` safe-area inset stays on a further inner div, unchanged.

### `Math.random()`, not the seeded placement PRNG

Placement uses a fixed `SEED` so SSR and client agree and hydration does not drift.
Tiles are `ssr: false` (client-only), so the fade has no determinism constraint; plain
`Math.random()` per mount is correct and intentionally non-deterministic — re-mounts
re-scatter, which keeps the surface lively. Using the seeded PRNG here would be
over-engineering and would make every re-mount identical.

### Reduced-motion via media-query gating (matches lava)

Define the keyframe and apply the animation only inside
`@media (prefers-reduced-motion: no-preference)`; keep the wrapper's base `opacity: 1`.
With no animation applied, reduced-motion visitors see the tile at full opacity
immediately. Use `animation-fill-mode: backwards` so the 0% (opacity 0) state applies
on mount with no one-frame flash at full opacity.

### Freeze interaction is free

`.thingy-frozen *` already pauses all animations. A tile that mounts in the
mount-but-not-active ring has its fade paused at opacity 0 (invisible) until it pans
into the active band, then it fades. This is the desired behaviour and needs no extra
code — the `animation-delay` is paused along with the animation.

### Tunables

Two named constants in `constants.ts`, felt out in-browser like the other thingies
tunables:

- `FADE_IN_MS = 600` — base fade duration.
- `FADE_DELAY_MAX_MS = 350` — upper bound of the per-tile random start delay.

## Risks / Trade-offs

- **Transient matrix sliver during the fade** → the box-shadow hairline cover is
  semi-transparent while a tile fades, so a sub-pixel matrix sliver could flash
  between flush tiles. Mitigation: the window is sub-second, neighbours fade on the
  same cadence, and the matrix dots are subtle. Verify in-browser; if objectionable,
  fall back to a shorter duration or reconsider option A.
- **No load placeholder during a slow first-load chunk** → with the visible square now
  inside the dynamic boundary, a slow-loading tile shows matrix (nothing) until it
  fades in, rather than a solid placeholder square. Acceptable: layout cannot reflow
  (tiles are absolutely positioned at fixed size), and most chunks are tiny / cached.
- **All initially-visible tiles still fade within one ~350ms window** → if that still
  reads too uniform, add duration jitter later (explicit Non-Goal here).

## Open Questions

- Final values for `FADE_IN_MS` / `FADE_DELAY_MAX_MS` after feeling it out in-browser.
- Whether the transient hairline sliver is visible enough to act on (verify step).
