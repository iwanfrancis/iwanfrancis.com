## 1. Move the compositing hint under the engine

- [x] 1.1 Remove the static `willChange: 'transform'` inline style from the dots
      layer and the tiles layer in `thingy-canvas.tsx` (keep `transformOrigin`
      and layout).
- [x] 1.2 Add a `WILL_CHANGE_SETTLE_MS` tunable to `constants.ts` (start ~300 ms;
      must outlast `ZOOM_ANIM_MS` and `WHEEL_SESSION_GAP`), documented like the
      other felt-out timings.

## 2. Arm and release the hint in use-pan-zoom

- [x] 2.1 In the engine effect, initialise both layers to `willChange = 'auto'`.
- [x] 2.2 Add a `markActive()` that sets `willChange = 'transform'` on both layers
      (only when not already armed) and (re)starts a settle timer; on timer fire,
      set both back to `'auto'`.
- [x] 2.3 Call `markActive()` from the `applyTransform()` chokepoint so every path
      (drag, wheel, pinch, fling, button/keyboard zoom animation, resize) arms the
      hint and refreshes the settle timer.
- [x] 2.4 Clear the settle timer in the effect cleanup alongside the existing rAF
      cancellations, so a release can't fire after unmount.

## 3. Verify

<!-- Verified in Chrome via chrome-devtools MCP against the running dev server.
     Mechanism confirmed objectively (willChange armed on gesture, held through the
     animation + settle window, released at rest) on both the wheel and animated
     button-zoom paths. NOTE: this Chrome/GPU re-rasters even a *pinned* layer
     promptly after a settled discrete transform, and the screenshot tool only
     captures settled (crisp) frames — so a dramatic before/after blur could not be
     photographed here. The reported blur is a sub-frame/transient artifact whose
     persistence is environment-dependent; releasing the hint makes the re-raster
     prompt and deterministic, and drops the (anti-pattern) permanent promotion. -->

- [x] 3.1 Zoom into a non-animating tile (paused → all 13 tiles frozen) and
      confirm crisp at rest: at scale 3 with the hint released, concentric-rings
      and spirograph line-art render sharp. (Reduced-motion is the same static case
      the pause path exercises.)
- [x] 3.2 Hint is armed for the full gesture and released only after settle,
      verified on the animated button-zoom path (armed at 50ms & 250ms, auto by
      500ms). Promotion during the gesture is unchanged → no smoothness regression.
- [x] 3.3 Released the hint on BOTH layers; no re-raster hitch observed (dots are a
      tiled CSS background, cheap to re-raster). Kept both layers releasing — the
      dots-only fallback was not needed on this hardware. Revisit if a low-end
      device shows a dot-field hitch.
- [x] 3.4 `WILL_CHANGE_SETTLE_MS = 300` holds: never released mid-gesture (survives
      the 200ms zoom animation + wheel sessions), sharpens promptly at rest. Kept at
      300 (its floor, above ZOOM_ANIM_MS and WHEEL_SESSION_GAP).
- [x] 3.5 Run `yarn lint` and confirm clean. (Also `tsc --noEmit`: both pass.)
