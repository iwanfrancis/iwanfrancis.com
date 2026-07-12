## Context

The app has two shared modal overlays, both Radix-based and both consumed only on the
auth-gated `/artifacts` admin page:

- `Dialog` (`src/components/layout/dialog/dialog.tsx`, `@radix-ui/react-dialog`) — used by
  `UpdateDialog` (a form: read-only slug, title input, file dropzone, footer).
- `AlertDialog` (`src/components/layout/alert-dialog/alert-dialog.tsx`,
  `@radix-ui/react-alert-dialog`) — used by `ArtifactCard`'s delete confirmation.

Both render as a vertically centred, `max-w-[calc(100%-2rem)]` box. On mobile that box is
narrow and collides with the software keyboard when a field focuses. There is also a
`Sheet` (`src/components/navigation/sheet/sheet.tsx`) — a Radix-Dialog-based side panel with
a `bottom` variant, but no grabber and no drag — used only by the nav menu.

Relevant existing assets: `@use-gesture/react` is already a dependency (used by
`features/thingies` pan/zoom); `src/utils/device.ts` has `isTouchScreen()`; the repo already
reads `prefers-reduced-motion` via `window.matchMedia` in several places; Vitest is set up
(two projects: `*.test.ts` in node, `*.test.tsx` in jsdom).

## Goals / Non-Goals

**Goals:**

- On mobile (below the Tailwind `sm` breakpoint), present `Dialog` and `AlertDialog` as
  bottom-anchored sheets; keep the centred desktop presentation unchanged.
- Give the non-destructive `Dialog` a grabber handle and swipe-down-to-dismiss.
- Keep the destructive `AlertDialog` deliberate: sheet styling, no grabber, no drag-dismiss.
- Add no new runtime dependency; stay on Radix; keep the shared UI layer clean.

**Non-Goals:**

- Adopting Base UI, `vaul`, or any second overlay primitive library (explored and declined).
- A Credenza-style root swap (`Dialog` ⟷ `Drawer` by breakpoint).
- Snap points / partially-open detents — dismiss is binary (open or closed).
- Changing the consumers (`UpdateDialog`, `ArtifactCard`) markup, or touching the nav `Sheet`.
- Retrofitting reduced-motion handling onto the existing desktop zoom animation (out of scope;
  this change only governs the new sheet/drag motion).

## Decisions

### D1: Enhance the existing Radix components — no root swap, no new primitive

Keep the single Radix `Dialog` / `AlertDialog` and change how their `Content` presents. The
mobile drag behaviour is layered on top of the existing Radix content rather than swapping in
a different component tree.

- **Why:** The two surfaces are tiny and live on one page. A root swap (Credenza) means two
  parallel component trees kept in sync; a second primitive library (Base UI / `vaul`) means
  running two focus-trap/portal/a11y systems side by side. Both are disproportionate here.
- **Alternatives considered:** (a) `vaul` — purpose-built drag/snap, but a new dep and a root
  swap; (b) Base UI `Drawer` — native swipe, but a second primitive library (Base UI is a
  different lineage from the Radix primitives this app is built on), a mixed-library state, and
  a global `body { position: relative }` requirement; (c) CSS-only bottom sheet with no drag —
  rejected because the chosen UX is a true drag-to-dismiss drawer.

### D2: One shared bottom-sheet class recipe, consumed by both overlays

Extract the "centred at `sm+` / bottom sheet below `sm`" Tailwind classes into a single shared
recipe in `src/components/layout/` (a plain exported class string or a small `cva`), imported
by both `DialogContent` and `AlertDialogContent` so the two presentations cannot drift.

- **Why:** Both overlays need identical sheet geometry; duplicating the class list guarantees
  eventual divergence. A shared const/`cva` is the smallest DRY unit.
- **Note:** Both consumers are in the shared `components/layout` layer; a shared const imported
  across sibling component folders keeps the unidirectional import rule intact (shared → shared
  is fine; no feature/app imports).

### D3: Split the drag into a pure decision + a thin gesture binding

`shouldDismiss({ distance, height, velocity })` is a pure function (no DOM) returning whether a
release should dismiss. A `use-drawer-drag` hook binds `@use-gesture`'s `useDrag` to the grabber,
tracks the live `translateY`, and calls `shouldDismiss` on release.

- **Dismissal rule:** dismiss when `distance > height * FRACTION` (≈ 0.35) **or**
  `velocity > VELOCITY_THRESHOLD` (≈ 0.5 px/ms); otherwise snap back. Constants are tunable and
  colocated.
