## Context

Tiles live in an ordered, append-only registry (`src/features/thingies/thingies.ts`),
each entry carrying `{ id, title, date, load }` where `load` is a static
`() => import('./thingies/<id>')`. The `/thingies` canvas places them by seeded
layout and renders each through `ThingyFrame`, which is tightly coupled to the canvas:
fade-in stagger, off-screen freeze (`ThingyActiveProvider active={onScreen}`), and
mount/unmount windowing. Two of the primitives it composes are already decoupled and
reusable on their own — `ThingyActiveProvider` (`hooks/use-thingy-active`) and
`TileErrorBoundary`.

The route group `(canvas)` provides a full-bleed, no-scroll shell with a floating
`Header` and no footer; `/thingies` is its only page today. `generateStaticParams`,
`generateMetadata`, `redirect`, and `notFound` are the standard App Router tools for a
dynamic segment.

## Goals / Non-Goals

**Goals:**
- A direct-URL page that renders exactly one tile, large and always animating, so a
  specific tile (especially a freshly scaffolded one) can be verified without hunting
  the canvas.
- Resolve a tile by full id or bare number, with a canonical URL.
- Reuse the real tile component and the existing decoupled primitives; add no new
  dependency.
- Point the `add-a-thingy` skill's verification at this route.
- Share the site's ambient background (dot matrix + lava), unbroken across
  navigation between tiles.

**Non-Goals:**
- No actual-canvas-size toggle (large-only for now).
- No fade-in, no freeze/windowing (those are canvas concerns).
- No listing/index page of all tiles, and no nav entry or search indexing.
- No support for previewing an *unregistered* tile folder.
- No refactor of `ThingyFrame`.

## Decisions

### Resolve via the registry with a small helper; canonicalise numbers

A feature util (e.g. `src/features/thingies/utils/find-thingy.ts`) resolves a URL
segment to a registry entry:
- If the segment is purely numeric (`/^\d{1,4}$/`), zero-pad to four digits and match
  the single entry whose `id` starts with `<NNNN>-`.
- Otherwise treat it as a full id and match `entry.id === segment`.
- Return the entry plus whether the incoming segment was already canonical (equal to
  `entry.id`).

`page.tsx` (server component) calls it, then:
- no match → `notFound()`;
- match but non-canonical segment (e.g. `13`, `0013`) → `redirect('/thingies/' + entry.id)`;
- canonical → render.

`generateStaticParams` returns the full ids (`thingies.map((t) => ({ id: t.id }))`), so
canonical pages are static; numeric URLs fall to on-demand rendering and immediately
redirect. `generateMetadata` reads the resolved entry for the `<title>` and sets
`robots: { index: false }`.

*Why not a variable dynamic import (`import('../thingies/' + id)`) to also cover
unregistered folders?* It fights webpack's dynamic-import context, and the
`add-a-thingy` skill registers a tile at scaffold time, so the registry already covers
the intended workflow. Using each entry's own static `load` keeps code-splitting
identical to the canvas.

### Render by composing the decoupled primitives, not `ThingyFrame`

The tile itself is a client island (a small `TilePreview` component) so the server
page stays mostly RSC. It takes only the tile **`id`** (a string), not the registry
entry: the entry's `load` is a function and can't cross the server→client boundary, so
the client component looks its own entry up from the registry by id.

```
ThingyActiveProvider active={true}      ← never frozen; JS-loop tiles animate
  └ TileErrorBoundary                   ← same failure isolation as the canvas
      └ dynamic(entry.load, { ssr:false })   ← tiles are client-only/animated
          └ centred square (large, sized via vmin), no inset, overflow-clip,
            text-foreground + opaque bg-background so currentColor tiles render right
```

No `thingy-fade`, no `paused`/`frozen`, no mount band. The drawing fills its square
edge-to-edge (no safe-area inset — there are no neighbouring tiles to keep clear of in
isolation), so the surrounding dot matrix reads as the tile's border.
`prefers-reduced-motion` needs no handling here — the tile and the runtime hooks honour
it themselves.

*Why not reuse `ThingyFrame` with flags?* It would mean threading "no fade / always
active / large / no windowing" props through a component whose whole reason to exist is
the canvas behaviour we're switching off. Composing the two already-decoupled
primitives directly is smaller and keeps the freeze logic in one place.

### Page chrome: stay in `(canvas)`, add caption + clamped prev/next

The route lives under the `(canvas)` group at
`src/app/(canvas)/thingies/(preview)/[id]/page.tsx`, inheriting the full-bleed shell
and the floating `Header` (the header's `/thingies` nav link is the way back). The
server page renders the caption (`id · title · date`) and prev/next `next/link` anchors
computed from the registry index (`i-1`, `i+1`, clamped — no wrap), around the
`TilePreview` client island. Not added to `siteConfig.nav`; `noindex` via metadata.

To defeat layout shift as titles change length, the caption + nav are pinned to the
tile's width (`w-[min(80vmin,640px)]`): the caption is centred and prev/next sit at the
two edges (`justify-between`), so a longer or shorter neighbour title can't reflow the
row. Each text element gets an opaque `bg-background` plate so it reads cleanly over the
dot matrix.

### Ambient background lives in a route-group layout, so it persists across navigation

The preview shares the site's ambient background — the `bg-matrix` dot field muted and
drifted by the `LavaBackground` canvas. It must **not** reset when stepping between
tiles, so it lives in a *layout*, not the page. But a layout **at** the dynamic `[id]`
segment is keyed by the param and remounts on every navigation (restarting the lava's
cross-fade). So the background lives one level up, at a **static** segment, via a route
group: `src/app/(canvas)/thingies/(preview)/layout.tsx` holds `bg-matrix` +
`LavaBackground`, and the pages sit at `(preview)/[id]/page.tsx`. The `(preview)` group
adds no URL segment (pages stay at `/thingies/[id]`) but gives a layout Next preserves
across navigation — only the page below re-renders, so the lava keeps drifting.

*Why not hoist it to the parent `(canvas)` layout?* The `/thingies` canvas page paints
its own pannable lava (wired to its pause control), so a shared `(canvas)`-level lava
would double up there. The `(preview)` group scopes it to the preview pages only.

### Skill update

`add-a-thingy` step 5 and its closing message change from "`yarn dev` shows it at the
frontier edge of the blob on `/thingies`" to directing verification to
`/thingies/<NNNN-slug>` (the isolated preview). No template/contract change.

## Risks / Trade-offs

- **[Numeric URLs aren't pre-rendered]** → They render on-demand then 308-redirect to
  the static canonical page; a one-time redirect, negligible for a utility route.
- **[Large render diverges from the 100px canvas look]** → Intended: the tile contract
  guarantees scale-independence, so the large preview is faithful and doubles as a
  scale-independence check. Actual-size viewing remains available on the canvas.
- **[Preview bypasses freeze, so a JS-loop tile runs while open]** → Correct for a
  single foreground tile; there is no off-screen tile to freeze here.
- **[A future stale/renamed id could 404]** → Acceptable; ids are stable and
  append-only, and unknown ids are meant to 404.

## Migration Plan

Additive: a new route (page + a `(preview)` route-group layout), one client component,
one util, plus the skill-doc edit and deletion of the empty `0014-tamagotchi/` folder.
No data or dependency changes, nothing to roll back beyond deleting the new files.

## Open Questions

None blocking.
