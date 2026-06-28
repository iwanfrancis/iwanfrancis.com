## 1. Active-state context + primitive hook

- [x] 1.1 Create `src/features/thingies/hooks/use-thingy-active.ts` with a React context (default value `true`) and a `useThingyActive(): boolean` hook that reads it.
- [x] 1.2 In the same module, export a `ThingyActiveProvider` that takes `active` and provides it; fold `document.hidden` into the value by subscribing to `visibilitychange` so `active = providedActive && !document.hidden`, re-evaluated on visibility changes.
- [x] 1.3 Ensure the hook returns `true` (not throw) when used outside a provider, so a tile rendered in isolation runs.

## 2. Convenience loop hooks

- [x] 2.1 Create `src/features/thingies/hooks/use-thingy-frame.ts` — `useThingyFrame(tick, opts?)` that runs a `requestAnimationFrame` loop, invoking `tick(deltaMs)` only while `useThingyActive()` is true.
- [x] 2.2 Measure `deltaMs` from the last tick that actually ran (clamp the first post-freeze frame to an ordinary delta), so resume after a freeze never yields a giant jump.
- [x] 2.3 Cancel the pending frame on unmount and when going inactive; restart cleanly on resume.
- [x] 2.4 Suppress ticking under `prefers-reduced-motion: reduce` by default (gated by `opts.respectReducedMotion`, default true).
- [x] 2.5 Create `src/features/thingies/hooks/use-thingy-interval.ts` — `useThingyInterval(fn, ms, opts?)` that fires `fn` on a fixed cadence only while active, suspends while inactive with no catch-up burst on resume, clears on unmount, and respects reduced motion by default.

## 3. Wire the signal through the frame

- [x] 3.1 In `src/features/thingies/components/thingy-frame.tsx`, wrap `<Content/>` in `ThingyActiveProvider value={!frozen}`, leaving the existing `.thingy-frozen` CSS class path unchanged.
- [x] 3.2 Confirm an existing CSS-only tile still freezes/resumes with no code change (visual check on the canvas).

## 4. Update the tile contract

- [x] 4.1 In `src/features/thingies/thingies/README.md`, rewrite the "prefer CSS over JS / JS isn't frozen" guidance into: CSS freezes automatically; use the runtime loop hooks for a JS loop so it freezes too; a raw `rAF`/`setInterval` still won't freeze and leaks until unmount.
- [x] 4.2 Add the same-feature carve-out: a tile may import the thingies runtime loop hooks (the harness API), which is not "importing another tile"; document the three hooks and when to use each.

## 5. Reference tile: snake

- [x] 5.1 Scaffold the next sequential tile (`0007-snake`) via the `add-a-thingy` skill (or by hand following the contract), keeping the registry append-only.
- [x] 5.2 Implement a self-running snake on an SVG `0 0 100 100` viewBox using `useThingyInterval` for the step clock; draw with `<rect>`s (no 2D canvas), ink-by-default with at most one minority accent.
- [x] 5.3 Provide a sensible static render under `prefers-reduced-motion: reduce` (no continuous motion).

## 6. Verify behaviour in-browser

- [x] 6.1 Snake advances on-screen; CPU work stops when it is panned off-screen into the freeze band; it resumes mid-game when panned back within the band.
- [x] 6.2 Panning far enough to unmount and back restarts the snake from its initial state.
- [x] 6.3 Switching to another tab pauses the snake; returning resumes it without a time jump.
- [x] 6.4 With `prefers-reduced-motion: reduce`, the snake does not animate and shows a static frame.
- [x] 6.5 Run `yarn lint` (Biome) clean across the new files.
