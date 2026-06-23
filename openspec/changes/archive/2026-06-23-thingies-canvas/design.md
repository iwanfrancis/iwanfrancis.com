## Context

`/thingies` is a new full-viewport, pan-around canvas of square visual
experiments (full background in `openspec/notes/thingies.md`). It does not fit the
site's current shell: the root `src/app/layout.tsx` wraps every page in
`Header → MatrixBackground(children) → Footer` in document flow, with the lava
`MatrixBackground` sized to its flowed container. This change adds the page, its
shell, the pannable surface, the automatic gap-free tile growth, and a reusable
lazy tile frame — but not virtualisation (Change 2) or authoring tooling
(Change 3). The site is deliberately lean on dependencies and follows
bulletproof-react.

## Goals / Non-Goals

**Goals:**

- A `/thingies` page that fills the viewport, drops the footer, and doesn't scroll
  the document — without changing the landing page.
- Drag-to-pan (mouse + touch, one code path), with the dot grid panning in
  lock-step with the tiles and panning clamped to the tiles' extent.
- Deterministic, append-only, gap-free "amoeba" placement on a lattice — no
  manual coordinates, existing tiles never move when one is appended.
- A reusable tile frame: fixed square, content code-split and lazily loaded,
  non-interactive, failure-isolated.
- 2–3 seed tiles proving the contract.
- No new runtime dependencies.

**Non-Goals:**

- Virtualisation / off-screen unmount + animation pause (Change 2).
- Add-a-thingy skill, single-tile preview route, published tile-contract doc
  (Change 3).
- Zoom, tile placards, and a nav link to `/thingies`.
- A formal, externally-documented tile authoring contract (seed tiles just follow
  the conventions below).

## Decisions

### 1. Two route groups under an unchanged root layout

Next.js always applies the root layout, so a child layout can't *remove* the
footer. Split the shell with route groups (no URL impact):

- `src/app/layout.tsx` → keep only `<html>`, `<body>`, fonts, and `AppProvider`.
- `src/app/(site)/layout.tsx` → the current shell (`Header` + flow
  `MatrixBackground` + `Footer`); move `page.tsx` to `(site)/page.tsx`.
- `src/app/(canvas)/layout.tsx` → the full-bleed shell (`Header` only, fixed
  background, no footer, `100dvh`, `overflow: hidden`); `(canvas)/thingies/page.tsx`.

The header is already `position: fixed` (`z-50`), so it floats over the canvas
unchanged. *Alternative rejected:* a `position: fixed` overlay inside the existing
layout — leaves the footer in the DOM, double-renders the background, hacky.

### 2. Dots live on the panning plane; lava stays fixed

The pannable surface is a single large element with `transform: translate3d(x,y,0)`
that carries both the `bg-matrix` dot background and the absolutely-positioned tile
frames. Because the dots are painted on that element, they pan with the tiles for
free — no separate background-position bookkeeping. The ambient lava canvas sits on
a `fixed inset-0` layer *behind* the plane and keeps its own autonomous drift.

The plane is sized to the tiles' bounding box plus a margin, and panning is clamped
(Decision 4) so the plane edge never enters the viewport — so the dot field always
fills the screen with no seam. *Alternative rejected:* keep dots on a fixed layer
and shift `background-position` by the pan offset — more state, and aligning the
fixed dots with tiles during overscroll is fiddly.

### 3. DIY pointer-event panning (no library)

A `'use client'` surface handles `pointerdown`/`move`/`up` with
`setPointerCapture`, updating the translate offset via `translate3d` (compositor-
only, no layout). `touch-action: none` on the surface stops the browser stealing
the gesture for scroll/zoom on mobile. Drag momentum/inertia is included: on
`pointerup`, decay the last pointer velocity and keep translating until it settles
(respecting the bounds clamp). Pointer Events unify mouse + touch in one path.
*Alternative rejected:* `react-zoom-pan-pinch` / `@use-gesture` — only worth a
dependency once we want pinch-zoom, which is out of scope.

### 4. Panning clamped to content bounds

Track the tiles' bounding box (cells → px). Clamp the pan offset so that box, plus
a margin, can't leave the viewport. Overscroll may rubber-band but settles back in
bounds. This keeps the plane covering the viewport (Decision 2) and stops the
visitor drifting into empty space.

### 5. Placement: deterministic "sticky-frontier" growth

A pure module computes `cells: Array<{col,row}>` from the tile count, seeded by a
fixed constant via a tiny inline PRNG (e.g. mulberry32) — no `Math.random`, so it's
deterministic and replayable. Algorithm, tile by tile:

1. Tile 0 → origin `(0,0)`.
2. Candidates = empty cells sharing a full edge (4-adjacent) with the placed set.
3. Reject any candidate whose placement would enclose an empty region: tentatively
   place it, then for each empty 4-neighbour flood-fill through edge-adjacent empty
   cells; if it can't reach beyond the current bounding box + margin, it's a
   trapped hole → reject. (Diagonal-only escapes count as enclosed.)
