## Context

`Header` (`src/components/navigation/header/header.tsx`, already a client component)
renders `links` as a flat row of ghost buttons and an `actions` slot after them. Both
the `(site)` and `(canvas)` layouts consume the same `Header` with `siteConfig.nav`, so
one change covers both surfaces. `NavLink` is `{ label, href }`; `SocialLink` already
models externals with an `external?` flag and `SocialLinks` renders them safely — a
pattern to mirror.

Two shadcn primitives are needed and not yet in the repo: `dropdown-menu` and `sheet`.
`@radix-ui/react-dialog` (Sheet's primitive) and `@radix-ui/react-dropdown-menu` are not
installed; `@radix-ui/react-navigation-menu` is installed but unused (not needed here).
`components.json` aliases point at `@/lib/utils`, but the real helper is `@/utils/cn`, so
shadcn-generated files import a path that doesn't exist and must be corrected on the way in.

Fragment-scroll behaviour (`section-navigation`) — window-level smooth scroll, global
`scroll-padding-top`, shared history behaviour — is driven by real anchor links plus
global CSS. It must keep working when those links live inside the menu.

## Goals / Non-Goals

**Goals:**
- Collapse header nav behind one burger control: dropdown on desktop, sheet on mobile.
- Keep the theme toggle inline and always visible.
- Support external away-links (new tab, safe rel, external affordance) alongside internal
  routes and in-page anchors; add Thingies and the Balls game to the nav.
- Preserve fragment navigation, scroll offset, and on-scroll shadow exactly.

**Non-Goals:**
- No context-aware nav (same link set on every page).
- No wiring up the dead `Education` section (out of scope; nav stays Home/Experience/
  Thingies/Balls).
- No changes to `section-navigation` behaviour or the footer.
- No inline desktop links / "+N more" overflow (Option B was considered and rejected).

## Decisions

### Burger everywhere (Option A), not inline-on-desktop
One control, one mental model, and unlimited headroom for future links — matching the
stated goal of "room to grow". Alternative (Option B: inline links on desktop, burger on
mobile) gives better desktop discoverability but caps how many links fit before needing
overflow logic, and renders links twice with divergent markup. Rejected for a personal
site with a deliberately minimal bar. Accepted trade-off: desktop visitors click once to
see nav.

### DropdownMenu (desktop) + Sheet (mobile), both fed one link list
Desktop uses shadcn `DropdownMenu` anchored to the burger; mobile uses shadcn `Sheet`
(right-side panel). Both are Radix-backed (focus trap, keyboard, aria handled for free).
Chose `Sheet` over `Drawer` (vaul bottom-sheet) — a side panel is the conventional
"burger → nav" affordance. A single internal render helper produces the link items for
both surfaces so labels/destinations/ordering never drift.

### Responsive split via Tailwind visibility, not a JS media-query hook
Render both surfaces; show one with `hidden md:block` (dropdown) and the other with
`md:hidden` (sheet). No client-side media-query branching means no hydration mismatch and
no flash. Trade-off: both DOM subtrees exist, which is negligible for a handful of links.
Alternative (a `useMediaQuery` hook picking one) adds hydration risk for no real benefit.

### Two surfaces, two close semantics
`DropdownMenuItem` closes on select automatically. A `Sheet` is a dialog and does **not**
— so each link inside the sheet MUST be wrapped in `SheetClose asChild` (or the open
state controlled and closed on click) so navigation also dismisses the panel. This is the
main correctness subtlety; the spec's "closes the menu and navigates" scenario covers it.

### Extend `NavLink`; reuse the existing safe-external pattern
Add `external?: boolean` to `NavLink`. Internal links (anchors + routes) render via
`next/link`; external away-links reuse the existing `ExternalLink` component
(`components/navigation/external-link/`), which already applies `target="_blank"`,
`rel="noopener noreferrer"`, and the ↗ icon — no duplication of the safe-external rules.
Externals are grouped below a `DropdownMenuSeparator` / a separated block in the sheet.
`siteConfig.nav` gains `{ label: 'Thingies', href: '/thingies' }` and
`{ label: 'Balls', href: 'https://balls.iwans.space', external: true }`.

### Component placement follows the MUI-mirrored role grouping
Per the repo convention ("role grouping mirrors MUI"), MUI files both Menu and Drawer
under *Navigation* — so the dropdown and sheet go in `src/components/navigation/`, each in
its own folder. The header-specific composition (the burger + both surfaces) lives in
`navigation/header/` as a dedicated `NavMenu` component, keeping `Header` a thin layout
shell. Generated files get their `@/lib/utils` import rewritten to `@/utils/cn`. The
shadcn `dropdown-menu` primitive is renamed to `dropdown` (`Dropdown*` exports) to match
the project's preferred naming; Radix's own CSS-var names and `data-slot` values are left
intact.

### Link items are a prop/ref-forwarding component, not a render function
Each nav entry renders through a `NavLinkItem` component that spreads its props and ref
onto the underlying anchor. This is required because the item is the child of Radix
`asChild` (`DropdownItem` / `SheetClose`), which clones it and injects behaviour + ref —
so the anchor must be the slotted element and must accept the injected props/ref. To let
the ref thread through external links, `ExternalLink` is typed as `ComponentProps<'a'>`
(React 19 ref-as-prop) rather than plain `AnchorHTMLAttributes`. A bare render function
was the initial approach but a named component reads better and avoids the
nested-component smell.

### No layout shift when the menu opens
Radix modals lock scroll via `react-remove-scroll`, which adds a body `margin-right` to
offset the scrollbar it hides. The site already sets `scrollbar-gutter: stable` on `html`,
so that space is permanently reserved and the extra margin double-shifts the page. A
`globals.css` rule — `html body[data-scroll-locked] { margin-right: 0 !important }` —
cancels the redundant compensation; the selector out-specifies react-remove-scroll's
runtime-injected `!important` rule, and the `!important` carries a `biome-ignore` matching
the file's existing pattern.

## Risks / Trade-offs

- **Desktop nav hidden behind a click** → Accepted (Option A). Mitigated by a clear,
  accessible burger affordance; nav is one predictable click away.
- **Sheet links don't self-close** → Wrap link items in `SheetClose asChild`; the spec
  scenario "selecting a link closes the menu and navigates" guards it.
- **shadcn CLI emits `@/lib/utils` imports that don't resolve** → Fix the import to
  `@/utils/cn` in every generated file on the way in. Optionally correct `components.json`
  (backlog item) so future `shadcn add` runs are clean — flagged, not required here.
- **Fragment links must stay real anchors** → Render menu items as actual links
  (`next/link` / `<a>`), never buttons with JS handlers, so global smooth-scroll and
  `scroll-padding-top` keep working.
- **A11y regression risk** → Radix handles focus/keyboard/aria; the burger trigger needs
  an explicit `aria-label`. Biome's a11y group stays green.

## Open Questions

- None blocking. Fixing `components.json`'s alias is optional cleanup that can ride along
  or stay in the backlog.
