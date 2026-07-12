## Why

On mobile, the app's modal overlays (`Dialog`, `AlertDialog`) render as a vertically
centred box. The centred box is narrow and, when a field inside it focuses, collides
with the software keyboard — the Update-artifact form (two inputs + a dropzone) feels
cramped. Bottom-anchored sheets are the platform-native pattern for mobile modals: wider,
taller, and naturally seated above the keyboard.

## What Changes

- Below the Tailwind `sm` breakpoint, `DialogContent` and `AlertDialogContent` present as
  **bottom-anchored sheets** (full-width, rounded top, slide up from the bottom) instead of
  a centred box. At `sm` and above, the existing centred-dialog behaviour is unchanged.
- The **non-destructive `Dialog`** (Update-artifact form) additionally gets a **grabber
  handle** and **swipe-down-to-dismiss** on mobile, built on the `@use-gesture/react`
  library already in the dependency tree — no new dependency.
- The **destructive `AlertDialog`** (delete confirmation) gets the bottom-sheet styling
  **only** — no grabber, no swipe-to-dismiss — so a destructive choice stays deliberate
  (dismiss via Cancel/overlay/Escape as today).
- The mobile presentation is delivered by **enhancing the existing Radix components**
  (shared bottom-sheet class recipe + a mobile-only drag layer on the Dialog) — **not** by
  swapping in a second primitive library or a Credenza-style component swap.

## Capabilities

### New Capabilities
- `responsive-overlays`: How the app's shared modal overlays present across viewports —
  centred dialog on desktop, bottom-anchored sheet on mobile; drag-to-dismiss for
  non-destructive dialogs only; the shared bottom-sheet recipe and its accessibility and
  motion rules.

### Modified Capabilities
<!-- None. The two consumers (artifact-management's Update form and delete confirm) keep
     their existing markup and behaviour unchanged; only the shared overlay presentation
     changes, so no existing spec's requirements are altered. -->

## Impact

- **Shared UI layer** (`src/components/layout/`): `dialog/`, `alert-dialog/` — a new shared
  bottom-sheet class recipe and a `SheetGrabber` component, a mobile-only drag hook
  (`use-drawer-drag`) plus a pure `shouldDismiss` decision function, and responsive classes
  on `DialogContent` / `AlertDialogContent`.
- **Consumers unchanged**: `features/artifact-management/`'s `UpdateDialog` and
  `ArtifactCard` delete confirmation keep their current markup — the change is behind the
  shared components. Affects one auth-gated page (`/artifacts`).
- **Dependencies**: none added. Reuses `@use-gesture/react` (already used by `thingies`).
- **Testing**: the pure `shouldDismiss` decision function is unit-tested (`node`); drag
  physics and responsive visuals are not (per the project testing rules).
- **Risks to verify**: soft-keyboard behaviour with a bottom-anchored sheet on iOS Safari
  (`visualViewport`); release/dismiss animations must honour `prefers-reduced-motion`.
