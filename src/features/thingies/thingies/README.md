# Tile contract

Each folder here is one **thingy** — a small, self-contained visual experiment that
draws inside a fixed square on the `/thingies` canvas. This file is the canonical
contract: what a tile must satisfy. The `add-a-thingy` skill scaffolds a tile that
already meets it; if you hand-author one, follow this.

> Fastest path: run the **`add-a-thingy`** skill. It picks the next id, scaffolds a
> contract-conforming `index.tsx`, and registers the tile for you. You then just
> write the drawing.

## What a tile must do

- **Self-contained in source — but libraries are welcome.** Don't import from
  other tiles, other features, or app code; a tile stands alone in its folder. (The
  one sanctioned cross-folder import is the thingies runtime loop hooks — the
  harness API, covered in *Running a JS loop* below.) You
  *may* add a third-party library to experiment with (`yarn add` it). Import it at
  the top of your tile file: each tile is already code-split into its own chunk
  (the registry `load`s it dynamically) and only mounts when on-screen, so the
  library rides in that lazy chunk and never weighs on the initial page or the
  other tiles. For a very heavy library, defer it further with an in-component
  dynamic import. Two caveats carry over: a library that runs its own
  JS / `requestAnimationFrame` loop is only frozen off-screen if you drive or gate
  it through the runtime loop hooks (see below) — a loop left to run on its own
  keeps working unseen until the tile unmounts; and a WebGL library is still
  subject to the browser's live-context cap, so use those sparingly.
- **Default-export one component.** The registry loads the tile via
  `() => import('./thingies/<id>')`, so the component must be the file's
  `export default`. No props — it renders itself.
- **Fill the square.** The frame is a fixed square that clips overflow. Fill it
  with `h-full w-full` (or an SVG that does). See *scale-independent* below for
  sizing what's inside.
- **Be scale-independent.** A tile must look identical at any size. The square is
  `TILE_SIZE` (currently 100px), but that may change, and the canvas also zooms —
  so drive all geometry from the tile box, never from fixed pixels. Best: an SVG
  `viewBox` (e.g. `0 0 100 100`), which scales perfectly. Otherwise use percentages
  or fractions of `h-full w-full`. Avoid fixed-px sizing (Tailwind `h-2`, `gap-1.5`,
  `p-4`, …) for anything structural — it freezes at today's size and breaks if the
  tile size changes.
- **Be decorative and non-interactive.** The frame already renders content with
  `pointer-events: none`, so a tile can never capture a drag. Don't add click /
  hover / focus handlers or focusable elements. For SVG, set `aria-hidden="true"`.
- **Honour `prefers-reduced-motion`.** Gate every animation behind Tailwind's
  `motion-safe:` variant (e.g. `motion-safe:animate-pulse`). A reduced-motion
  visitor must see a sensible static result, never continuous motion.
- **CSS animation freezes for free; a JS loop needs the hooks.** Off-screen tiles
  are frozen by pausing CSS `animation-play-state` (the `.thingy-frozen` rule), so
  CSS / Tailwind `animate-*` freezes with zero effort — prefer it for simple motion.
  When a tile needs a real JavaScript loop (a simulation, a game), drive it through
  the runtime loop hooks so it freezes off-screen too — see *Running a JS loop*
  below. A raw `requestAnimationFrame` / `setInterval` / canvas draw loop that isn't
  wired through the hooks is **not** frozen and keeps doing unseen work until the
  tile unmounts.
- **Prefer SVG / CSS over 2D canvas; treat WebGL as the exception.** SVG and CSS
  stay crisp under zoom and freeze cleanly; a raster 2D canvas blurs past ~2× zoom,
  and browsers cap live WebGL contexts (~8–16), which windowing across many tiles
  would blow through.
- **Avoid hairlines — no wireframey 1px lines.** Prefer filled shapes; when you
  stroke, make it a confident, tile-scaled mark (roughly **3–5 units** in a
  `0 0 100 100` viewBox). Don't build structural lines from a Tailwind `border`
  (it's a 1px hairline *and* it doesn't scale with the tile — use SVG strokes or
  filled shapes instead) or from ~1px viewBox strokes. A thin line is fine only when
  a fine line is deliberately the point of the tile.