4. Score the rest: primary = count of filled neighbours (fills concavities → stays
   solid, no sparse arms); plus a mild outward bias and a seeded jitter so the
   frontier wanders into lobes. Weights tuned "middle, leaning amoeba".
5. Pick the top candidate; repeat.

Because tile `i`'s cell depends only on tiles `0..i-1`, appending never moves an
existing tile. Placement is pure and deterministic, so it can run in an RSC and
pass coordinates down (no client compute, no hydration mismatch), memoised by
count. Cell → px uses a cell pitch of `tileSize + gutter` — starting at **100px
tiles with a ~2px gutter** (pitch 102px), so the dot grid shows as a thin seam
between tiles. Both are tweakable. For a few hundred tiles the bounded flood-fill
is negligible at load.

### 6. Tile frame: code-split, non-interactive, failure-isolated

The registry (`src/features/thingies/thingies.ts`) is an explicit array of
`{ id, title, date, load }`, where `load` is a dynamic import. The frame component
loads `load` via `next/dynamic(..., { ssr: false, loading })` — each tile is its
own chunk, fetched on demand, so the shell isn't blocked and tiles stream in
(`ssr: false` also avoids hydrating canvas/animated content). The frame is a fixed
square (`overflow: hidden`), wraps content in a `pointer-events: none` layer so it
can never steal a drag, and sits inside a small class-based error boundary
(written locally — no `react-error-boundary` dependency) so one broken tile renders
a quiet placeholder instead of blanking the page.

### 7. Seed tiles follow lightweight conventions

2–3 tiles under `src/features/thingies/thingies/<id>/index.tsx`, each a
self-contained default-export component rendering into a square — pure SVG/CSS
preferred, decorative, and gating any animation behind `prefers-reduced-motion`.
The full, documented authoring contract is Change 3; seeds just demonstrate it.

### 8. Tiles have an opaque, page-matched background

Each tile frame carries `bg-background`, so the dot matrix doesn't show through a
tile's body — only the ~2px seam between adjacent tiles reveals the grid. This
makes the blob read as solid windows cut into the dot field, reinforcing the
gap-free amoeba. No border is added (tiles stay bare); the dots stopping at the
tile edge is enough delineation.

### 9. Fixed accent palette as Tailwind colours

The palette lives in `@theme` in `globals.css` as `--color-thingy-*`, which makes
each accent a first-class Tailwind colour (`text-thingy-teal`, `bg-thingy-rose`,
`border-thingy-amber`, …) — the repo's idiom, so tiles need no inline colour
constants. Five deliberately muted accents to start (amber, teal, blue, rose,
violet), shared across both themes for now; tunable, and a per-theme split can come
later via the existing `@theme inline` + `:root`/`.dark` pattern. *Alternative
rejected:* a TS array of `var(--…)` strings — works, but isn't Tailwind-native and
duplicates the source of truth.

## Risks / Trade-offs

- **Layout refactor regresses the landing page** → move the existing shell into
  `(site)/layout.tsx` verbatim and confirm `/` is visually unchanged (header,
  footer, lava background, spacing) before moving on.
- **Mobile gesture quirks (iOS Safari pointer capture / `touch-action`)** → rely on
  Pointer Events + `touch-action: none`; verify drag, and that the page itself
  doesn't scroll/zoom, on a real touch device.
- **`ssr: false` tiles flash/shift on load** → Suspense/`loading` fallback sized to
  the tile so the grid never reflows; acceptable for decorative content.
- **Placement flood-fill cost at high tile counts** → bounded flood-fill + memoise;
  if it ever bites, revisit when Change 2 adds windowing.
- **Building while `yarn dev` runs corrupts `.next`** (known in this repo) → don't
  run `yarn build` against a live dev server while developing.
- **Tiles visually merging** → the ~2px gutter lets the dot grid show as a seam
  between tiles; gutter and tile size are tuning knobs, not structural.

## Migration Plan

Additive plus one behaviour-preserving layout refactor. Deploy as normal. Rollback
is a straight revert — no data, no schema, no external services. The landing page
and the reused `bg-matrix`/lava visuals are untouched in behaviour.

## Decided

- **Tile size:** 100px to start (a multiple of the 20px dot pitch), tweakable.
- **Gutter:** a small ~2px gutter between tiles (cell pitch 102px) so the dots
  show as a seam.
- **Inertia:** included in v1 (Decision 3).
- **Header over canvas:** leave as-is for now; revisit only if legibility over busy
  tiles proves a problem.
- **Tile background:** opaque `bg-background` (Decision 8) — the matrix doesn't show
  through tiles.
- **Accent palette:** five muted Tailwind accents (Decision 9), shown by five seed
  tiles (one per accent).
- **Zoom:** wanted, but deferred to a follow-up change (it pairs with the panning
  surface) — out of scope here.

## Open Questions

- **Amoeba tuning** — the scoring weights (neighbour preference vs outward bias vs
  jitter) that land "middle, leaning amoeba"; tuned live in the browser.
