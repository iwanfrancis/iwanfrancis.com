## 1. Add shadcn primitives

- [x] 1.1 Add the shadcn `dropdown-menu` and `sheet` components (e.g.
  `npx shadcn@latest add dropdown-menu sheet`), confirming
  `@radix-ui/react-dropdown-menu` and `@radix-ui/react-dialog` land in `package.json`.
  (shadcn v4 emitted the unified `radix-ui` meta-package + `radix-ui` imports; swapped to
  the individual packages to match the repo convention and removed `radix-ui`.)
- [x] 1.2 Move the generated files into role-based folders per the MUI-mirrored
  convention: `src/components/navigation/dropdown-menu/dropdown-menu.tsx` and
  `src/components/navigation/sheet/sheet.tsx` (one folder per component).
- [x] 1.3 Fix the generated imports: rewrite `@/lib/utils` → `@/utils/cn` (and any other
  path the CLI got wrong) so the files resolve; run `yarn lint` to confirm.

## 2. Extend the link model and site config

- [x] 2.1 Add `external?: boolean` to the `NavLink` type in `src/config/site.ts` (mirror
  the existing `SocialLink.external` semantics/comment).
- [x] 2.2 Add the two new links to `siteConfig.nav`: `{ label: 'Thingies', href:
  '/thingies' }` and `{ label: 'Balls', href: 'https://balls.iwans.space', external:
  true }`.

## 3. Build the responsive nav menu

- [x] 3.1 Create `src/components/navigation/header/nav-menu.tsx` (`'use client'`) taking
  `links: NavLink[]`, rendering a burger trigger (ghost icon `Button` with a lucide
  `Menu` icon and an `aria-label`).
- [x] 3.2 Add a shared internal helper that renders one link item from a `NavLink`:
  internal links via `next/link`; external links via the existing `ExternalLink`
  component (`components/navigation/external-link/`) so `target`/`rel`/↗ stay
  consistent. Both surfaces use this helper so labels/order never drift. (Implemented as
  a `renderNavLink` function — not a component — so the bare link sits directly under
  `asChild` for Radix `Slot` prop/ref merging.)
- [x] 3.3 Desktop surface: `DropdownMenu` anchored to the trigger, wrapped in
  `hidden md:block`. Render internal links, then a `DropdownMenuSeparator`, then external
  away-links. `DropdownMenuItem` closes on select automatically.
- [x] 3.4 Mobile surface: `Sheet` (right side) triggered by the burger, wrapped in
  `md:hidden`. Render the same grouped list with a separator, and wrap each link item in
  `SheetClose asChild` so selecting a link both navigates and closes the sheet.

## 4. Wire into the header

- [x] 4.1 Replace the inline `links.map(...)` ghost-button row in
  `src/components/navigation/header/header.tsx` with `<NavMenu links={links} />`, keeping
  the `actions` slot (theme toggle) inline and to the left of the burger.
- [x] 4.2 Confirm both layouts still pass `links={siteConfig.nav}` and render correctly —
  no per-layout edits expected in `(site)/layout.tsx` or `(canvas)/layout.tsx`.

## 5. Verify

- [x] 5.1 `yarn lint` is clean (including the a11y group); the burger trigger has an
  accessible label and the menu is keyboard-operable. (Lint clean on all changed files;
  burger exposes `aria-label="Open navigation menu"` + `haspopup`.)
- [x] 5.2 Manually verify in `yarn dev`: desktop opens the dropdown, mobile (narrow
  viewport) opens the sheet; Home/Experience still smooth-scroll to their sections from
  within the menu and the menu closes; `/thingies` navigates same-tab; Balls opens
  `balls.iwans.space` in a new tab with the ↗ affordance; on-scroll header shadow still
  appears. (Verified via chrome-devtools at 1280px + 390px: dropdown/sheet swap confirmed,
  separator + ↗ present, menu closes on select, canvas-layout header renders, no new
  console errors.)

## 6. Refinements (post-review)

- [x] 6.1 Fix the scrollbar-disappear jump. Radix modals lock scroll via
  react-remove-scroll, which adds a body `margin-right` to offset the hidden scrollbar;
  with `scrollbar-gutter: stable` already reserving that space the margin double-shifts
  the page. Cancel it in `globals.css` via `html body[data-scroll-locked] { margin-right:
  0 !important }` (out-specifies the injected rule; `biome-ignore` matches the repo's
  existing pattern). Verified content-shift delta = 0px on open.
- [x] 6.2 Give menu links a pointer cursor. shadcn's `DropdownItem` hard-codes
  `cursor-default`; add `cursor-pointer` on the dropdown items and in `sheetLinkClass`
  (matches the project's `Button` `hover:cursor-pointer` preference).
- [x] 6.3 Rename the shadcn `dropdown-menu` component to `dropdown`:
  `navigation/dropdown/dropdown.tsx`, exports `DropdownMenu*` → `Dropdown*` (radix CSS-var
  names and `data-slot` values left intact). Update `nav-menu` imports.
- [x] 6.4 Extract `renderNavLink` into a `NavLinkItem` component
  (`navigation/header/nav-link-item.tsx`) that forwards props + ref to the anchor so it
  still works under `asChild`; make `ExternalLink` ref-forwarding (typed as
  `ComponentProps<'a'>`) so the ref threads through. Verified items render as anchors with
  no ref warnings.
