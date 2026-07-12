## Context

The app already sets a global keyboard-only focus style — `*:focus-visible` in
`src/globals.css` — and its shared controls (`Button`, `Badge`, `Input`, the desktop nav
item) style off `focus-visible:`. Two controls are stragglers: the `Dialog` and `Sheet`
close (×) buttons style their ring off plain `focus:`.

Live verification in Chrome (via the running dev server) confirmed the exact behaviour:

- Sheet close, opened by pointer: `activeElement.matches(':focus-visible') === false`, yet a
  gold ring renders — because the class is `focus:ring-2`, which matches any focus, not just
  `:focus-visible`. Radix auto-focuses the close on open, so the ring appears immediately on
  a mouse/tap open.
- Same close opened by keyboard: `:focus-visible === true`, ring renders — the wanted state.
- Theme toggle, "see more", and the nav trigger after a mouse-driven overlay **close** all
  report `:focus-visible === false` with no ring. The suspected Radix focus-return ring does
  **not** occur — Chrome keeps `:focus-visible` off through programmatic focus-return when
  the last input was a pointer.

So the browser is already computing the keyboard/pointer distinction correctly. The only
defect is two controls reading plain `:focus` instead of `:focus-visible`.

Current class strings:

- `dialog.tsx:80` — `focus:ring-ring … focus:ring-2 focus:ring-offset-2 focus:outline-hidden`
- `sheet.tsx:78` — `focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:outline-hidden`

## Goals / Non-Goals

**Goals:**

- The `Dialog` and `Sheet` close controls show a focus ring for keyboard/programmatic focus
  and not for pointer focus, with no change to keyboard behaviour.
- Capture the app-wide rule (focus rings on `:focus-visible` only) so future controls don't
  reintroduce the same defect.

**Non-Goals:**

- No modality-tracking mechanism (see Decisions).
- No change to the desktop dropdown menu-item highlight.
- No change to the global `*:focus-visible` rule — it is already correct.
- Not auditing every control in the app; the two overlay close controls are the only known
  violations, and the spec covers the general rule for review to enforce going forward.

## Decisions

**Decision: Swap `focus:` → `focus-visible:` on the two close controls.**
Each `focus:*` utility on the `Dialog` and `Sheet` close becomes its `focus-visible:*`
counterpart (`focus:ring-2` → `focus-visible:ring-2`, `focus:ring-ring` →
`focus-visible:ring-ring`, `focus:ring-offset-2` → `focus-visible:ring-offset-2`,
`focus:outline-hidden` → `focus-visible:outline-hidden`). This reads the signal the browser
already computes correctly, so no new logic is needed.

- *Alternative — global input-modality tracking* (a `data-input="mouse|key"` attribute on
  `<html>` gating rings): rejected. It is a whole mechanism to re-derive what `:focus-visible`
  already gives for free, adds global state, and risks fighting the native heuristic. Live
  testing showed the native heuristic is already correct here.
- *Alternative — remove the ring from the close controls entirely*: rejected. It regresses
  keyboard accessibility, which this repo enforces (Biome a11y group; the site is a CV that
  advertises WCAG work).

**Decision: Leave the dropdown menu items' `focus:bg-accent` unchanged.**
Radix drives menu-item focus on pointer-move, so the `:focus` background *is* the hover
highlight. Converting it to `focus-visible:` would remove the mouse-hover highlight in the
menu. The concern here is the *ring* on dismiss controls, not menu-item highlighting.

**Decision: No unit test — verify the behaviour live in the browser.**
This fix is not meaningfully testable under vitest/jsdom, for three compounding reasons found
during implementation:
- Tailwind utilities are not compiled in the test environment, so the ring never renders and
  `getComputedStyle(...).boxShadow` is always `none` regardless of the fix.
- `element.matches(':focus-visible')` reflects *how* the element was focused, not which
  classes it carries, so it returns the same value for `focus:` and `focus-visible:` — it
  cannot distinguish the fixed code from the broken code.
- jsdom does not reproduce the browser heuristic for Radix's auto-focus-on-open (indirect
  programmatic focus): a probe showed it reports `:focus-visible = true` for both mouse and
  keyboard opens, whereas Chrome reports `false` for a mouse open.

The real signal lives in compiled CSS plus the browser's `:focus-visible` heuristic, neither
of which jsdom has. The behaviour was verified live in Chrome (dev server): mouse/tap open →
no ring on the ×; keyboard open → ring; desktop dropdown highlighting unaffected. A genuine
automated test would need a browser harness (e.g. Playwright), which the repo does not have
and which is disproportionate to a two-line class fix. A class-string assertion was rejected
as an implementation-detail test that the repo's RTL philosophy steers away from.

## Risks / Trade-offs

- **A too-broad find/replace could convert `focus:` utilities that should stay (e.g. the
  dropdown highlight).** → Scope the edit to the two named close-control lines; the dropdown
  items live in a different file and are explicitly out of scope.
- **`:focus-visible` heuristics differ slightly across browsers.** → The fix strictly narrows
  when the ring shows (pointer no longer triggers it); keyboard still does everywhere
  `:focus-visible` is supported, which is all current target browsers. No regression versus
  today for keyboard users.
- **Test brittleness — asserting a ring via computed `box-shadow` is fragile.** → Assert on
  `:focus-visible` matching (the semantic condition), and/or simulate keyboard vs pointer
  focus, rather than pixel-matching the shadow.

## Migration Plan

Pure CSS-class change in two components; no data, API, or dependency impact. Rollback is
reverting the two edits. No migration steps.

## Open Questions

None.
