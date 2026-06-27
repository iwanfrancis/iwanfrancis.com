## 1. Single source of truth

- [x] 1.1 Create `src/config/site.ts` exporting `siteConfig` with `nav: NavLink[]` and `socials: SocialLink[]`, plus exported `NavLink` and `SocialLink` types (label, href, icon, optional `external`). Fold the current `EMAIL` into the `mailto:` social entry.
- [x] 1.2 Populate `nav` (`Home` → `/#hero`, `Experience` → `/#experience`) and `socials` (GitHub, LinkedIn, Email) from the values currently hard-coded in the header, footer, and hero.

## 2. Shared SocialLinks component

- [x] 2.1 Create `src/components/navigation/social-links/social-links.tsx` rendering a `SocialLink[]` as ghost icon-button anchors; accept a `className` for caller spacing.
- [x] 2.2 Apply `target="_blank" rel="noopener noreferrer"` only to `external` links; keep each link's `aria-label` from its `label`.

## 3. Make the chrome presentational

- [x] 3.1 Refactor `Header` to accept `{ logo?: ReactNode; links?: NavLink[]; actions?: ReactNode }`; render the home `Link` around the `logo` slot and map `links` to the nav buttons. Remove the hard-coded links and the internal `Logo` import.
- [x] 3.2 Refactor `Footer` to accept `{ socials?: SocialLink[]; actions?: ReactNode }`; render `<SocialLinks links={socials} />`, then `actions`, then `ScrollToTopButton`. Remove the hard-coded links, the `EMAIL` import, and the stray empty `<div />`.

## 4. Wire config at the app level

- [x] 4.1 In `app/(site)/layout.tsx`, import `siteConfig` and `Logo`; pass `logo={<Logo />}`, `links={siteConfig.nav}` to `Header` and `socials={siteConfig.socials}` to `Footer` (keep the existing `actions` toggle on both).
- [x] 4.2 In `app/(canvas)/layout.tsx`, pass `logo={<Logo />}` and `links={siteConfig.nav}` to `Header`.

## 5. Dedupe the hero

- [x] 5.1 Replace the hero's hard-coded social cluster with `<SocialLinks links={siteConfig.socials} />`, preserving its current gap/padding via `className`. Remove the now-unused `Github`/`Linkedin`/`Mail`/`EMAIL` imports.
- [x] 5.2 Remove `EMAIL` from `config/constants.ts` once no file imports it (confirm with a repo search).

## 6. Verify

- [x] 6.1 Run `yarn lint` and fix any issues.
- [x] 6.2 Run `yarn dev` and confirm: header logo/nav/shadow and fragment navigation work; footer socials, theme toggle, and scroll-to-top work; hero links unchanged; light/dark unaffected.
