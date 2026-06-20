## Why

Clicking the header's section links (`/#hero`, `/#experience`) — and the hero's
"See my work" link — scrolls badly: the jump is instant rather than smooth, and
it intermittently leaves the page stuck so the visitor cannot scroll back up to
the Hero.

Root cause, confirmed by live browser reproduction: the `MatrixBackground`
wrapper is `position: relative` + `overflow: hidden` and contains a
`position: absolute` cosmetic overlay that is `1000vh` tall (`top: -500vh`). That
combination turns `MatrixBackground` into a scrollbar-less scroll container with
~2100px of hidden scroll range. The browser's fragment-scroll then scrolls *that
hidden container* instead of the window — so the window's scrollbar and the mouse
wheel (which drive the window) can no longer reach the content the container has
scrolled out of view.

## What Changes

- Change `MatrixBackground`'s `overflow-hidden` to `overflow-clip`. `overflow: clip`
  clips the overlay identically but is **not** a scroll container, so fragment
  navigation falls through to the window — which is both smooth-scrollable (via the
  existing `scroll-smooth` on `<html>`) and wheel/scrollbar controllable. This fixes
  both the "not smooth" and "can't scroll back up" symptoms for every in-page
  fragment link (header `Home`, header `Experience`, hero `See my work`).
- Add `scroll-padding-top` on `<html>` (≈ header height) so anchored sections land
  clear of the fixed header consistently, and remove the now-redundant per-section
  `scroll-mt-16 md:scroll-mt-24` on the Experience section.
- Make the two header nav links consistent: `Home` uses no `replace` prop while
  `Experience` uses `replace`. Pick one behaviour for both.

## Capabilities

### New Capabilities

- `section-navigation`: In-page navigation to landing sections via fragment links
  (`#hero`, `#experience`). Defines that activating such a link scrolls the window
  (not a nested scroll container) to the target, smoothly, leaving the section clear
  of the fixed header, and that normal scrolling (wheel/scrollbar) remains usable
  afterwards.

### Modified Capabilities

- `landing-experience`: The requirement "The experience anchor jump lands with
  space above the heading" currently mandates that space be provided "via
  `scroll-margin-top` on the anchor target". The header-clearance offset is moving
  to a single global `scroll-padding-top` on `<html>` (owned by `section-navigation`),
  so this requirement is restated to describe the outcome without prescribing the
  per-target mechanism.

## Impact

- `src/components/layout/matrix-background/matrix-background.tsx` — `overflow-hidden`
  → `overflow-clip`.
- `src/globals.css` — add `scroll-padding-top` on `html`.
- `src/features/landing/experience/components/experience.tsx` — remove redundant
  `scroll-mt-16 md:scroll-mt-24`.
- `src/components/navigation/header/header.tsx` — consistent `replace` behaviour
  across the nav links.
- No dependencies added. No test suite exists; verification is manual in-browser
  (already done via chrome-devtools during exploration).