## Running a JS loop

Most tiles animate with CSS and need nothing here. When a tile needs a real
JavaScript loop — a simulation, a game like `0007-snake`, a physics toy — use the
**thingies runtime hooks** so the loop freezes off-screen in step with the CSS
freeze. They live in `../../hooks/` and are the one sanctioned cross-folder import
for a tile (they're the harness, not another tile):

- **`useThingyFrame((deltaMs) => { … })`** — a `requestAnimationFrame` loop for
  continuous motion. Your callback runs only while the tile is on-screen and the tab
  is visible; `deltaMs` is the time since the last real tick (clamped), so a tile
  resumes after a freeze with a normal step, never a jump.
- **`useThingyInterval(() => { … }, ms)`** — a fixed-cadence clock (e.g. "advance
  one cell every 180 ms"). Fires only while active; suspends off-screen and resumes
  with no catch-up burst. The natural fit for a grid game.
- **`useThingyActive(): boolean`** — the raw primitive both wrap. Use it directly
  when your loop doesn't fit the two shapes above (a third-party engine you must
  `.start()` / `.stop()`, a Web Worker): read it and stop your own work when it is
  `false`. With the primitive, freezing is **your** responsibility.

All three honour `prefers-reduced-motion` (the two convenience hooks simply don't
tick; with the primitive, gate your loop yourself, and show a sensible static
result). Tile state lives in the component and is preserved across a freeze, but a
tile panned far enough off-screen unmounts and starts fresh on return — don't rely
on long-term persistence. Anything not wired through these hooks will not freeze and
keeps running unseen until the tile unmounts: bounded waste, but waste.

## Colour: ink by default, palette as a minority accent

**Default to ink.** A tile is drawn in the site foreground ink — set
`text-foreground` on the root and derive every fill/stroke/border from
`currentColor` (`fill="currentColor"`, `bg-current`, `border-current`). An ink-only
tile is the norm and fully conforms; most tiles use no palette colour at all. This
keeps the canvas a calm, consistent field as it grows, rather than a rainbow.

**Accent is optional and a minority.** A tile *may* add a palette colour, but only
as a small pop — a focal dot, a leading bar, a sweep — by setting `text-thingy-*` on
that one element so its `currentColor` becomes the accent. A tile is **never** drawn
wholly in one accent colour. `0004-orbiting-dot` is the reference: an ink ring with a
single rose dot.

**The palette is tiered** — prefer the primary accents, reach for the rare ones only
deliberately:

| Tier    | Class                                       | Colour            |
| ------- | ------------------------------------------- | ----------------- |
| Primary | `text-thingy-blue`, `text-thingy-rose`      | blue, rose        |
| Rare    | `text-thingy-amber`, `text-thingy-teal`, `text-thingy-violet` | amber, teal, violet |

The palette is defined once in [`src/globals.css`](../../../globals.css) (the
`--color-thingy-*` tokens) and is also exposed as `bg-thingy-*` / `border-thingy-*`.
Add a colour there and it's available to every tile.

## Id & registration convention

The registry — [`../thingies.ts`](../thingies.ts) — is an **append-only, ordered**
list. Placement on the canvas is derived from list order, so the order is load
bearing.

- **Id format:** `NNNN-kebab-name` — a four-digit, zero-padded, sequential number
  then a kebab-case name (e.g. `0006-spinning-glyph`). Ids are unique.
- **Folder = id = entry id.** The folder name here equals the id, which equals the
  `id` field of the registry entry.
- **Always append, never insert.** A new tile's number is the current highest `+ 1`,
  and its entry goes at the **end** of the array. Inserting mid-list or reordering
  would reshuffle every later tile's position on the canvas — never do it.
- **Entry shape:** `{ id, title, date, load }` where `date` is the ISO date added
  and `load` is `() => import('./thingies/<id>')`.

Tiles still float bare on the page — `title` and `date` are metadata, not yet shown.
