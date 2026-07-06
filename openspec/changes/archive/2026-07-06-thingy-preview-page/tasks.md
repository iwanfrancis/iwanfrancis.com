## 1. Tile resolution

- [x] 1.1 Add `src/features/thingies/utils/find-thingy.ts`: given a URL segment, return the matching registry entry (full id `NNNN-kebab`, or a bare `\d{1,4}` number zero-padded and matched against the `NNNN-` id prefix) plus whether the segment was already canonical; return null on no match.
- [x] 1.2 Handle edge cases: a bare number with no matching tile returns null; a numeric segment resolves to exactly one entry (ids are unique per number).

## 2. Preview render component

- [x] 2.1 Add a client component (`src/features/thingies/components/tile-preview.tsx`) that takes the tile `id` (only serialisable data crosses the server→client boundary — `load` is a function), looks its own registry entry up by id, and renders the tile via `dynamic(entry.load, { ssr: false })`, wrapped in `ThingyActiveProvider active={true}` and `TileErrorBoundary`.
- [x] 2.2 Render the tile large and centred (size via `vmin`), on opaque `bg-background` with `text-foreground`, `overflow-clip`, filling the square edge-to-edge (no safe-area inset) so the surrounding dot matrix frames it. No fade, no `paused`/`frozen`.

## 3. Route

- [x] 3.1 Add `src/app/(canvas)/thingies/(preview)/[id]/page.tsx` (server component): resolve `params.id` via `find-thingy`; `notFound()` on no match; `redirect('/thingies/' + entry.id)` when the segment is non-canonical.
- [x] 3.2 Add `generateStaticParams` returning `thingies.map((t) => ({ id: t.id }))`.
- [x] 3.3 Add `generateMetadata` setting the per-tile `<title>` and `robots: { index: false }`.
- [x] 3.4 Render the page: caption (`id · title · date`), clamped prev/next `next/link` anchors from the registry index (no wrap), and the `TilePreview` client island for the tile. Pin the caption/nav block to the tile width with `justify-between` so label-length changes don't reflow the row; give each text element an opaque `bg-background` plate.

## 4. Ambient background

- [x] 4.1 Add `src/app/(canvas)/thingies/(preview)/layout.tsx` (a route group, so no URL segment) holding `bg-matrix` + `LavaBackground`, with the page content above it. Placing it at this static segment — not at `[id]` — means Next preserves it across navigation, so the lava doesn't reset when stepping between tiles.

## 5. Skill + cleanup

- [x] 5.1 Update `.claude/skills/add-a-thingy/SKILL.md` step 5 and its closing message to direct verification to `/thingies/<NNNN-slug>` (isolated preview) instead of hunting the tile on the canvas blob.
- [x] 5.2 Delete the empty `src/features/thingies/thingies/0014-tamagotchi/` folder.

## 6. Verify

- [x] 6.1 `yarn lint` (Biome format + a11y) and `tsc --noEmit` pass.
- [x] 6.2 Manually verify in-browser: `/thingies/0013-slinky-steps` renders the tile large and animating; `/thingies/13` and `/thingies/0013` redirect to the canonical URL; an unknown id 404s; prev/next walk the registry and are clamped at the ends; the caption/nav don't reflow between tiles.
- [x] 6.3 Verify the ambient background (lava) persists across client-side navigation between tiles — it does not reset/restart on each prev/next.
