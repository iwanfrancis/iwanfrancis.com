## 1. Core fix — stop the wrapper hijacking scroll

- [x] 1.1 In `src/components/layout/matrix-background/matrix-background.tsx`, change
  the wrapper's `overflow-hidden` to `overflow-clip`.
- [x] 1.2 Verify in-browser: load the page, click the header `Experience` link, and
  confirm `document.scrollingElement.scrollTop` moves while the `.bg-matrix`
  wrapper's `scrollTop` stays `0`; confirm the scroll animates smoothly.
- [x] 1.3 Verify the spotlight/matrix overlay still renders and tracks the cursor
  correctly (no visual regression from the clip change).

## 2. Header clearance — global scroll offset

- [x] 2.1 In `src/globals.css`, add `scroll-padding-top` on `html` sized to the fixed
  header height (match the existing responsive `scroll-mt` values, ≈`4rem` / `6rem`).
- [x] 2.2 In `src/features/landing/experience/components/experience.tsx`, remove the
  now-redundant `scroll-mt-16 md:scroll-mt-24` classes.
- [x] 2.3 Verify in-browser: clicking `Experience` (header) and `See my work` (hero)
  both land with space above the "Experience" heading, not under the header, at both
  mobile and desktop widths.

## 3. Consistent header nav links

- [x] 3.1 In `src/components/navigation/header/header.tsx`, make the `Home` and
  `Experience` links use the same history behaviour (remove `replace` from
  `Experience` so both are normal history entries).
- [x] 3.2 Verify in-browser: after clicking `Experience` then `Home`, the browser Back
  button returns to the prior section/scroll position.

## 4. Regression sweep

- [x] 4.1 Verify scrolling back up to the Hero works via wheel and scrollbar after any
  fragment navigation, and that the page is never stuck.
- [x] 4.2 Run `yarn lint` and confirm no new Biome issues.
