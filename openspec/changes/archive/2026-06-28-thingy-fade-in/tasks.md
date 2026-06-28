## 1. Tunables

- [x] 1.1 Add `FADE_IN_MS = 600` and `FADE_DELAY_MAX_MS = 350` to
  `src/features/thingies/constants.ts`, with a doc comment noting they are felt out
  in-browser like the other thingies tunables.

## 2. Fade keyframe (CSS)

- [x] 2.1 In `src/globals.css`, define a `thingy-fade` keyframe / class that ramps
  `opacity` 0 → 1 over `FADE_IN_MS`, applied only inside
  `@media (prefers-reduced-motion: no-preference)`, using
  `animation-fill-mode: backwards` so the 0% state applies on mount with no
  first-frame flash. Keep base `opacity: 1` so reduced-motion users get instant
  appearance.

## 3. Frame restructure (option B)

- [x] 3.1 In `src/features/thingies/components/thingy-frame.tsx`, move the
  `bg-background`, the `BLEED` box-shadow, and `overflow-hidden` off the outer
  positioning div onto a new inner fade wrapper; leave the outer div as a
  transparent shell carrying only `absolute` + left/top/size (no clip, no bg, no
  shadow). Keep the `TILE_PADDING` safe-area inset on its existing inner div.
- [x] 3.2 Generate the fade wrapper *inside* the `next/dynamic` loader so it mounts
  with the resolved chunk (keying the fade to content arrival, not frame mount):
  resolve `entry.load()` to a small component that renders the fade wrapper around
  the tile's default export. Keep `useMemo(..., [entry.load])` so the dynamic
  component identity stays stable and the fade does not re-fire on pan/band changes.
- [x] 3.3 Apply the `thingy-fade` class to the wrapper and set a per-mount random
  `animation-delay` of `Math.random() * FADE_DELAY_MAX_MS` ms, read once per mount
  (e.g. `useState` lazy init). Use `Math.random()`, not the seeded placement PRNG.

## 4. Verify

- [x] 4.1 `yarn lint` passes (Biome format + lint clean).
- [x] 4.2 In-browser: tiles fade in (whole tile, not just the drawing) on first load
  and on re-mount after panning out past the mount band and back; the batch is
  visibly staggered, not in unison.
- [x] 4.3 In-browser: confirm no persistent matrix sliver between flush tiles, and
  judge whether the transient sliver during the fade is acceptable (the known
  trade-off); tune `FADE_IN_MS` / `FADE_DELAY_MAX_MS` if the timing feels off.
- [x] 4.4 With OS "reduce motion" on, tiles appear instantly at full opacity with no
  fade.
- [x] 4.5 Off-screen tiles within the mount band that mount frozen stay invisible
  until panned into the active region, then fade in (no pop on arrival).
