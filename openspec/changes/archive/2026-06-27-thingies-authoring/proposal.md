## Why

The canvas ships (`thingies-canvas`, `thingies-virtualisation`), but adding a tile
is still tribal knowledge: hand-create a folder, write `index.tsx`, work out the
next `NNNN` id, append a registry entry in the right place, and remember an
unwritten contract (decorative, non-interactive, reduced-motion-safe, palette
colours, prefer SVG/CSS). The contract is scattered across the explore notes and
implied by the canvas spec; nothing makes "add a thingy" a safe, repeatable,
one-step append. This change makes authoring a tile reliable and boring so the
grid can actually grow.

## What Changes

- Add an **`add-a-thingy` Claude Code skill** (under `.claude/skills/`) that
  scaffolds a new tile end to end: picks the next sequential id, creates the tile
  folder + a contract-conforming `index.tsx` from a template, and appends the
  registry entry to `thingies.ts` — append-only, never touching existing tiles.
- Add a **canonical tile-contract doc** colocated with the thingies feature: the
  single source of truth for what a tile must satisfy. The skill and any
  hand-author follow it.
- Establish the **tile id / registration convention** (`NNNN-kebab-name`, unique,
  sequential, appended last) as an explicit, checkable rule rather than a pattern
  you infer from the existing five tiles.

**Non-goals (explicitly deferred):**

- The **single-tile preview route** (`/thingies/preview/<id>`) and the **phone
  authoring/preview loop**. The preview loop is parked pending an
  infrastructure/workflow decision; this change deliberately excludes both so it
  doesn't depend on that choice. Local authoring uses `yarn dev` + the existing
  `/thingies` page (a new tile lands at the blob's frontier edge).

## Capabilities

### New Capabilities

- `thingies-authoring`: the repeatable process for adding a new tile — the tile
  contract as a checkable source of truth, the id / registration convention, and
  an authoring tool that scaffolds a new tile to the contract and registers it.

### Modified Capabilities

<!-- None. `thingies-canvas` already specifies tile runtime behaviour
     (non-interactive, opaque background, palette, lazy-loaded, error-isolated,
     reduced-motion). This change adds the authoring-side capability and does not
     change any existing requirement. -->

## Impact

- **New:** `.claude/skills/add-a-thingy/` (skill definition + tile template).
- **New:** a tile-contract doc colocated with `src/features/thingies/`.
- **Modified per-run, not by this change:** `src/features/thingies/thingies.ts` is
  the append target the skill writes to; a header comment may point authors at the
  contract.
- **No runtime/deploy change:** the skill is dev-time tooling; no new
  dependencies, no change to the deployed page. The deferred preview route would
  be the only thing that touches `app/` — and it is out of scope here.
