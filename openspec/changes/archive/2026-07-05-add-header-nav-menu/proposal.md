## Why

The header renders its nav links as a flat, always-visible row of ghost buttons. That
works for two anchor links but doesn't scale: there's no room to grow, and every new
destination crowds the bar. We want to add a route link to `/thingies` and an external
away-link to the game at `balls.iwans.space`, with headroom for more later — without the
header getting busy or breaking on small screens.

## What Changes

- Header nav links collapse behind a single burger control instead of rendering inline.
  Activating it opens a **shadcn `DropdownMenu` on desktop** and a **shadcn `Sheet`
  (right-side panel) on mobile**, both fed the same link list.
- The theme toggle stays inline and always visible — it's a control, not navigation.
  Header layout becomes `[logo] … [theme toggle] [burger]`.
- `NavLink` gains an optional `external?` flag. External away-links open in a new tab
  with `rel="noopener noreferrer"` and an external-link affordance (↗); internal routes
  and in-page anchors keep current behaviour. External links are grouped below a
  separator in the menu.
- `siteConfig.nav` gains **Thingies** (`/thingies`, internal route) and **Balls**
  (`balls.iwans.space`, external). Existing anchor links (Home, Experience) still drive
  fragment navigation — now from within the menu.
- Add shadcn `dropdown-menu` and `sheet` components into the repo's role-based folders,
  fixing the generated `@/lib/utils` import to the project's actual `@/utils/cn`.

## Capabilities

### New Capabilities

<!-- None. The header nav lives in the existing site-chrome capability. -->

### Modified Capabilities

- `site-chrome`: the "chrome layout and behaviour are preserved" requirement changes —
  the header no longer shows nav links inline; it collapses them into a responsive menu
  control (dropdown on desktop, sheet on mobile). Adds a requirement that nav links may
  be external away-links that open safely in a new tab, while in-page fragment links
  continue to navigate and the menu closes on selection.

## Impact

- **Code**: `src/components/navigation/header/header.tsx` (menu control replaces inline
  link row), `src/config/site.ts` (`NavLink` type + new links). New shared UI:
  `dropdown-menu` and `sheet` under `src/components/` (role-based placement).
- **Dependencies**: adds `@radix-ui/react-dropdown-menu` and `@radix-ui/react-dialog`
  (Sheet's primitive). `@radix-ui/react-navigation-menu` is already installed but unused
  — not needed here.
- **Layouts**: both `(site)` and `(canvas)` layouts consume the same `Header`, so the
  change lands in both with no per-layout edits.
- **Behaviour preserved**: fragment scroll, scroll-padding offset, and on-scroll header
  shadow (`section-navigation` + existing chrome behaviour) are unchanged — links simply
  live inside the menu now.
- **Tooling note**: `components.json` aliases (`@/lib/utils`) don't match the layout
  (`@/utils/cn`), so shadcn-generated files need their import corrected on the way in.
