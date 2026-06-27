## Why

Last session the `Header` and `Footer` gained an `actions` slot, but they still
hard-code Iwan-specific content: the footer bakes in GitHub/LinkedIn/email links,
the header bakes in its nav links and logo, and the same three social links are
copy-pasted a third time in the landing `Hero`. These components live in the shared
`components/navigation/` layer but aren't actually reusable, and the duplicated link
data has three places to drift out of sync. This finishes the job: make the chrome
presentational and drive its content from one source.

## What Changes

- Add a single `siteConfig` (`config/site.ts`) holding the site's nav links and
  social links (label, href, icon) — one source of truth.
- Make `Header` presentational: accept `links` and a `logo` slot as props instead of
  hard-coding the nav links and importing the branded `Logo`. Keep the existing
  `actions` slot.
- Make `Footer` presentational: accept `socials` as a prop instead of hard-coding the
  three links and importing `EMAIL`. Keep the `actions` slot and the always-present
  scroll-to-top button. Remove the stray empty `<div />` spacer.
- Extract the repeated icon-link cluster into a shared `SocialLinks` component, and
  have both `Footer` and the landing `Hero` consume it from `siteConfig` — removing
  the third hard-coded copy.
- Wire the config into the chrome at the `app/` layout level (`(site)` and
  `(canvas)`), keeping the unidirectional import flow (config + components → app).

## Capabilities

### New Capabilities
- `site-chrome`: the shared header and footer shell components — what content they
  render, how site-specific links/branding are supplied to them, and the rule that
  they stay free of site-specific data.

### Modified Capabilities
<!-- None. Nav links still scroll (section-navigation) and the hero still shows the
     same social links (landing-experience); only where the data lives changes, which
     is an implementation detail, not a spec-level behaviour change. -->

## Impact

- **Code**: `components/navigation/header/header.tsx`,
  `components/navigation/footer/footer.tsx`, new
  `components/navigation/social-links/social-links.tsx`, new `config/site.ts`,
  `features/landing/hero/components/hero.tsx`, `app/(site)/layout.tsx`,
  `app/(canvas)/layout.tsx`. `config/constants.ts` `EMAIL` folds into `siteConfig`.
- **Behaviour**: none visible to visitors — same links, same layout, same nav.
- **Dependencies / APIs**: none.
