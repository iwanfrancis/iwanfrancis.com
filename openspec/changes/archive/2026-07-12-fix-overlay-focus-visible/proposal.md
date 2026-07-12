## Why

Focus rings are meant to appear for keyboard users only — the app already sets a global
`*:focus-visible` rule for exactly that. But the `Dialog` and `Sheet` close (×) controls
style their ring off plain `:focus` instead of `:focus-visible`, so they light up on pointer
focus too. Because Radix auto-focuses the close control when an overlay opens, the ring
flashes the instant you open a dialog or the mobile nav sheet **with a mouse or tap** — before
you interact with anything. Verified live: the sheet close reports `:focus-visible = false`
(the browser agrees it was a pointer interaction) yet still draws the ring, purely because it
reads the wrong pseudo-class.

## What Changes

- The `Dialog` close (×) control indicates focus via `:focus-visible` instead of `:focus`,
  so it shows a ring for keyboard/programmatic focus but not for pointer focus.
- The `Sheet` close (×) control does the same.
- Keyboard behaviour is unchanged: tabbing to, or keyboard-opening, an overlay still shows
  the close control's ring.
- The dropdown menu items' `focus:bg-accent` highlight is **left as-is** — Radix drives menu
  item focus on pointer-move, so that "focus" state *is* the hover highlight; converting it
  would break menu highlighting.

## Capabilities

### New Capabilities

- `focus-indication`: How the app signals keyboard focus. Interactive controls show a focus
  ring only for `:focus-visible` (keyboard and programmatic focus), never for pointer focus —
  including overlay dismiss controls that Radix auto-focuses on open.

### Modified Capabilities

<!-- None. responsive-overlays keeps its "close control remains where rendered" affordance;
     this change governs how that control indicates focus, which is the new capability's concern. -->

## Impact

- `src/components/layout/dialog/dialog.tsx` — close control: `focus:*` → `focus-visible:*`.
- `src/components/navigation/sheet/sheet.tsx` — close control: `focus:*` → `focus-visible:*`.
- No API, dependency, or behavioural change for keyboard users; no change to desktop dropdown
  menu highlighting.
- Regression test asserting the close controls do not ring on pointer focus but do on
  keyboard focus.
