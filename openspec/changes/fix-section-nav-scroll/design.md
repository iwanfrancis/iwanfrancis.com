## Context

The landing page wraps all content in `MatrixBackground`
(`src/components/layout/matrix-background/matrix-background.tsx`), which is
`position: relative` + `overflow: hidden` and renders a `position: absolute`
cosmetic overlay sized `1000vw × 1000vh` at `top: -500vh; left: -500vw`. The
overlay follows the cursor (a radial "spotlight" mask) and is `pointer-events:
none`.

Browser reproduction (chrome-devtools, viewport 500×844) confirmed the failure
mechanism:

- The overlay pokes ~2100px past the wrapper's bottom edge. Combined with
  `overflow: hidden`, this makes `MatrixBackground` a scroll container:
  `scrollHeight` 4220 vs `clientHeight` 2112.
- Clicking `/#experience` left the window at `scrollTop 0` but set the wrapper's
  `scrollTop` to 844 — the browser scrolled the nearest scroll container (the
  hidden wrapper), not the window.
- In that state the Hero sat at `top: -844` (above the viewport). `window.scrollTo({top:0})`
  and wheel-up did nothing, because the wheel/scrollbar drive the window (pinned at
  0), not the hidden wrapper. Only resetting `wrapper.scrollTop = 0` (which a user
  cannot do) restored the Hero. This is the "can't scroll back up" bug.
- The wrapper's `scroll-behavior` is `auto`, so its scroll is an instant jump; the
  `scroll-smooth` on `<html>` never applies because `<html>` is not the element
  being scrolled. This is the "not smooth" bug.

The fix was verified live: setting the wrapper to `overflow: clip` made the same
click animate the **window** (`scrollTop` 0 → 66 → 734 → 844) while the wrapper
stayed at 0, and wheel/scrollbar worked normally.

## Goals / Non-Goals

**Goals:**

- In-page fragment links (header `Home`/`Experience`, hero `See my work`) scroll the
  window smoothly and never leave the page stuck.
- Sections land clear of the fixed header via a single global rule.
- The header nav links behave consistently with each other.

**Non-Goals:**

- Redesigning the matrix/spotlight effect or the header.
- Adding a scroll library, a custom JS scroll handler, or an IntersectionObserver
  scroll-spy.
- Changing the `mt-16` visual gap between Hero and Experience (separate from the
  anchor offset; out of scope).

## Decisions

### Decision: Use `overflow: clip` instead of `overflow: hidden` on `MatrixBackground`

`overflow: clip` clips overflow visually exactly like `hidden`, but the box is **not**
a scroll container — it has no scroll offset for the browser to hijack. Fragment
navigation therefore falls through to the window, which is smooth-scrollable (via the
existing `scroll-smooth`) and wheel/scrollbar controllable.

In Tailwind this is the `overflow-clip` utility, swapped for `overflow-hidden` on the
wrapper element (currently around line 39).

**Alternatives considered:**

- *Make the overlay `position: fixed`.* Also removes the trap (fixed elements don't
  contribute to an ancestor's scrollable overflow) and would let us drop the `1000vh`
  trick, but it is a larger change to the effect's JS (cursor maths would move from
  document space to viewport space) for no extra user-facing benefit. Rejected as
  over-scoped.
- *Remove `overflow: hidden` entirely.* Not viable — the `1000vw/1000vh` overlay would
  then create enormous page overflow and scrollbars. The clip is required; only its
  flavour changes.
- *Keep `overflow: hidden`, add a JS scroll handler that scrolls the window.* Adds
  complexity and fights the browser instead of removing the root cause. Rejected.

Browser support for `overflow: clip` is broad (all current evergreen browsers); this
site targets modern browsers only.

### Decision: One global `scroll-padding-top` on `<html>`, drop per-section `scroll-mt`

Add `scroll-padding-top` to the root scroll element (`<html>`) sized to roughly the
fixed header height, so every fragment target lands clear of the header uniformly.
Then remove the per-section `scroll-mt-16 md:scroll-mt-24` on the Experience section,
which would otherwise stack with the global padding and double the gap.

`scroll-padding` is the property designed for exactly this (offsetting the scrollport
for a fixed header), so it belongs on the scroll container once, not duplicated on
each target. Match the existing responsive sizing (≈`16`/`24` → `4rem`/`6rem`).

**Alternative considered:** keep `scroll-mt` on each section. Works, but it must be
remembered for every future anchored section and is easy to forget (the Hero currently
lacks it). The global rule is the lower-maintenance choice.

### Decision: Make header nav links consistently non-`replace`

The header `Home` link uses no `replace`; `Experience` uses `replace`. Standardise on
the same behaviour for both. Default to **no `replace`** so each section visit is a
normal history entry and the browser Back button returns to the prior position — the
conventional behaviour for in-page anchors.

## Risks / Trade-offs

- **`overflow: clip` clips slightly differently from `hidden` (no scroll positioning,
  and it also clips in the block-overflow direction by default).** → The overlay is a
  `pointer-events: none` cosmetic mask that is never scrolled, so clip's semantics are
  equivalent for this use. Verified visually in-browser.
- **`scroll-padding-top` value can drift from the actual header height** if the header
  size changes later. → Use the existing header-height-derived sizing already encoded
  in the `scroll-mt` values; a few px of slack is harmless (space above the heading is
  the desired outcome, not pixel-exact alignment).
- **No automated tests** to guard against regression. → Verify manually in-browser
  (chrome-devtools) per the tasks; the reproduction script (click link, assert window
  `scrollTop` moves and wrapper `scrollTop` stays 0) is the check.

## Migration Plan

Pure front-end CSS/markup change, no data or API impact. Ship together; roll back by
reverting the commit. No migration steps.
