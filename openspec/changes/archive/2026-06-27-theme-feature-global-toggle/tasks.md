## 1. Scaffold the theme feature

- [x] 1.1 Create `src/features/theme/components/` and `src/features/theme/hooks/`
- [x] 1.2 Move `src/hooks/use-theme-toggle/use-theme-toggle.ts` to `src/features/theme/hooks/use-theme-toggle.ts`; keep its `next-themes` + `flushSync` logic unchanged
- [x] 1.3 Move `src/components/navigation/footer/theme-toggle-button.tsx` to `src/features/theme/components/theme-toggle-button.tsx`; update its hook import to the new path (relative within the feature)
- [x] 1.4 Add `src/features/theme/components/theme-provider.tsx` — a thin wrapper around `next-themes`' `ThemeProvider` with the existing props (`attribute="class"`, `defaultTheme="system"`, `enableSystem`, `disableTransitionOnChange`)

## 2. Wire the provider at the app layer

- [x] 2.1 Update `src/app/provider.tsx` to import `ThemeProvider` from `@/features/theme/components/theme-provider` instead of `next-themes` directly; confirm no-flash and persistence behaviour is unchanged

## 3. Give header and footer a generic actions slot

- [x] 3.1 Add an optional `actions?: ReactNode` prop to `src/components/navigation/header/header.tsx`; render it inside the existing right-hand `flex items-center gap-2` group, after the nav links
- [x] 3.2 Add an optional `actions?: ReactNode` prop to `src/components/navigation/footer/footer.tsx`; render it in the button group where `ThemeToggleButton` currently sits, and remove the direct `ThemeToggleButton` import from the footer

## 4. Inject the toggle into both layouts

- [x] 4.1 In `src/app/(site)/layout.tsx`, pass `actions={<ThemeToggleButton />}` to both `<Header />` and `<Footer />` (import from `@/features/theme/components/theme-toggle-button`)
- [x] 4.2 In `src/app/(canvas)/layout.tsx`, pass `actions={<ThemeToggleButton />}` to `<Header />`

## 5. Clean up and verify

- [x] 5.1 Delete the now-empty `src/hooks/use-theme-toggle/` directory; grep for stale references to `navigation/footer/theme-toggle-button` and `hooks/use-theme-toggle` and fix any
- [x] 5.2 Run `yarn lint` (Biome) and resolve any issues, including import ordering
- [ ] 5.3 Stop `yarn dev` first, then run `yarn build` to confirm a clean production build
  - _Deferred: `next dev` is running (this project on :3001; the work app holds :3000). Build skipped to avoid the known `.next` corruption. Run once dev is stopped._
- [ ] 5.4 Manual check: toggle works on `/` (header + footer) and on `/thingies` (header only); circular-reveal animation fires from each button's position; chosen theme persists across reload; no flash of wrong theme on load
  - _Wiring verified against the live dev server (:3001): `/` renders 2 toggles (header + footer), `/thingies` renders 1 (header), both HTTP 200. Animation / persistence / no-flash still need a human eyeball in the browser._
