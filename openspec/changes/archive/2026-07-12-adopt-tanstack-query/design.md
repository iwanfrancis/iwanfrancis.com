## Context

The `/artifacts` admin surface is the app's only page with real reads and mutations. Today:

- **Read**: `artifacts/page.tsx` is an async RSC that calls `listArtifacts()` (direct S3) and
  passes the array as a prop to a presentational `ArtifactList`. It try/catches S3 failure into
  a `listingFailed` alert.
- **Writes**: `upload-form`, `update-dialog`, and `artifact-card` each `fetch` a
  `/api/artifacts*` endpoint, hand-roll `pending`/`error` `useState`, and call
  `router.refresh()` to re-run the RSC and pull fresh data.
- A gated `GET /api/artifacts` route already exists and returns `{ artifacts }`, but **nothing
  calls it** — it is only exercised by tests. The RSC reads S3 directly, so the endpoint is a
  dormant read path.

`router.refresh()` covers "refetch after I mutate" but cannot refetch on window focus — so a
tab left open goes stale (notably, artifacts added by the iOS ingest Shortcut never appear).
There is a Vitest suite (colocated, `tsx` → jsdom) but no client-fetching library.

This change was scoped through explore mode; the user's decisions: focus-refetch only (no
polling), redirect to login on a background 401, optimistic delete, implementer's call on
seeding strategy, and a standing preference that TanStack be the default for future client
data-fetching.

## Goals / Non-Goals

**Goals:**

- The listing stays current in an open session: refetch on window focus and after every
  mutation, with no loading flash on first paint.
- Mutations get first-class `isPending`/`error` and optimistic delete, replacing hand-rolled
  state.
- A background listing 401 sends the admin to login rather than showing a stale/empty list.
- Establish TanStack Query as the app's default client data-fetching layer (provider + a
  small `lib/` config + feature-scoped hooks) so future features follow the same pattern.

**Non-Goals:**

- No fixed-interval polling.
- No migration of `auth` (login/logout are one-shot POSTs that navigate away — nothing to
  cache), `artifact-ingest`, or the read-only `artifact-server`.
- No `HydrationBoundary`/`dehydrate` rehydration, no route prefetching — `initialData` is
  sufficient for a single query (see Decisions).
- No change to any endpoint's request/response contract.

## Decisions

### 1. Seed the client query with `initialData` (not full rehydration, not pure-client)

The RSC keeps fetching the list server-side and passes it as `initialData` to a client
`useQuery`. First paint shows real data (no spinner); the query then owns freshness.

- **Alternative — pure client (`useQuery`, no seed)**: simplest, but reintroduces a loading
  spinner on every page load and deletes the working server fetch. Rejected — worse UX for no
  gain.
- **Alternative — `HydrationBoundary` + `dehydrate`**: the "proper" rehydration pattern, but it
  earns its keep with *many* prefetched queries and a shared server QueryClient
  (`getQueryClient()`). For a single list it is pure ceremony. Rejected as over-engineered;
  revisit if we ever prefetch several queries per route.

### 2. Asymmetric read paths: server seeds from S3, client refetches via the API route

The server seed calls `listArtifacts()` directly (no HTTP hop, already inside the gated RSC).
The client `queryFn` for the *same* query key fetches `GET /api/artifacts`. This mirrors the
existing split (RSC reads S3; the browser only ever talks to same-origin API routes, which
carry the session cookie) and finally gives the dormant GET route a consumer.

### 3. Drop the `listingFailed` branch — the query owns read errors

Pass `initialData` only when the server fetch succeeds; on server-side S3 failure, pass nothing
and let the client query fetch and surface its own loading/error state. This removes the
bespoke `listingFailed` alert and gives one error path for the read instead of two.

### 4. `QueryClient` lives in `lib/`, provider wraps the app, hooks are feature-scoped

- `src/lib/react-query.ts` — a `makeQueryClient()` with default options and the global 401
  handler (Decision 6). `lib/` is the bulletproof home for configured-library wrappers and
  stays import-clean (shared layer, imports nothing from features/app).
- `src/app/provider.tsx` — wrap the existing `ThemeProvider` in `QueryClientProvider`, creating
  the client via `useState(() => makeQueryClient())` so it is stable per browser session and
  never shared across server requests (the standard App Router SSR-safe pattern).
