## 1. Dependency & provider

- [x] 1.1 Add `@tanstack/react-query` to `dependencies` and install with yarn.
- [x] 1.2 Create `src/lib/react-query.ts` exporting `makeQueryClient()` with default options
      (`staleTime`, low `retry` that never retries an `UnauthorizedError`) and a
      `QueryCache({ onError })` that redirects to `/login?next=/artifacts` via
      `window.location.assign` when the error is an `UnauthorizedError`.
- [x] 1.3 Wrap the existing `ThemeProvider` in `src/app/provider.tsx` with `QueryClientProvider`,
      creating the client via `useState(() => makeQueryClient())` (SSR-safe, one client per
      browser session).

## 2. List read as a seeded client query

- [x] 2.1 Add `src/features/artifact-management/api/get-artifacts.ts`: export the `['artifacts']`
      query key, a client fetcher for `GET /api/artifacts` that throws a typed `UnauthorizedError`
      on 401 and a generic error otherwise, and a `useArtifacts(initialData?)` hook wrapping
      `useQuery` (`staleTime: 30_000`, `refetchOnWindowFocus` left default-on, no interval).
- [x] 2.2 Convert `src/features/artifact-management/components/artifact-list.tsx` to a
      `'use client'` component that reads the list via `useArtifacts` (seeded from an
      `initialData` prop) instead of taking `artifacts` as a static prop.
- [x] 2.3 Update `src/app/(admin)/artifacts/page.tsx` so the RSC still calls `listArtifacts()` but
      passes the result as `initialData`; on S3 failure pass nothing and remove the bespoke
      `listingFailed` alert (the query now owns the read error/loading state).

## 3. Mutations via `useMutation`

- [x] 3.1 Add `src/features/artifact-management/api/upload-artifact.ts` (`useUploadArtifact`):
      `POST /api/artifacts`, `onSuccess` invalidates `['artifacts']`. Rewire `upload-form.tsx` to
      use it, dropping the hand-rolled `pending`/`error` state and the `router.refresh()` call.
- [x] 3.2 Add `src/features/artifact-management/api/update-artifact.ts` (`useUpdateArtifact`):
      `PUT /api/artifacts/<slug>`, `onSuccess` invalidates `['artifacts']`. Rewire
      `update-dialog.tsx` accordingly.
- [x] 3.3 Add `src/features/artifact-management/api/delete-artifact.ts` (`useDeleteArtifact`):
      `DELETE /api/artifacts/<slug>` with optimistic update — `onMutate` cancels in-flight list
      fetches, snapshots and removes the card from the cached list; `onError` restores the
      snapshot; `onSettled` invalidates. Rewire `artifact-card.tsx` to use it.

## 4. Session-expiry redirect

- [x] 4.1 Confirm a background list refetch that returns 401 surfaces as `UnauthorizedError` and
      triggers the global redirect to `/login?next=/artifacts` (verify the fetcher throws the
      typed error and the `QueryCache.onError` path fires).

## 5. Tests

- [x] 5.1 Add a `renderWithClient` helper in `src/testing/` that wraps RTL `render` in a fresh
      `QueryClientProvider` per test (client with `retry: false`).
- [x] 5.2 Update `upload-form.test.tsx`, `update-dialog` tests, and `artifact-card` /
      `artifact-list` tests to render via `renderWithClient` and assert on list re-render /
      cache invalidation and optimistic removal, not on `router.refresh`.
- [x] 5.3 Add a test for optimistic delete: the card is removed immediately on confirm and
      restored when the `DELETE` rejects.

## 6. Docs & verification

- [x] 6.1 Update `CLAUDE.md`: add `@tanstack/react-query` to the tech stack and record the
      convention (provider + `lib/react-query` + feature `api/` hooks; TanStack Query is the
      default for client-side queries/mutations).
- [x] 6.2 Run `yarn lint`, `yarn typecheck`, and `yarn test` — all green.
- [x] 6.3 Manually verify in `yarn dev`: seeded list on first paint (no spinner), list refetches
      on window focus, each mutation updates the list without a full reload, and an expired
      session on a background refetch bounces to login.
