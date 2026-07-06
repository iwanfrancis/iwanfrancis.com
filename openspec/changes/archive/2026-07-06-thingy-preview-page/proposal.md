## Why

On `/thingies` a tile is placed somewhere inside a growing, shuffled blob, so
verifying one specific tile means panning and hunting for it — friction that worsens
as tiles are added and is especially painful for an agent that just scaffolded a tile
and needs to see *that* tile animate in isolation. There is no direct way to view a
single thingy on its own.

## What Changes

- Add a **single-tile preview route** at `/thingies/[id]` that renders one tile
  large, centred, and always-active (never frozen), with no canvas chrome to hunt
  through.
- Resolve `[id]` by **either the full tile id or the bare number**: `/thingies/0013`,
  `/thingies/13`, and `/thingies/0013-slinky-steps` all reach the same tile; a bare
  number redirects to the canonical full-id URL. An unknown id is a 404.
- Show a small caption (id · title · date) and clamped **prev/next** links that walk
  the registry order.
- Render on the **site's ambient background** (dot matrix + lava), held in a route-group
  layout so it persists — unbroken — across navigation between tiles.
- Keep the route **out of site navigation and `noindex`** — it is a direct-URL
  utility, not a browsable section.
- Update the **`add-a-thingy` authoring skill** so its final verification step points
  the author at `/thingies/<id>` instead of telling them to find the tile on the
  canvas blob.
- Delete the stray empty `0014-tamagotchi/` folder encountered here.

## Capabilities

### New Capabilities
- `thingies-preview`: an isolated single-tile preview surface — a direct-URL route
  that resolves a tile by full id or bare number, renders it large/centred/always
  active outside the canvas windowing, offers prev/next across the registry order,
  and is excluded from navigation and search indexing.

### Modified Capabilities
- `thingies-authoring`: the authoring tool SHALL direct isolated verification of a
  scaffolded tile to its preview route, rather than to locating the tile on the
  canvas.

## Impact

- **New route**: `src/app/(canvas)/thingies/(preview)/[id]/page.tsx` (server component:
  resolve/redirect/`notFound`, metadata, `generateStaticParams`) plus a
  `(preview)/layout.tsx` route-group layout holding the ambient background.
- **New feature code**: a client preview component and a small registry resolver
  helper under `src/features/thingies/` (reusing the already-decoupled
  `ThingyActiveProvider` and `TileErrorBoundary`; bypassing `ThingyFrame`'s
  fade/freeze/windowing).
- **Skill doc**: `.claude/skills/add-a-thingy/SKILL.md` verification step + closing
  message.
- **Cleanup**: remove empty `src/features/thingies/thingies/0014-tamagotchi/`.
- No new dependencies; no change to the canvas, the tile contract, or the registry
  shape.
