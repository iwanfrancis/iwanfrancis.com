## 1. Pause: fold into the freeze signal

- [x] 1.1 Add `paused` state to `ThingyCanvas`, initialised to `false`; read `prefers-reduced-motion: reduce` in a mount effect and seed `paused` from it (mirror the `tabHidden` pattern in `use-thingy-active.tsx`), so first render stays deterministic
- [x] 1.2 Fold `paused` into each tile's `frozen`: `frozen = paused || !intersects(bands.active, tile.left, tile.top)` in `thingy-canvas.tsx`
- [x] 1.3 Thread `paused` down so `ThingyActiveProvider` ANDs it out (active = on-screen-active AND tab-visible AND not paused); confirm `useThingyActive` reflects the third cause and `useThingyFrame` / `useThingyInterval` need no change — folded in via `active={!frozen}` (frozen already includes paused); no hook changes needed
- [x] 1.4 Verify a JS-loop tile (snake / game-of-life / cube) stops while paused and resumes from its held state without a catch-up jump — covered by the in-browser pass (6.2); mechanism: `active=false` stops the loop hooks, delta clock resets on resume

## 2. Pause: stop the lava background

- [x] 2.1 Add an optional `paused` prop to `LavaBackground` and `use-lava-field`, defaulting to `false`; suspend the loop on `paused` exactly as the existing `document.hidden` / reduced-motion path does (static frame, no continuous work) — held at the last frame so pausing freezes in place
- [x] 2.2 Pass `ThingyCanvas`'s `paused` into `LavaBackground`; confirm the landing page (no prop) still drifts unchanged — `matrix-background.tsx` omits the prop, defaults to `false`

## 3. Pause: keep on-screen paused tiles visible (fade trap)

- [x] 3.1 Pass a `paused` flag into `ThingyFrame` → `FadedTile`; when a tile is frozen *because of pause* (on-screen), render at full opacity with no fade animation — `pausedAtMount` captured in state, skips `.thingy-fade`
- [x] 3.2 Confirm the off-screen freeze still defers the mount fade (unchanged), and that pausing then panning to fresh tiles shows them at full opacity (not stuck transparent) — logic verified; visual confirmation in 6.2

## 4. Shuffle: permute the layout

- [x] 4.1 Add a permutation util beside `place-tiles.ts` that, given the placed cells, returns a new tile→cell assignment over the same cells (Fisher–Yates); leave `place-tiles.ts` itself unchanged — `utils/shuffle.ts`, generic
- [x] 4.2 Promote the layout in `thingy-canvas.tsx` from `useMemo([])` to `useState`, initialised to the deterministic placement; add an `onShuffle` handler that re-derives the layout via the permutation util
- [x] 4.3 Confirm tiles stay keyed by `entry.id` so on-screen survivors reposition (not remount), boundary-crossing tiles mount/unmount as usual, and the blob's cells/outline/count are unchanged after a shuffle — permuting the same cell set keeps bounds/centre invariant

## 5. Controls cluster

- [x] 5.1 Generalise `zoom-controls.tsx` into a canvas-controls component holding Shuffle, Pause/Resume, and the existing +/−; keep the `stopPropagation`-on-pointerdown wrapper and per-button `aria-label` — new `canvas-controls.tsx`; `zoom-controls.tsx` removed
- [x] 5.2 Add the Shuffle button (lucide `Shuffle`, `aria-label`, calls `onShuffle`)
- [x] 5.3 Add the Pause/Resume toggle: `aria-pressed={paused}`, label flips Pause/Resume animations, icon swaps lucide `Pause` ↔ `Play`, `disabled` under reduced motion with an explanatory `title`
- [x] 5.4 Wire `ThingyCanvas` to pass `onShuffle`, `paused`, `onTogglePause` alongside the existing `onZoomIn` / `onZoomOut`

## 6. Verify

- [x] 6.1 `yarn lint` clean (Biome formatting + a11y rules); fix any control-labelling lint — clean; `tsc --noEmit` also clean
- [x] 6.2 Manual pass in-browser (Chrome via devtools): no console errors / hydration warning on load; pause freezes all 12 tiles (`.thingy-frozen`) and holds the lava static, resume restores both and flips the toggle (label/`aria-pressed`/Play↔Pause icon); shuffle permutes seats (first tiles moved) while the position set — and so the blob shape — is preserved; all on-screen tiles stay fully opaque while paused. Reduced-motion seeding not exercised (env not in reduced-motion); fade-trap path can't trigger at the current 11-tile count (whole blob stays mounted) but the fix is in place for when more are added
