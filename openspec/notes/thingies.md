# thingies — exploration notes

Working notes from an explore session. Not a spec. Captures the concept, the
decisions made, and the planned change breakdown so we can pick this up later.

## Concept

A new page at **`/thingies`** — an ongoing art project. A grid of equally sized
square tiles, each holding a small self-contained visual experiment (an SVG
pattern, a CSS/canvas animation, a sketch from some visual library, etc.). Start
with a few, add to it continually over time so the grid grows and grows. The page
matches the rest of the site (matrix dot grid + drifting lava background).

Name: **thingies** (deliberate spelling of "thingys"; route `/thingies`).

## Decisions locked

- **Name / route:** `thingies` → `/thingies`.
- **Background:** the dot grid pans *with* the tiles — it's one big surface the
  tiles are pinned to, not a fixed backdrop they glide over.
- **Interaction:** pan only. No zoom in v1 (design the transform so zoom can slot
  in later if wanted).
- **Tiles:** float bare — no placard / number / title / date for now. Reversible
  later.
- **Growth feel:** solid, connected, gap-free blob with a ragged edge —
  "somewhere in the middle, leaning amoeba" (lobed, not tight-and-round).
- **Tile contents are non-interactive** — this is what makes dragging simple
  (nothing inside a tile captures pointers).
- **Tiles have an opaque, page-matched background** (`bg-background`) — the matrix
  doesn't show through a tile; only the seam between tiles reveals the dots.
- **Fixed accent palette** — five muted accents (amber, teal, blue, rose, violet)
  as Tailwind colours (`--color-thingy-*` → `text-thingy-*`), to keep the page's
  visual intensity controlled. Tunable / extendable.

## Parked / open

- **Phone authoring + preview loop.** How to iterate on tiles from a phone and
  preview them. Iterating on code from a phone needs a preview that isn't "run
  the dev server". The unlock is a **single-tile preview route**
  (`/thingies/preview/<id>` — one tile, full-bleed, no grid, no pan) that's just
  a URL you can eyeball. But "look" still needs a running build. Options:
  - **A. Push to main → Railway deploys → live URL** — zero new infra, but a
    deploy wait per tweak and it churns the live site.
  - **B. Per-branch / PR preview deploys** — clean, but needs Railway preview
    envs and breaks the "main only" habit.
  - **C. Local dev + tunnel (e.g. ngrok)** — instant, but painful to drive from
    a phone.
  - Iwan does **not** want to push straight to main; will revisit and choose.
    The authoring skill must encode whichever loop is chosen, so this is the
    blocker for Change 3.
- **Edge raggedness dial** is set to "middle, leaning amoeba" — exact tuning
  (how much randomness vs neighbour-preference) to be felt out in the browser
  during Change 1. (Landed at `JITTER = 5`.)
- **Zoom** — wanted (instinct to pinch/zoom rather than scroll-zoom the page), but
  deferred to a **follow-up change** after `thingies-canvas`. It pairs with the
  panning surface; design the transform so zoom slots in.

## Page anatomy — the layer cake

A fixed decorative background, a panning plane on top, tiles pinned to the plane.

```
┌─ viewport (100dvh, no document scroll) ───────────────┐
│  Header (fixed, floating over everything)        z:50 │
│                                                       │
│   ┌─ background: bg-matrix dots + lava ────────┐ z:0  │
│   │                                            │      │
│   │   ┌─ PANNING plane (transform: translate)─┐│ z:10 │  ← drag this
│   │   │   ┌────┐ ┌────┐ ┌────┐                ││      │     (dots pan
│   │   │   │ T  │ │ T  │ │ T  │  ← tiles       ││      │      with it)
│   │   │   └────┘ └────┘ └────┘   (only on-     ││      │
│   │   │   ┌────┐ ┌────┐ ┌────┐    screen ones  ││      │
│   │   │   │ T  │ │ T  │ │ T  │    mount)       ││      │
│   │   │   └────┘ └────┘ └────┘                 ││      │
│   │   └──────────────────────────────────────┘ │      │
│   └─────────────────────────────────────────────┘      │
│                                            (no footer)  │
└─────────────────────────────────────────────────────────┘
```

