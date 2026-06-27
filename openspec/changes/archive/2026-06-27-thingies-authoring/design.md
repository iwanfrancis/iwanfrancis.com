## Context

`thingies-canvas` and `thingies-virtualisation` shipped. The registry
(`src/features/thingies/thingies.ts`) is a hand-maintained, append-only list of
`{ id, title, date, load }` entries; placement is derived from list order, so the
list is the source of truth and order matters. Five seed tiles exist
(`0001-concentric-rings` … `0005-wave-bars`). The tile "contract" (decorative,
non-interactive, reduced-motion-safe, palette-only, default-exported, prefer
SVG/CSS) currently lives only in the explore notes and is implied by the canvas
spec — nothing makes it followable in one place, and adding a tile is a manual,
five-step ritual that's easy to get subtly wrong (id arithmetic, insert position,
forgetting reduced-motion).

The repo already commits Claude Code skills under `.claude/skills/` (the
`openspec-*` family), so a skill is the idiomatic home for this tooling. The site
stays deliberately lean on dependencies.

## Goals / Non-Goals

**Goals:**

- Make adding a tile a single, safe, repeatable step that never reorders or
  touches existing tiles.
- Put the tile contract in one canonical, human-readable place that both the skill
  and a hand-author follow.
- Scaffold tiles that are contract-compliant before any drawing is written
  (reduced-motion-safe, decorative, palette, default export).
- Add zero runtime dependencies and zero shipped app behaviour — this is dev-time
  tooling.

**Non-Goals:**

- The single-tile preview route (`/thingies/preview/<id>`) and the phone
  authoring/preview loop — deferred, pending the parked infrastructure decision.
  Local authoring uses `yarn dev` + `/thingies` (a new tile lands at the frontier).
- Auto-globbing the registry. The explicit `() => import(...)` list is a deliberate
  decision (carries metadata/order, plays well with Turbopack) — keep it.
- Rendering placards / titles / dates on the page. Tiles still float bare.

## Decisions

### 1. A markdown Claude Code skill, not a Node scaffold script

`add-a-thingy` is a skill (`.claude/skills/add-a-thingy/SKILL.md`) that drives the
steps and lets the agent perform the file edits, rather than a committed
`scripts/new-thingy.mjs`.

- **Why:** zero new app/runtime code to maintain; matches the existing skill idiom;
  the operation is a precise, well-specified folder-create + one-line append the
  agent does reliably when the algorithm is spelled out. A script would have to
  string-edit (or AST-edit) the registry to insert before the closing `]`, which is
  fiddlier than it looks and is itself code to keep working.
- **Alternative considered:** skill + a small deterministic Node script (also
  hand-runnable). Rejected for now — extra maintained code for a one-line insert;
  revisit only if hand-driving the registry edit proves error-prone in practice.

### 2. The skill encodes an exact, deterministic procedure

To keep the agent from improvising, SKILL.md specifies the algorithm precisely:

1. **Name → slug/title:** take the author's tile name; `title` = the name as
   given, `slug` = kebab-case of it.
2. **Next id:** read `thingies.ts`, parse the leading 4-digit number of every
   `id`, take the max, `+1`, zero-pad to 4 → `NNNN`. The id is `NNNN-<slug>`.
   Abort if `thingies/NNNN-<slug>/` already exists.
3. **Scaffold:** create `src/features/thingies/thingies/NNNN-<slug>/index.tsx` from
   the template (below), substituting the component name and `<title>`.
4. **Register:** append one entry to the end of the `thingies` array — matching
   Biome formatting (2-space indent, single quotes, no semicolons, trailing comma)
   — with `id`, `title`, today's ISO `date`, and
   `load: () => import('./thingies/NNNN-<slug>')`.
5. **Verify:** confirm the new id appears exactly once, the array still parses, and
   the import path matches the folder.

### 3. The tile contract lives in the tiles folder as the single source of truth

A canonical contract doc at **`src/features/thingies/thingies/README.md`** — the
folder where tiles are authored, so it's the first thing an author sees. It
enumerates every guarantee (self-contained; fills the square; decorative /
`pointer-events: none` / `aria-hidden`; honours `prefers-reduced-motion`;
palette-only colour via `text-thingy-*`; default export; prefer SVG/CSS, WebGL the
exception). SKILL.md points to this doc as canonical rather than restating it, so
the contract has one home.

- **Alternative considered:** contract at the feature root (`src/features/thingies/`)
  or inside the skill dir. Rejected — colocating with the tile folders puts it
  exactly where the work happens; the skill is tooling, not the contract's home.

### 4. The template is embedded in SKILL.md as a fenced block

The starter `index.tsx` is a fenced code block in SKILL.md with `{{ComponentName}}`
/ `{{Title}}` placeholders, mirroring `0001-concentric-rings` in shape: an
`aria-hidden` SVG, `viewBox="0 0 100 100"`, `className="h-full w-full text-thingy-…"`,
any motion gated behind `motion-safe:`.

- **Why:** self-contained skill, no stray non-lintable `.tmpl` file; matches how the
  `openspec-*` skills embed their templates. A placeholder template can't be valid
  TSX anyway, so a separate file buys little.

## Risks / Trade-offs

- **Agent miscomputes the id or mangles the registry** → SKILL.md spells out the
  exact algorithm and a verify step (new id appears once, array parses, import path
  matches folder). The append-only, one-entry-per-line registry with a trailing
  comma keeps the insert point unambiguous.
- **Template drifts from the contract over time** → the README is canonical; the
  template is just an instance of it. The implementation checklist includes "keep
  the template in step with the contract", and the contract doc is the thing to
  edit when guarantees change.
- **Raster blur under zoom** → the contract and template steer to SVG/CSS, so a
  scaffolded tile is sharp at any zoom by default; 2D canvas/WebGL is a conscious
  opt-out.
- **Formatting** → the template is pre-formatted to Biome rules and the registry
  edit matches them; the existing `lint-staged` pre-commit hook is the backstop.

## Open Questions

- The phone authoring/preview loop is still parked. Resolving it (push-to-main vs
  Railway PR previews vs local-dev + tunnel) unblocks a future `thingies-preview`
  change that adds `/thingies/preview/<id>` and teaches the skill to open it.
