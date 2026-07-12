## Why

The `/artifacts` admin list is read once, server-side, and only refreshes on a full
navigation or an explicit `router.refresh()` after a mutation. Leave the tab open and the
list goes stale — an artifact added elsewhere (e.g. via the iOS ingest Shortcut) never
appears until a manual reload. TanStack Query turns the list into a live client query that
refetches when the tab regains focus and after every mutation, and gives the three
mutations first-class pending / error / optimistic handling in place of hand-rolled
`useState` flags.

## What Changes

- Add `@tanstack/react-query` and an app-wide `QueryClientProvider` (in `src/app/provider.tsx`).
- Move the list read from the RSC direct-S3 fetch to a client `useQuery` against the existing
  (currently unused) `GET /api/artifacts`, seeded from the server render via `initialData` so
  first paint has no loading spinner.
- Refetch the list **on window focus** and after mutations. No polling interval.
- Convert upload, update, and delete to `useMutation`, invalidating the artifacts query on
  success. **Delete is optimistic** — the card is removed immediately and restored if the
  request fails.
- A background list fetch that returns **401** redirects to `/login`.
- Establish the convention that **TanStack Query is the default for future client-side
  queries and mutations** (recorded in `CLAUDE.md`).
- Testing: add a `renderWithClient` helper under `src/testing/`; update the
  artifact-management component tests to assert on query invalidation / re-render instead of
  `router.refresh`.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `artifact-management`: the management surface's listing becomes a live client query —
  seeded from the server render, refetched on window focus and after every mutation — rather
  than a static server prop refreshed only by full navigation. Delete becomes optimistic, and
  a background listing fetch that returns 401 redirects to login. Endpoint behaviour
  (upload / update / delete / list request-response contracts) is unchanged.

## Impact

- **Dependencies**: `+ @tanstack/react-query`.
- **Code**:
  - `src/app/provider.tsx` — add `QueryClientProvider` around the existing `ThemeProvider`.
  - `src/app/(admin)/artifacts/page.tsx` — RSC seeds the query (passes `initialData`) instead of
    owning the read + `listingFailed` branch.
  - `src/features/artifact-management/` — new query/mutation hooks and a shared query-client
    config; `artifact-list.tsx` becomes a client component driven by `useQuery`; `upload-form.tsx`,
    `update-dialog.tsx`, and `artifact-card.tsx` move from `fetch` + `router.refresh()` to
    `useMutation` + `invalidateQueries`.
  - The dormant `GET /api/artifacts` route gains its first client consumer.
- **Tests**: new `src/testing/` render helper; updated artifact-management component tests.
- **Docs**: `CLAUDE.md` tech-stack + conventions.
- **Out of scope**: `auth` (login/logout stay one-shot form posts that navigate away — no
  caching value); `artifact-ingest`; the read-only `artifact-server`.