**Shell tension found in the codebase:** the root `src/app/layout.tsx` hard-wraps
*every* page in `Header → MatrixBackground(children) → Footer` in normal document
flow. A full-bleed pan-around page fights that (footer, document scroll). Plan:
give `/thingies` its own layout via an App Router **route group**
(`app/(canvas)/thingies/`) so it drops the footer, owns the full viewport, and
kills document scroll — reusing the background *visuals* (`bg-matrix` + lava), not
the flow-based `MatrixBackground` wrapper.

The site is deliberately lean on dependencies (no animation/gesture libs). Worth
preserving — lean towards DIY pointer-events for the pan rather than pulling in a
pan/zoom library (a library only earns its place if we add pinch-zoom).

## Pan interaction

Tile contents are non-interactive (`pointer-events: none`), so the whole plane is
one drag surface and nothing inside a tile steals the drag. Pointer Events unify
mouse + touch, so one code path covers desktop and mobile.

```
  pointerdown ─▶ track dx,dy ─▶ translate plane ─▶ pointerup (+ inertia?)
```

- **Bounds:** clamp panning to the filled bounding box + margin, with a gentle
  rubber-band at the edge (an infinite void is disorienting).
- **Inertia / momentum:** small touch that feels good on mobile; optional for v1.

## Grid growth — gap-free connected amoeba

Placement is a **pure function of the append-only list** — tile N's cell is
decided from where 0…N-1 already sit. Appending never moves an existing tile
(stable, deterministic) and you never hand-place anything. Only ever append;
inserting mid-list would reshuffle later tiles.

Everything snaps to the square lattice (tiles equal size, sized to a multiple of
the 20px matrix so they kiss the dot grid). Messiness is purely *which* cells get
filled and in what order — the "grid" survives.

**Rules for each new tile:**

