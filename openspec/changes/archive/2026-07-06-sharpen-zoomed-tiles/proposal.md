## Why

When the visitor zooms into the `/thingies` canvas, tile content renders blurry
and only snaps crisp on its next repaint — an animating tile self-heals on its
next frame, but a static tile (e.g. under reduced motion) stays soft
indefinitely. The tiles are vector SVGs, so this is not a source-resolution
limit: it is the browser stretching a cached, permanently GPU-composited bitmap
of each transformed layer rather than re-rasterising it at the new scale.

## What Changes

- The two zoomable layers (dots and tiles) keep their permanent
  `will-change: transform` only while a pan/zoom gesture is in progress. When
  the transform settles (gesture ends and any zoom animation completes), the
  hint is released so the browser re-rasterises the layers crisp at the resting
  scale.
- The transform fast-path (smooth pan/zoom) is preserved during gestures —
  `will-change` is re-armed on gesture start and released a short debounce after
  the last transform change.
- No change to the transform maths, bounds, focal anchoring, or the layer
  architecture — only the lifecycle of the compositing hint.

## Capabilities

### New Capabilities

<!-- None. This refines the render behaviour of an existing capability. -->

### Modified Capabilities

- `thingies-canvas`: the "surface can be zoomed" behaviour gains a requirement
  that tile and dot content SHALL render crisp once a zoom settles (not remain a
  stretched raster), while the smooth transform path during a gesture is
  retained.

## Impact

- Code: `src/features/thingies/hooks/use-pan-zoom.ts` (arm/release the hint
  across the drag, wheel, pinch, button/keyboard-zoom, and fling paths);
  `src/features/thingies/components/thingy-canvas.tsx` (the two layers currently
  carry a static `willChange: 'transform'` inline style — this moves under the
  hook's control). Possibly `constants.ts` for a settle-debounce tunable.
- No API, dependency, or data changes. No change to SSR/hydration (the hint is
  applied imperatively after mount, as the transform already is).
- Risk to watch: releasing the hint on the ~40 000px dot-field layer forces a
  large re-raster; the dots may need a different treatment (kept promoted, or
  excluded) if that re-raster is itself a visible hitch.
