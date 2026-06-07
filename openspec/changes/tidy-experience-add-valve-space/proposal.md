## Why

The CV is out of date: it ends at Apadmi (to April 2025) and omits the current
role at Valve Space. The Experience section also reads tight at the top — the
Hero fills the viewport (`min-h-dvh`), so when a visitor scrolls down or follows
the "See my work" anchor, the "Experience" heading lands flush against the top
edge with no breathing room.

## What Changes

- Add a new **Valve Space** entry as the first (most recent) `Company` in the
  Experience section, ahead of Apadmi. Copy (title, dates, summary, highlights,
  skills) to be supplied by Iwan — scaffolded with placeholders, not invented.
- Add top breathing room to the Experience section so its content no longer hugs
  the top of the viewport.
- Give the `#experience` anchor target `scroll-margin-top` so the "See my work"
  jump lands with space above the heading rather than flush to the top.

## Capabilities

### New Capabilities

- `landing-experience`: the Experience section of the landing page — the ordered
  list of roles shown, and the spacing/anchor behaviour of the section.

### Modified Capabilities

<!-- None — there is no existing spec for the landing page yet. -->

## Impact

- `src/features/landing/experience/components/experience.tsx` — new Valve Space
  `Company` entry; section/heading spacing.
- `src/config/constants.ts` — add `VALVE_SPACE` to `ADDRESSES`.
- `src/app/page.tsx` — only if `scroll-mt` is better applied at the page level.
- No new dependencies. No breaking changes. Content placeholders must be filled
  before this ships.