1. **Connect** — share a full edge with an existing tile (corner-only touch
   doesn't count → keeps it one connected piece).
2. **Never seal a gap** — never be the tile that encloses an empty region.

```
Blob:        Legal next:      ILLEGAL — corner only:   ILLEGAL — seals a gap:
  ■ ■ ■        ■ ■ ■ □           ■ ■ ■                    ■ ■ ■
  ■ ■ ·        ■ ■ ■             ■ ■ ·                    ■ ✗ ■
               (□ shares          · · ✗ (diagonal         ■ ✗ ■  ✗ traps the
                an edge)               touch only)        ■ ■ ■    empty cell
```

**Diagonal pinches count as holes.** An empty is "trapped" unless it can reach the
outside via edge-to-edge (4-connected) empty cells — a diagonal-only escape is an
infinitely thin slit and reads as a sealed hole, so it's disallowed.

**"Sticky frontier" placement** (prefer good moves, so gaps barely arise):

- Candidates = empty cells edge-adjacent to the blob.
- **Prefer the cell with the most filled neighbours** → fills concavities first,
  stays dense and solid rather than sprouting thin arms with bays behind them.
- **Seeded-random tie-break** → the messiness, at the single-tile edge scale.
  (Seed by tile id/index — deterministic, no `Math.random` at placement.)
- **Mild outward bias** → keeps expanding, not just thickening.
- "Never seal a gap" sits underneath as a hard guarantee. Growth never stalls —
  a finite blob always has outermost frontier cells that trap nothing.

Edge raggedness is a dial (strength of the neighbour-preference vs the random
tie-break). Set to "middle, leaning amoeba".

```
  Round / compact ◀───────────●──────────▶ Lobed / amoeba
                           (we're here,
                            leaning right)
```

```
  Rejected (blue noise — gaps, islands)   Chosen (sticky frontier — solid, ragged)
    ■ · ■ · ·                               · ■ ■ · ·
    · · ■ · ■                               ■ ■ ■ ■ ·
    ■ · · ■ ·                               ■ ■ ■ ■ ■
    · ■ · · ■                               · ■ ■ ■ ·
```

**Compute at runtime** over the list on load (registry stays pure metadata — id,
title, date). Fast for hundreds of cells. Can bake coords into the registry later
if we ever want permanence.

## Performance

Two distinct mechanisms (often conflated):

- **Code-split** — each tile is its own JS chunk via dynamic import; the registry
  ships only ids + metadata, not tile code. Initial bundle stays flat no matter
  how many tiles exist. → **goes in the foundation (Change 1)**, cheap and
  architecturally foundational.
- **Mount-window (virtualise)** — only render tiles whose cell intersects
  (viewport + margin). Pan away → unmount → animation stops, memory frees. →
  **deferred to Change 2**; only earns its keep at scale.
- **Pause, don't just unmount** — freeze a tile's animation when off-screen
  before it unmounts, so panning never stutters. (Change 2.)

Virtualisation is cheap to DIY here because cells are a known lattice — "which
cells fall in this rect" — no heavy windowing lib needed.

## Tile contract & registry

```
  features/thingies/
    thingies.ts             ← registry: [{ id, title, date, load }]
    components/
      thingy-canvas.tsx       ← pan plane + (later) virtualisation
      thingy-frame.tsx        ← the square: lazy boundary, error boundary
    thingies/
      0001-pulsing-rings/index.tsx
      0002-drift-noise/index.tsx
      ...
```

- Registry is an **explicit list of `() => import(...)` loaders + metadata**.
  Explicit (vs auto-glob) is the right call in Next/Turbopack — carries
  title/date/order, and the skill just appends one line.
- The **frame** is the only thing that knows about lazy-loading, error isolation,
  and (later) the placard. Each tile author just writes "a thing that draws in a
  square".
- **Contract guardrails:** self-contained; fixed square; decorative;
  `pointer-events: none`; respects `prefers-reduced-motion`; wrapped in an error
  boundary so one broken tile can't blank the page. **Prefer SVG / CSS / 2D
  canvas; treat WebGL as the exception** — browsers cap live WebGL contexts
  (~8–16), which windowing across many tiles would blow through.

## Change breakdown — three changes, two capabilities

A **change** = a unit of work (propose → build → archive). A **capability** = a
spec domain. These three changes land across two capabilities.

```
  CHANGE 1 ─ thingies-canvas (foundation)              ▶ ready now
    route-group shell (no footer, full viewport, no doc scroll)
    + pan (dots pan with content, clamped bounds)
    + amoeba gap-free growth (middle-lobed)
    + frame component: per-tile lazy code-split + error boundary
    + 2–3 seed tiles to prove it
         │
         ▼
  CHANGE 2 ─ virtualisation (same capability, scale)   ▶ later, when tile count needs it
    mount-windowing (only on-screen tiles mounted)
    + off-screen animation pause

  CHANGE 3 ─ thingies-authoring (new capability)        ▶ gated on phone-loop decision
    add-a-thingy skill + single-tile preview route + tile-contract doc
    └─ depends on Change 1, independent of Change 2
```

**Why this split:**

- Change 1 ships a real, on-brand page you can pan and start filling, and locks
  the *feel* (amoeba growth, tile size, pan, dot-panning) cheaply before any perf
  work sits on top.
- Change 2 is deferred on purpose — windowing is premature with a handful of
  tiles and is better designed against real tiles to profile. **Safety rule:
  Change 1 must build each tile as a lazy boundary from day one**, so Change 2 is
  additive (wrap the render in a viewport filter), not a rewrite.
- Change 3 is naturally last and parked — the skill must encode whichever
  phone/preview loop is chosen.

Leaner alternative: **two changes** (fold virtualisation into the foundation) —
only worth it if many tiles will be dropped in immediately.

## Codebase grounding (as of this session)

- `bg-matrix` is a pure CSS utility (20px dot grid) in `src/globals.css`.
- `MatrixBackground` (`src/components/layout/matrix-background/`) layers a drifting
  lava canvas at `z:0` with content at `z:20`; theme-aware and
  reduced-motion-aware already.
- Root `src/app/layout.tsx` wraps all pages in Header + MatrixBackground + Footer
  in document flow (the shell tension above).
- Lean deps: Next 15 (App Router) + React 19, Tailwind v4 (CSS config), shadcn/ui,
  no animation/gesture libraries.
- OpenSpec is clean — no active changes. These would be new capabilities.
