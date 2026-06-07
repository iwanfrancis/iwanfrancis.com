## Context

The Experience section (`src/features/landing/experience/components/experience.tsx`)
renders a stack of `Company` entries: Apadmi, Red Hat, IBM. Each `Company` takes
`logoSrc`, `subTitle`, `summary`, `skills` and collapsible `children`. The first
entry has no top margin; later entries add `className="mt-4"`.

The section sits directly after the Hero, which is `min-h-dvh`. The "See my work"
button links to `#experience`. Two problems:

1. The CV stops at Apadmi (to April 2025) and omits the current Valve Space role.
2. Content hugs the top: scrolling past the Hero — or jumping via `#experience` —
   lands the heading ~2.5rem from the top edge (section `p-2/p-4` + heading `mt-8`),
   which reads as cramped. Margin alone won't fix the anchor jump; the browser
   aligns the section's border box to the viewport top, ignoring outer margin.

## Goals / Non-Goals

**Goals:**

- Add a Valve Space entry as the first/most-recent role, using the existing
  `Company` component — no new component.
- Give the Experience section visible top breathing room for both the scroll-past
  and the `#experience` anchor-jump cases.

**Non-Goals:**

- No redesign of the `Company` component or its layout.
- Not touching the unrelated backlog items (dead `Education` import, `seperator`
  folder typo, `components.json` aliases) — keep this change focused.
- Not writing Iwan's Valve Space copy on his behalf (see Open Questions).

## Decisions

**1. Add Valve Space via a new `Company` entry, placed first.**
Reuse the existing pattern. Valve Space (current role) takes the top slot with no
top margin; Apadmi gains `className="mt-4"` to match the others. Add
`VALVE_SPACE: 'https://valvespace.com'` to `ADDRESSES` in `src/config/constants.ts`
and reference it as `website`, consistent with the other entries.
_Alternative considered:_ a bespoke "current role" component — rejected as
overkill; the `Company` props already cover title, dates, summary, skills and
collapsible detail.

**2. Fix the hug with `scroll-margin-top` on the anchor target plus a top spacing bump.**
Add `scroll-mt-*` (e.g. `scroll-mt-16 md:scroll-mt-24`) to the `#experience`
section so the anchor jump lands with space above the heading, and increase the
section's top spacing (e.g. bump `mt-8` → a larger top margin / `pt-*`) for the
scroll-past case. Keep it responsive and in Tailwind utilities, matching the
existing style.
_Alternative considered:_ margin-only — rejected because outer margin is ignored
by anchor scrolling, so the jump would still hug the top.

**3. Valve Space logo asset.**
`Company` requires a `logoSrc`; the others live in `public/logos/*.svg`. Valve
Space needs an equivalent asset (e.g. `public/logos/valve-space.svg`). If no logo
is available at apply time, fall back to a temporary placeholder and flag it,
rather than shipping a broken `next/image` src.

## Risks / Trade-offs

- **Fabricated CV copy** → Treat all Valve Space prose/dates as Iwan-supplied;
  scaffold with explicit placeholders, never invented facts (org rule: no
  fabrication). Implementation is blocked on real copy.
- **Missing logo breaks `next/image`** → Confirm the asset exists before wiring
  `logoSrc`; use a placeholder if not.
- **`scroll-mt` value vs. future sticky header** → There is no fixed header today,
  so a moderate value is safe; revisit if a sticky nav is added.

## Open Questions

- Valve Space copy: job title, start date, "Present" wording, one-line summary,
  highlight bullets, and skills/tech badges — to be supplied by Iwan.
- Is there a Valve Space logo (SVG preferred) to add under `public/logos/`?
