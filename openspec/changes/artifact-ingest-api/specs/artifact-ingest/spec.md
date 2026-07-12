## Purpose

Let a headless client (an iOS Shortcut fired from Claude's "download HTML" share
sheet) publish a single self-contained `.html` artifact to the hosted store with
one action, authenticated by a long-lived bearer token that is independent of the
browser admin session and preserves the origin-isolation invariants.

## ADDED Requirements

### Requirement: Token-authenticated ingest endpoint

The system SHALL expose `POST /api/ingest` that authenticates the request solely
by a bearer token compared constant-time against `ARTIFACTS_API_TOKEN`, and SHALL
reject any request that does not present the correct token. The endpoint SHALL
fail closed when `ARTIFACTS_API_TOKEN` is unset.

#### Scenario: Valid token is accepted

- **WHEN** a request carries `Authorization: Bearer <token>` matching `ARTIFACTS_API_TOKEN` and a valid HTML body
- **THEN** the artifact is stored and the endpoint responds `201` with `{ slug, url }`

#### Scenario: Missing or malformed Authorization is refused

- **WHEN** a request has no `Authorization` header, or one not in `Bearer <token>` form
- **THEN** the endpoint responds `401` and writes nothing

#### Scenario: Wrong token is refused

- **WHEN** a request presents a bearer token that does not equal `ARTIFACTS_API_TOKEN`
- **THEN** the endpoint responds `401` and writes nothing

#### Scenario: Unset server token fails closed

- **WHEN** `ARTIFACTS_API_TOKEN` is not configured
- **THEN** every request is refused with `401`, regardless of the token presented

### Requirement: Raw HTML body is stored as the artifact index

The system SHALL treat a request whose body is a single HTML document
(Content-Type `text/html`, `application/octet-stream`, or absent) as one artifact:
it MUST store the body as that artifact's `index.html` under a fresh slug and MUST
return the public share URL.

#### Scenario: Raw HTML body becomes the slug's index

- **WHEN** an authenticated request POSTs an HTML document as the raw request body
- **THEN** the bytes are written to `<slug>/index.html` and the response `url` resolves to that artifact

### Requirement: Multipart upload is accepted

The endpoint SHALL also accept `multipart/form-data` carrying a `file` field, and
SHALL validate and store it through the same shared upload path used by the admin
upload endpoint (so a lone `.html` and a `.zip` bundle are handled identically to
that path).

#### Scenario: Multipart file field is stored

- **WHEN** an authenticated request POSTs `multipart/form-data` with a `file` field containing a `.html` file
- **THEN** the file is validated and stored under a fresh slug and the endpoint responds `201` with `{ slug, url }`

### Requirement: Slug is generated server-side

The caller SHALL NOT be required to supply a slug. The system SHALL derive a
valid slug from the supplied title (or a constant fallback base when no usable
title is given) and SHALL guarantee uniqueness by appending a short suffix on
collision. The generated slug MUST satisfy the existing slug pattern.

#### Scenario: Slug is derived from the title

- **WHEN** an authenticated request supplies a title such as "My Cool Thing"
- **THEN** the stored artifact's slug is a slugified form of that title (e.g. `my-cool-thing`)

#### Scenario: Collision yields a distinct slug

- **WHEN** the derived slug already exists in the store
- **THEN** the endpoint stores the new artifact under a different, still-valid slug rather than overwriting or failing

#### Scenario: Missing title falls back to a default base

- **WHEN** an authenticated request supplies no title
- **THEN** a valid slug is still generated from a constant fallback base

### Requirement: Ingest is create-only and not cookie-gated

The endpoint SHALL be reachable without the admin session cookie and SHALL NOT be
intercepted by the admin auth middleware. It SHALL only create new artifacts —
it MUST NOT list, update, or delete existing artifacts — and SHALL NOT apply the
browser same-origin/CSRF check.

#### Scenario: Succeeds without a session cookie

- **WHEN** an authenticated (token-bearing) request arrives with no `admin_session` cookie
- **THEN** the request is not redirected or 401'd by middleware and the artifact is stored

#### Scenario: Cross-site token request is not rejected for its Origin

- **WHEN** a valid token-bearing request carries a cross-site `Origin` header
- **THEN** the endpoint does not reject it on same-origin grounds (bearer auth is not ambient, so CSRF does not apply)

### Requirement: Upload size limit applies

The ingest path SHALL enforce the same maximum upload size as the admin upload
path and SHALL reject an over-limit body without writing.

#### Scenario: Oversized body is rejected

- **WHEN** an authenticated request POSTs a body larger than the configured maximum total size
- **THEN** the endpoint responds `413` and writes nothing

### Requirement: A conforming meta.json is written

For each ingested artifact the system SHALL write a `meta.json` under the slug
carrying the required fields (`slug`, `title`, `createdAt`), with the title
defaulting to the slug when none is supplied.

#### Scenario: meta.json carries the required fields

- **WHEN** an artifact is ingested successfully
- **THEN** `<slug>/meta.json` exists and contains `slug`, `title`, and an ISO-8601 `createdAt`

### Requirement: Origin isolation is preserved by the token write path

The token write path MUST NOT weaken the origin-isolation model: the ingest token
is a credential distinct from the admin session cookie and MUST NOT depend on it,
the write path MUST NOT relax the public read-only artifact server, and no write
credential is added to the `artifact-server` service.

#### Scenario: Ingest token is independent of the admin session

- **WHEN** ingest authentication is evaluated
- **THEN** it relies only on `ARTIFACTS_API_TOKEN` and never on the `admin_session` cookie or `ARTIFACTS_SECRET`

#### Scenario: Writes never loosen the public server

- **WHEN** an artifact is ingested
- **THEN** it is written to the same bucket contract used by the admin path, with no change to how the public server serves content
