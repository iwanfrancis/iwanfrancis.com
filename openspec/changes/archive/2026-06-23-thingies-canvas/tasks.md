## 1. Shell: split the layout into route groups

- [x] 1.1 Reduce `src/app/layout.tsx` to `<html>`/`<body>` + fonts + `AppProvider` only (no Header/MatrixBackground/Footer).
- [x] 1.2 Add `src/app/(site)/layout.tsx` holding the current shell (`Header` + flow `MatrixBackground` + `Footer`) and move `page.tsx` to `src/app/(site)/page.tsx`.
- [x] 1.3 Verify the landing page `/` is visually unchanged (header, footer, lava background, spacing) and still builds/lints. (`/` serves HTTP 200; shell moved verbatim. Visual spot-check pending dev restart — see note.)
- [x] 1.4 Add `src/app/(canvas)/layout.tsx`: `Header` only, `100dvh`, `overflow: hidden`, no footer, no document scroll.

## 2. Placement engine (pure, deterministic)

- [x] 2.1 Add a tiny seeded PRNG (e.g. mulberry32) under `src/features/thingies/utils/`.
- [x] 2.2 Implement `placeTiles(count)` → `Array<{ col, row }>`: tile 0 at origin; each next tile from edge-adjacent frontier candidates.
- [x] 2.3 Add the gap-free guard: reject any candidate whose placement encloses an empty region (bounded 4-connected flood-fill; diagonal-only escape counts as enclosed).
- [x] 2.4 Add scoring: prefer filled-neighbour count plus seeded jitter; tuning weight `JITTER` exposed (set to 5 — "middle, leaning amoeba").
- [x] 2.5 Sanity-check determinism (same count → same cells), append-stability (count N+1 keeps the first N cells), and no-holes, over counts 1–400. All pass: 0 holes, fully connected, deterministic, append-stable.

## 3. Pannable surface

- [x] 3.1 Build the `'use client'` canvas surface: a fixed viewport container with the ambient lava layer behind the dots/tiles.
- [x] 3.2 Paint `bg-matrix` dots on a layer that pans with the tiles (dots + tiles share one transform; lava stays viewport-fixed between them).
- [x] 3.3 Implement drag-to-pan with Pointer Events + `setPointerCapture` + `touch-action: none` (one path for mouse and touch).
- [x] 3.4 Clamp the pan offset to the content bounds + margin so the tiles can't be lost in the void.
- [x] 3.5 Add drag momentum/inertia on `pointerup` (velocity decay, respecting the bounds clamp).

## 4. Tile frame and registry

- [x] 4.1 Define the registry `src/features/thingies/thingies.ts`: `Array<{ id, title, date, load }>` with `load` as a dynamic import.
- [x] 4.2 Build a local class-based error boundary (`tile-error-boundary.tsx`, no new dependency) that renders a quiet placeholder on error.
- [x] 4.3 Build the tile frame: fixed square, `overflow: hidden`, absolutely positioned at its cell coords, content wrapped in a `pointer-events: none` layer.
- [x] 4.4 Load tile content via `next/dynamic(load, { ssr: false, loading })` so each tile is its own chunk; wrap in the error boundary.

## 5. Seed tiles

- [x] 5.1 Create 5 seed tiles under `src/features/thingies/thingies/<id>/index.tsx` (concentric rings, nested squares, pulse grid, orbiting dot, wave bars) — one per palette accent, self-contained SVG/CSS, decorative.
- [x] 5.2 Gate tile animation behind `prefers-reduced-motion` (Tailwind `motion-safe:` variant).
- [x] 5.3 Register the seed tiles in the registry.

## 6. Assemble and verify

- [x] 6.1 Compose the page: compute cells from the registry, render the surface with one frame per tile at its cell.
- [x] 6.2 Confirm tile contents never capture pointers — a drag started on a tile pans the surface. Verified in-browser: all layers `pointer-events: none`, `touch-action: none` on the container; a simulated drag moved the surface, with dots + tiles sharing one transform and the offset clamped to bounds (150px drag → clamped to 140px).
- [x] 6.3 Verify a deliberately-broken tile is isolated (placeholder shows; page, panning, and other tiles still work). Verified: a temporary throwing tile rendered as an empty frame (6 frames, 5 with content, 1 empty); page stayed up and panning still worked; the only effect was the dev overlay's caught-error toast. Temporary tile removed; console clean.
- [x] 6.4 Verify on a touch device: drag pans, the page itself doesn't scroll or zoom, and reduced-motion is honoured. Confirmed working on mobile (over LAN).
- [x] 6.5 Confirm a production build succeeds (must stop the dev server first — building against a live dev server corrupts `.next`). `yarn build` passed: compiled + type-checked clean, all 6 static pages generated, `/thingies` prerendered static at 4.4 kB / 107 kB first load (tiles code-split into separate on-demand chunks).

## 7. Refinements (from review)

- [x] 7.1 Give each tile an opaque page-matched background (`bg-background`) so the matrix doesn't show through.
- [x] 7.2 Define a fixed accent palette as Tailwind colours (`--color-thingy-*` in `@theme`); five muted accents (amber, teal, blue, rose, violet).
- [x] 7.3 Point the seed tiles at the palette via `text-thingy-*` utilities (one accent each). Verified in-browser: 5 tiles, opaque frames, palette utilities resolve.

<!-- NOTE: Verified on the dev server (port 3001): /thingies serves 200 with no
console errors; dots + lava + tiles render; 3 seed tiles place as a small amoeba;
drag pans with dots/tiles in lockstep and clamps to bounds; / still renders the full
landing page after the route-group move. Lint clean; placeTiles validated (0 holes,
connected, deterministic, append-stable over counts 1–400). Remaining: 6.3 (inject a
throwing tile), 6.4 (touch device), 6.5 (prod build with dev stopped). -->
