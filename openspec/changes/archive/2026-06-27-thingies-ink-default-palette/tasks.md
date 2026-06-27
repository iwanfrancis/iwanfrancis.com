## 1. Palette tokens & tiering

- [x] 1.1 In `src/globals.css`, regroup the `--color-thingy-*` tokens into primary (`blue`, `rose`) and rare (`amber`, `teal`, `violet`), and update the block comment to state the ink-default model and the tiering. Keep all five tokens defined and the `text-/bg-/border-thingy-*` exposure unchanged.

## 2. Canonical contract (README)

- [x] 2.1 Rewrite the "Colour" section of `src/features/thingies/thingies/README.md`: ink (`text-foreground` + `currentColor`) is the default and the norm; palette colour is optional and, when used, a minority accent that is never the whole tile; document the `blue`/`rose` primary vs `amber`/`teal`/`violet` rare tiering (update the colour table to show tiers).
- [x] 2.2 Add a "Line weight" guarantee to the README contract: prefer filled shapes; use confident, tile-scaled strokes (~3–5 viewBox units); do not use Tailwind `border` for scaled line work or ~1px viewBox strokes; thin lines allowed only when a fine line is deliberately the point.

## 3. Authoring skill

- [x] 3.1 Update the `add-a-thingy` template in `.claude/skills/add-a-thingy/SKILL.md` so the scaffold defaults to `text-foreground` (ink) with `currentColor`, a confident stroke width (not 1.5/`border`), and a commented optional `text-thingy-blue`/`text-thingy-rose` accent line rather than defaulting the whole tile to `blue`.
- [x] 3.2 Update the skill's prose guidance (input note + the para after the template) to match: ink-by-default, optional minority accent, blue/rose preferred, no hairlines / no `border` for scaled lines.

## 4. Retrofit the six tiles

- [x] 4.1 `0001-concentric-rings`: recolour to ink (`text-foreground`), raise `strokeWidth` to a confident weight (~3–4); keep the breathing animation and opacity fade.
- [x] 4.2 `0002-nested-squares`: drop the 1px `border`; render ink squares as thick scaled strokes or filled translucent shapes (scale-independent — no fixed-px border); keep the dual rotation.
- [x] 4.3 `0003-pulse-grid`: recolour to ink; replace fixed-px sizing (`h-1.5 w-1.5`, `p-3`) with relative units so it is genuinely scale-independent; keep the diagonal pulse wave.
- [x] 4.4 `0004-orbiting-dot`: ink ring (thicker/softer, no 1px `border`) + **rose** orbiting and centre dots — the exemplar two-tone tile; keep the orbit animation.
- [x] 4.5 `0005-wave-bars`: recolour bars to ink (ink-only, no accent — per author preference); keep the wave pulse.
- [x] 4.6 `0006-rotating-arc`: ink track + **blue** sweeping arc, raise stroke to a confident weight; keep the sweep animation and rounded cap.

## 5. Verify

- [x] 5.1 Run `yarn lint` (Biome) and confirm clean; no manual format needed (pre-commit hook handles it).
- [x] 5.2 Run `yarn dev` and eyeball `/thingies`: canvas reads as a calm ink field with only blue/rose pops (no amber/teal/violet), no hairline/wireframey lines, and each tile still animates and scales correctly when zoomed.
- [x] 5.3 Confirm reduced-motion: with `prefers-reduced-motion: reduce`, every retrofitted tile shows a sensible static result.
- [x] 5.4 Sanity-check scale-independence on the rewritten tiles (`0002`, `0003`, `0004`): no fixed-px structural sizing remains.
