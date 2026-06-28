## Why

When a `/thingies` tile is lazily mounted — on first load, or when it pans back
into the mount band — its drawing snaps in at full opacity. With tiles loading in
near-unison, the surface reads as a hard, synchronised "pop" rather than a calm
canvas settling into place. A short, slightly staggered fade-in makes tiles
materialise instead of pop, and breaks the unison so the surface feels organic.

## What Changes

- Each tile **fades in** when its content mounts, rather than appearing instantly.
  The fade is keyed to **content arrival** (the dynamically-imported chunk
  resolving), not to frame mount, so it never elapses against a blank placeholder.
- The **whole tile materialises as one** — opaque background, hairline-cover, and
  drawing ramp opacity together (option B), so there is no residual square-pop
  under a fading drawing.
- The fade starts after a **small per-tile random delay**, so a batch that mounts
  together fans out over a short window instead of firing in unison.
- The fade is gated behind `prefers-reduced-motion: no-preference`; reduced-motion
  visitors get instant appearance, matching the existing lava cross-fade pattern.
- Base duration **600ms**, random stagger window **~350ms** — both exposed as named
  tunables alongside the other thingies constants.

## Capabilities

### New Capabilities
<!-- none -->

### Modified Capabilities

- `thingies-canvas`: add a requirement that lazily-mounted tiles fade in (whole
  tile, staggered, reduced-motion-aware); clarify the existing opaque-background /
  no-sliver guarantee as a steady-state property that holds once a tile has faded
  in, with a brief, lock-step transient permitted during the mount fade.

## Impact

- **Code**: `src/features/thingies/components/thingy-frame.tsx` (move the opaque
  background, `BLEED` box-shadow, and overflow clip onto a fade wrapper inside the
  dynamic boundary; positioning div becomes a transparent shell); a fade keyframe
  added to `src/globals.css` under the reduced-motion media query; two new tunables
  in `src/features/thingies/constants.ts`.
- **No tile changes**: the fade lives entirely in the frame — no change to the tile
  contract or any individual tile.
- **No new dependencies**. Pure CSS animation plus a per-mount `Math.random()`
  delay (not the seeded placement PRNG — fade timing has no determinism constraint).
- **Risk to watch**: during the fade the hairline-covering box-shadow is briefly
  translucent, so a sub-pixel matrix sliver could flash between flush tiles. Bounded
  (sub-second, neighbours fade in lock-step) — verify in-browser.