- **Why:** The physics can't be meaningfully unit-tested in jsdom (no layout, no real gestures),
  but the *decision* is the part with edge cases. Extracting it as a pure function makes it
  unit-testable in the `node` project and matches the repo's "extract the logic" ethos. This is
  the one requirement (`Dismissal decision combines distance and velocity`) that maps directly to
  tests.

### D4: Drive the dismiss animation ourselves ("animate-out-then-close")

During a drag: `transition: none` and inline `transform: translateY(max(0, dy))` (with light
rubber-band resistance for `dy < 0`). On release:

- **Snap back:** re-enable the transition and animate `translateY → 0`, then clear the inline
  style and hand control back to Radix.
- **Dismiss:** animate our own `translateY → 100%` (off-screen), wait for `transitionend`, then
  call `onOpenChange(false)`. Because the content is already off-screen, Radix's own exit
  keyframe is invisible — so there is no jump between our inline transform and Radix's animation.

- **Why:** This is the crux of hand-rolling. Handing off to Radix's `data-[state=closed]`
  slide-out mid-drag would snap the transform from its dragged position back to `0` before
  animating. Driving the exit ourselves avoids reconciling two animation systems.
- **Alternative considered:** `forceMount` + fully custom open/close animation, bypassing Radix's
  data-state animations. More control but more code; unnecessary once animate-out-then-close works.

### D5: Gate drag/grabber on viewport width, aligned to the CSS breakpoint

Activate drag (and render the grabber) only below `sm`, using a `useIsMobile()` hook backed by
`window.matchMedia('(max-width: 639px)')` — the same axis as the Tailwind `sm` breakpoint, so the
drag behaviour and the sheet styling switch together. A narrow desktop window (< `sm`) therefore
also gets the sheet, which is correct and consistent.

- **Why width, not `(pointer: coarse)`:** the *layout* switches on width; keying the behaviour to
  the same axis keeps styling and interaction in agreement. `isTouchScreen()` would desync them
  (e.g. a touch laptop above `sm`).
- **Hydration:** a non-issue. Overlay content is portalled and only mounts on open — always after
  hydration — so the media query has resolved by the time any grabber/drag code renders. The only
  element in the DOM at load is the trigger button, identical in all branches. `useIsMobile`
  initialises `false` and reads `matchMedia` in an effect; worst case is a re-render before first
  open, never a hydration mismatch.

### D6: File layout (bulletproof-react)

- `src/components/layout/` — shared bottom-sheet recipe (e.g. `bottom-sheet.ts`) and a
  `SheetGrabber` component.
- Colocated with the dialog: `use-drawer-drag.ts` (the hook) and `should-dismiss.ts` +
  `should-dismiss.test.ts` (the pure function and its unit tests, `*.test.ts` → node project).
- `DialogContent` gains the shared recipe + grabber + drag layer (mobile-gated); the consumers
  (`UpdateDialog`, `ArtifactCard`) are untouched.
- `useIsMobile` — a shared hook in `src/hooks/` (viewport media query, broadly reusable).

## Risks / Trade-offs

- **Soft keyboard vs bottom-anchored sheet (iOS Safari).** The Update form has a title input;
  a bottom sheet can be occluded or shifted by the keyboard / `visualViewport`. → Verify on a
  real iOS Safari session (or emulation); if needed, cap sheet height (e.g. `max-h-[90dvh]`,
  `dvh` units) and let the content scroll rather than the input hiding behind the keyboard.

- **Drag vs internal scroll.** If sheet content scrolls, a body-level drag would fight the scroll.
  → Mitigated by D3: drag originates from the grabber only; `touch-action: none` on the grabber,
  not the sheet body.

- **Owning the animation reconciliation (D4).** The transform/exit hand-off is the fiddliest part
  and the most likely source of a visual glitch. → Contained to `use-drawer-drag`; if it proves
  troublesome, the escape hatch is `vaul` (documented here so the trade-off is revisitable), but
  we try hand-rolled first.

- **Reduced-motion coverage.** New sheet/drag motion must honour `prefers-reduced-motion`; the
  pre-existing desktop zoom animation does not (and stays out of scope), so the two are briefly
  inconsistent. → Acceptable; scoped deliberately in Non-Goals.

- **No automated coverage of the gesture.** Only `shouldDismiss` is unit-tested; the drag itself
  is verified manually. → Accepted per the project testing rules (no testing of visuals/gestures);
  the risky logic is the extracted pure function, which is covered.
