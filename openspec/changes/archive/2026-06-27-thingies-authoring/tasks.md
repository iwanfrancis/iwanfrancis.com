## 1. Tile-contract doc (single source of truth)

- [x] 1.1 Write `src/features/thingies/thingies/README.md` as the canonical tile
      contract: self-contained; fills a fixed square (`h-full w-full`); decorative
      and non-interactive (`aria-hidden`, no pointer capture — the frame already
      sets `pointer-events: none`); honours `prefers-reduced-motion` (gate motion
      behind `motion-safe:`); accent colour only from the palette via `text-thingy-*`
      (or monochrome); default-exports the component; prefer SVG / CSS over 2D
      canvas, WebGL the exception (live-context cap + zoom blur).
- [x] 1.2 In the README, document the id / registration convention
      (`NNNN-kebab-name`, sequential, append-only, folder name = id = registry `id`)
      and link `thingies.ts` as the registry.
- [x] 1.3 Add a short header comment to `src/features/thingies/thingies.ts`
      pointing authors at the README and the `add-a-thingy` skill.

## 2. add-a-thingy skill

- [x] 2.1 Create `.claude/skills/add-a-thingy/SKILL.md` with frontmatter
      (`name`, `description`) matching the `openspec-*` skill style.
- [x] 2.2 Encode the exact procedure: name → `title` + kebab `slug`; next id =
      max existing 4-digit prefix `+1`, zero-padded; abort if the target folder
      already exists.
- [x] 2.3 Embed the starter `index.tsx` template as a fenced block with
      `{{ComponentName}}` / `{{Title}}` placeholders, modelled on
      `0001-concentric-rings`: `aria-hidden` SVG, `viewBox="0 0 100 100"`,
      `className="h-full w-full text-thingy-…"`, motion gated behind `motion-safe:`.
- [x] 2.4 Specify the scaffold step: create
      `src/features/thingies/thingies/NNNN-<slug>/index.tsx` from the template.
- [x] 2.5 Specify the registry append: add one entry at the END of the `thingies`
      array (id, title, today's ISO date, `load: () => import('./thingies/NNNN-<slug>')`),
      matching Biome formatting (2-space, single quotes, no semicolons, trailing
      comma). Never insert mid-list or reorder.
- [x] 2.6 Specify a verify step: new id appears exactly once, the array still
      parses, and the import path matches the created folder; point the skill at
      the README as the contract source of truth (don't restate the contract).

## 3. Prove it end to end

- [x] 3.1 Run the skill to scaffold one real tile (e.g. `0006-…`) and confirm the
      folder, `index.tsx`, and appended registry entry are correct and existing
      tiles are untouched.
- [x] 3.2 Verify the scaffolded tile against the contract: `yarn lint` passes and
      it renders on `/thingies` (frontier edge) and is static under
      `prefers-reduced-motion: reduce`.
- [x] 3.3 Decide whether to keep the proof tile or revert it; leave the registry in
      the intended state.
