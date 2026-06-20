## 1. Gather Valve Space content (blocks section 2)

- [x] 1.1 Title: **Senior Software Engineer**; dates: **November 2025 — Present**. Summary, highlight bullets and skills: **left blank for Iwan to fill in**.
- [x] 1.2 Confirm the Valve Space website URL (assumed `https://valvespace.com`)
- [x] 1.3 Logo added: `public/logos/valve-space.png` (transparent background; using the PNG rather than a vector for now)

## 2. Add the Valve Space entry

- [x] 2.1 Add `VALVE_SPACE` to `ADDRESSES` in `src/config/constants.ts`
- [x] 2.2 In `experience.tsx`, add a `Company` for Valve Space as the first entry: `subTitle="Senior Software Engineer, November 2025 — Present"`, `logoSrc="/logos/valve-space.png"`, `website={ADDRESSES.VALVE_SPACE}`. Leave `summary`, `skills` and collapsible `children` blank for Iwan.
- [x] 2.3 Add `className="mt-4"` to the Apadmi `Company` so spacing between entries stays consistent now that it is no longer first
- [x] 2.4 Confirm reverse-chronological order: Valve Space → Apadmi → Red Hat → IBM

## 3. Fix the top-hug spacing

- [x] 3.1 Add `scroll-mt-*` (e.g. `scroll-mt-16 md:scroll-mt-24`) to the `#experience` section so the "See my work" jump lands with space above the heading
- [x] 3.2 Increase the section's top spacing (bump the current `mt-8` / add `pt-*`) so scrolling past the Hero leaves breathing room above the heading
- [x] 3.3 Check the spacing is balanced and responsive at mobile and desktop widths

## 4. Verify

- [x] 4.1 Run `yarn lint` (jsx-a11y must stay clean)
- [x] 4.2 Run `yarn dev` and visually check: Valve Space renders first, logo loads, "see more"/"see less" toggle works, and the anchor jump + scroll-past both clear the top edge
- [x] 4.3 Confirm no fabricated facts remain — every Valve Space value is Iwan-supplied
