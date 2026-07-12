## 1. Fix the overlay close controls

- [x] 1.1 In `src/components/navigation/sheet/sheet.tsx` (Close control, ~line 78), swap each
      `focus:` ring utility to `focus-visible:` — `focus:ring-2`, `focus:ring-ring`,
      `focus:ring-offset-2`, `focus:outline-hidden`.
- [x] 1.2 In `src/components/layout/dialog/dialog.tsx` (Close control, ~line 80), swap each
      `focus:` ring utility to `focus-visible:` — `focus:ring-ring`, `focus:ring-2`,
      `focus:ring-offset-2`, `focus:outline-hidden`.
- [x] 1.3 Confirm no other `focus:` ring utilities were touched — the dropdown items'
      `focus:bg-accent` in `src/components/navigation/dropdown/dropdown.tsx` MUST stay
      unchanged.

## 2. Verify the behaviour (no unit test)

- [x] 2.1 No unit test added — this fix is not meaningfully testable under vitest/jsdom:
      Tailwind isn't compiled in the test env (so the ring never renders),
      `.matches(':focus-visible')` is orthogonal to the `focus:` vs `focus-visible:` class,
      and jsdom mis-models Radix's auto-focus-on-open heuristic (returns `:focus-visible` for
      both mouse and keyboard opens). The behaviour was verified live in Chrome instead:
      mouse/tap open → no ring on the ×; keyboard open → ring. See design.md → Decisions.

## 3. Verify

- [x] 3.1 `yarn lint` and `yarn typecheck` pass.
- [x] 3.2 `yarn test` passes (232/232; no new test — see task 2.1).
- [x] 3.3 Manually confirmed: opening the mobile nav sheet / a dialog with a mouse/tap shows
      no ring on the × ; opening either with the keyboard still shows the ring; desktop
      dropdown menu-item highlighting is unaffected.
