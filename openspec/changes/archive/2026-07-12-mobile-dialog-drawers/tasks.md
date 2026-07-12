## 1. Shared foundations

- [x] 1.1 Add a `useIsMobile()` hook in `src/hooks/` backed by `window.matchMedia('(max-width: 639px)')` (aligned to the Tailwind `sm` breakpoint); initialise `false` and subscribe in an effect so there is no hydration mismatch.
- [x] 1.2 Add a shared bottom-sheet class recipe in `src/components/layout/` (e.g. `bottom-sheet.ts`): centred panel at `sm+` (matching today's `DialogContent`), bottom-anchored full-width rounded-top sheet with slide-up/slide-down below `sm`. Reuse the existing `slide-in-from-bottom` / `slide-out-to-bottom` animation utilities.
- [x] 1.3 Add a `SheetGrabber` component in `src/components/layout/` (the drag handle affordance), hidden at `sm+`.

## 2. Drag logic (the testable core)

- [x] 2.1 Add a pure `shouldDismiss({ distance, height, velocity })` function (colocated with the dialog, e.g. `should-dismiss.ts`) implementing D3: dismiss when `distance > height * FRACTION` (~0.35) OR `velocity > VELOCITY_THRESHOLD` (~0.5 px/ms), else snap back. Keep constants tunable and colocated.
- [x] 2.2 Add `should-dismiss.test.ts` (`node` project) covering the three spec scenarios: long drag dismisses regardless of speed; fast flick dismisses despite short drag; short slow drag snaps back. Use `it.each` for the table.
- [x] 2.3 Add a `use-drawer-drag.ts` hook binding `@use-gesture`'s `useDrag` to the grabber: during drag set `transition:none` + inline `translateY(max(0, dy))` with light rubber-band for `dy < 0`; on release call `shouldDismiss` and either snap back (`translateY → 0`) or dismiss. Gate active behaviour on `useIsMobile()`. Set `touch-action: none` on the grabber only.
- [x] 2.4 Implement animate-out-then-close (D4) in the hook: on dismiss, animate `translateY → 100%`, wait for `transitionend`, then call `onOpenChange(false)` so Radix's exit animation stays invisible. Honour `prefers-reduced-motion` (suppress/minimise the slide) using the repo's existing matchMedia pattern.

## 3. Wire into the overlays

- [x] 3.1 Update `DialogContent` (`src/components/layout/dialog/dialog.tsx`) to use the shared bottom-sheet recipe, and — below `sm` only — render `SheetGrabber` and attach `use-drawer-drag` (driven by the `onOpenChange` of the surrounding Radix root). Desktop presentation must be byte-for-byte unchanged.
- [x] 3.2 Update `AlertDialogContent` (`src/components/layout/alert-dialog/alert-dialog.tsx`) to use the shared bottom-sheet recipe only — no grabber, no drag. Confirm Cancel/overlay/Escape dismissal is untouched.
- [x] 3.3 Confirm the consumers (`features/artifact-management/`'s `UpdateDialog` and `ArtifactCard` delete confirmation) need no markup changes and render correctly through the enhanced components.

## 4. Verify & polish

- [x] 4.1 Run `yarn lint`, `yarn typecheck`, and `yarn test` — all green.
- [x] 4.2 Manually verify on a mobile viewport (emulated + a real iOS Safari session if possible): sheet slides up; grabber drag past threshold closes the Update dialog; short drag snaps back; delete confirm shows no grabber and does not drag-dismiss; desktop is unchanged.
- [x] 4.3 Verify the soft-keyboard case: focus the title input in `UpdateDialog` on mobile — the input stays visible above the keyboard. If occluded, cap sheet height (`max-h-[90dvh]`) and let content scroll (per the design risk).
- [x] 4.4 Verify `prefers-reduced-motion`: with reduce set, the sheet opens/closes/dismisses without a sustained slide.
