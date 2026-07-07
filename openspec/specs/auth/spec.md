# auth Specification

## Purpose
TBD - created by archiving change auth. Update Purpose after archive.
## Requirements
### Requirement: Password authentication endpoint

The system SHALL expose an endpoint that accepts a submitted password and compares it, using a
constant-time (timing-safe) comparison, against the admin secret held in the `ARTIFACTS_SECRET`
environment variable. On a match the system SHALL establish an authenticated session by setting the
session cookie (see "Session cookie is signed and tamper-evident"). On a mismatch, an empty
submission, or when no secret is configured, the system SHALL NOT set a session cookie and SHALL
respond with an authentication failure.

#### Scenario: Correct password establishes a session

- **WHEN** the correct password is submitted to the auth endpoint
- **THEN** the response sets a session cookie and indicates success

#### Scenario: Wrong password is rejected

- **WHEN** an incorrect password is submitted to the auth endpoint
- **THEN** no session cookie is set and the response indicates authentication failure

#### Scenario: Empty submission is rejected

- **WHEN** the auth endpoint is called with no password or an empty password
- **THEN** no session cookie is set and the response indicates authentication failure

### Requirement: Session cookie is signed and tamper-evident

The session cookie SHALL be cryptographically signed with a key held in the `SESSION_SECRET`
environment variable, such that its authenticity is verified on every gated request. A cookie whose
signature does not verify SHALL be treated as no session at all.

#### Scenario: A valid cookie is accepted

- **WHEN** a request to a gated path carries a session cookie whose signature verifies
- **THEN** the request is treated as authenticated

#### Scenario: A tampered cookie is rejected

- **WHEN** a request carries a session cookie whose value has been altered so its signature no
  longer verifies
- **THEN** the request is treated as unauthenticated

### Requirement: Session cookie attributes

The session cookie SHALL be set with the `HttpOnly` and `Secure` attributes and `SameSite=Lax`, and
SHALL be **host-only** — set with no `Domain` attribute so it is scoped to the primary site host
(`iwans.space`) and is never transmitted to the artifacts subdomain (`artifacts.iwans.space`).

#### Scenario: Cookie is HttpOnly and Secure

- **WHEN** the session cookie is set following a successful login
- **THEN** the `Set-Cookie` header includes `HttpOnly`, `Secure`, and `SameSite=Lax`

#### Scenario: Cookie is host-only

- **WHEN** the session cookie is set
- **THEN** the `Set-Cookie` header carries no `Domain` attribute, so the cookie is not sent on
  requests to `artifacts.iwans.space`

### Requirement: Sessions expire

The session SHALL carry an expiry that is covered by the cookie's signature, so the expiry cannot be
extended by the client. A request whose session has passed its expiry SHALL be treated as
unauthenticated. The default session lifetime SHALL be seven days.

#### Scenario: An expired session is rejected

- **WHEN** a request carries a session cookie whose signed expiry is in the past
- **THEN** the request is treated as unauthenticated

#### Scenario: A within-lifetime session is accepted

- **WHEN** a request carries a validly signed session cookie whose expiry is in the future
- **THEN** the request is treated as authenticated

### Requirement: The admin surface requires a valid session

The system SHALL gate the admin surface — the `/artifacts` page (and any path beneath it) and the
`/api/artifacts` API paths — so it is reachable only with a valid session. An unauthenticated request
for a gated **page** SHALL be redirected to the login surface. An unauthenticated request for a gated
**API** path SHALL receive an HTTP 401 response. The authentication endpoint and the login surface
themselves SHALL NOT be gated.

#### Scenario: Unauthenticated page request is redirected to login

- **WHEN** an unauthenticated client requests `/artifacts`
- **THEN** it is redirected to the login surface

#### Scenario: Unauthenticated API request is refused

- **WHEN** an unauthenticated client requests an `/api/artifacts` path
- **THEN** the response status is 401

#### Scenario: Authenticated request reaches the admin surface

- **WHEN** a client holding a valid session requests `/artifacts`
- **THEN** the admin page is served

#### Scenario: The login path is reachable without a session

- **WHEN** an unauthenticated client requests the login surface or the auth endpoint
- **THEN** the request is not gated

### Requirement: The public site stays unauthenticated

Gating SHALL apply only to the admin surface. The rest of the site — the landing page, the thingies
canvas, framework internals (`_next`), and static assets — SHALL remain publicly reachable with no
session.

#### Scenario: The landing page needs no session

- **WHEN** an unauthenticated client requests the site's public pages (e.g. `/`)
- **THEN** the content is served without any redirect to login or 401

### Requirement: Logout ends the session

The system SHALL expose a logout action that clears the session cookie, after which previously
gated paths again require a fresh login.

#### Scenario: Logout clears the session

- **WHEN** an authenticated client invokes logout
- **THEN** the session cookie is cleared and a subsequent request to `/artifacts` is redirected to
  login

### Requirement: Gated admin landing page

The system SHALL provide a `/artifacts` page that renders for an authenticated session. In this
change the page MAY be an empty placeholder shell; its presence exists to prove the login → view →
logout loop. Upload, listing, and management content are out of scope.

#### Scenario: The shell renders when authenticated

- **WHEN** a client with a valid session requests `/artifacts`
- **THEN** the admin landing page renders

