## ADDED Requirements

### Requirement: The listing stays current within an open session

The management surface's artifact listing SHALL be a client-side query, seeded from the
server-rendered listing so it appears on first paint without a loading state. The query SHALL
refetch when the browser tab regains focus and after any successful upload, update, or
deletion, so the listing stays current without a full-page navigation. The listing SHALL NOT
poll on a fixed interval.

#### Scenario: The seeded list renders on first paint

- **WHEN** the `/artifacts` page loads for an admin with two hosted artifacts
- **THEN** both artifacts are shown immediately, without a loading spinner and without waiting
  for a client-side fetch to resolve

#### Scenario: Regaining focus refetches the listing

- **WHEN** the admin leaves the `/artifacts` tab and later returns to it, and an artifact was
  added or removed elsewhere in the meantime
- **THEN** the listing refetches from `GET /api/artifacts` and reflects the current set of
  hosted artifacts

#### Scenario: A successful mutation updates the listing without navigation

- **WHEN** an upload, update, or delete succeeds
- **THEN** the listing reflects the change without a full-page reload or manual refresh

### Requirement: Deletion is optimistic

When the admin confirms deletion of an artifact, the management surface SHALL remove that
artifact's card from the listing immediately — before the `DELETE` request resolves. If the
`DELETE` request fails, the system SHALL restore the removed card and surface the failure, so
the listing never permanently hides an artifact that was not actually deleted.

#### Scenario: Confirmed deletion removes the card immediately

- **WHEN** the admin confirms deletion of `my-demo`
- **THEN** `my-demo`'s card is removed from the listing straight away, before the server
  confirms the deletion

#### Scenario: A failed deletion restores the card

- **WHEN** a confirmed deletion of `my-demo` is optimistically removed but the `DELETE` request
  then fails
- **THEN** `my-demo`'s card reappears in the listing and the failure is surfaced

### Requirement: Session expiry during a background refetch returns to login

The management surface SHALL redirect the admin to the login page when a background listing
fetch (`GET /api/artifacts`) returns HTTP 401 — the admin session expired while the page was
left open — rather than silently showing a stale or empty list.

#### Scenario: A 401 on background refetch redirects to login

- **WHEN** the listing query refetches while the page is open and the request returns 401
- **THEN** the admin is redirected to the login page