- `src/features/artifact-management/api/` — one file per operation, per bulletproof:
  `get-artifacts.ts` (`artifactsQuery` key + fetcher + `useArtifacts`), `upload-artifact.ts`,
  `update-artifact.ts`, `delete-artifact.ts`. Query key: `['artifacts']` (a single list — no
  key factory needed yet).

### 5. Focus-refetch only; a small `staleTime` to avoid a redundant post-SSR refetch

`refetchOnWindowFocus` is **on by default** — the "come back to an open tab" behaviour is
essentially free once the read is a query. No `refetchInterval`. Set `staleTime: 30_000` on the
list query so the freshly-seeded data isn't treated as stale the instant it mounts (which would
fire an immediate, invisible refetch right after SSR); any real return-to-tab is well beyond
30s, so focus refetch still fires. `gcTime` left at default.

### 6. 401 handling: a global `QueryCache.onError` redirect, keyed off a typed error

The list `queryFn` throws a typed `UnauthorizedError` when the response is 401. `makeQueryClient`
installs a `QueryCache({ onError })` that, on an `UnauthorizedError`, redirects to the login page
via `window.location.assign('/login?next=/artifacts')` (a shared-layer module can't use the
`next/navigation` router, and a hard navigation is the right move for a dead session anyway).

- **Why global over per-hook**: it centralises the "session dead → login" rule so every future
  query inherits it — directly serving the convention in Goal 4. With one query today the
  behaviour is identical; the global handler just avoids re-implementing it later.
- Set `retry` to not retry on `UnauthorizedError` (and a low retry count otherwise) so a 401
  redirects promptly instead of retrying three times first.

### 7. Mutations → `useMutation`; delete is optimistic

Each mutation's `onSuccess` calls `queryClient.invalidateQueries({ queryKey: ['artifacts'] })`,
replacing `router.refresh()`. Upload and update stay non-optimistic (they need the server's new
`meta.json`/timestamps). Delete is optimistic via the standard dance:

- `onMutate`: cancel in-flight list fetches, snapshot the current list, remove the card from the
  cached list.
- `onError`: restore the snapshot and surface the failure.
- `onSettled`: invalidate to reconcile with the server.

Components drop their `pending`/`error` `useState` in favour of `isPending`/`error` from the
mutation. `artifact-list.tsx` becomes a `'use client'` component driven by `useArtifacts`.

### 8. Record the convention

Add TanStack Query to the CLAUDE.md tech stack and note the pattern (provider + `lib/react-query`
+ feature `api/` hooks; queries/mutations are the default for client data-fetching) so it isn't
re-litigated per feature.

## Risks / Trade-offs

- **A global 401 redirect could fire on a transient/unexpected 401** → only `UnauthorizedError`
  (explicitly a 401 from the fetcher) triggers it, not generic errors; for a single-user admin
  surface a hard bounce to login is acceptable and expected.
- **`initialData` treated as fresh could mask a very recent server-side change** → bounded by the
  30s `staleTime`, and focus/mutation refetches reconcile quickly; acceptable for one admin.
- **Optimistic delete can briefly show an inconsistent list if rollback races a refetch** → the
  `onMutate`/`onError`/`onSettled` snapshot-and-invalidate pattern plus `cancelQueries` is the
  documented, race-safe approach.
- **A new app-wide provider touches the whole tree** → `QueryClientProvider` is inert for pages
  that issue no queries; the `useState` client instance keeps it SSR-safe (no cross-request
  state leak). Low risk.
- **Convention scope creep** → documented as the default for *new* work, explicitly not a mandate
  to retrofit `auth` or anything else in this change.

## Migration Plan

Incremental, no flag needed:

1. Add the dependency; add `lib/react-query.ts` and the provider.
2. Add the `api/` query hook; convert `artifact-list` + `page.tsx` to seed-and-query. Verify
   read, focus-refetch, and the seeded first paint.
3. Convert the three mutations to `useMutation` + invalidate; add optimistic delete.
4. Wire the global 401 redirect.
5. Add the `renderWithClient` test helper; update component tests (assert invalidation/re-render,
   not `router.refresh`).
6. Update CLAUDE.md.

Rollback: revert the change — no data or schema migration, endpoints untouched.

## Open Questions

- Preserve `?next=/artifacts` on the 401 redirect (vs bare `/login`)? Recommended yes, to match
  the existing `ProtectedRoute redirectTo="/login?next=/artifacts"` convention.
