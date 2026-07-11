## ADDED Requirements

### Requirement: Authenticated upload endpoint

The system SHALL expose a gated `POST /api/artifacts` endpoint that accepts a `multipart/form-data`
body carrying a single artifact `file` (a `.html` file or a `.zip` bundle), a `slug`, and a `title`.
The endpoint SHALL require a valid admin session; an unauthenticated request SHALL receive an HTTP
401 and write nothing. The endpoint SHALL reject a cross-site request using the same-origin check
shared with the authentication endpoint. On success it SHALL respond with the created artifact's
slug and its public share URL (`https://artifacts.iwans.space/<slug>/`).

#### Scenario: Unauthenticated upload is refused

- **WHEN** a client without a valid session sends `POST /api/artifacts`
- **THEN** the response status is 401 and no object is written to the store

#### Scenario: Cross-site upload is refused

- **WHEN** an authenticated request carries an `Origin` header whose host differs from the request
  host
- **THEN** the response status is 403 and no object is written

#### Scenario: Successful upload returns the share link

- **WHEN** an authenticated, same-origin upload of a valid artifact with slug `my-demo` succeeds
- **THEN** the response indicates success and includes the URL `https://artifacts.iwans.space/my-demo/`

### Requirement: Single HTML file is stored as index.html

When the uploaded `file` is a single `.html` file, the system SHALL store it at key
`<slug>/index.html` with `Content-Type: text/html` and SHALL NOT attempt to unzip it.

#### Scenario: Lone HTML becomes the slug's index

- **WHEN** a `.html` file is uploaded with slug `my-demo`
- **THEN** an object is written at key `my-demo/index.html` with content type `text/html`

### Requirement: Zip bundle is extracted into the slug prefix

When the uploaded `file` is a `.zip`, the system SHALL extract it in memory and write each contained
entry to key `<slug>/<entry-path>`. The bundle SHALL resolve to an `index.html` at the slug root
(directly, or via a single wrapping top-level directory that is normalised away); a bundle with no
resolvable root `index.html` SHALL be rejected without writing any object.

#### Scenario: Bundle assets are written under the slug

- **WHEN** a `.zip` containing `index.html` and `assets/app.js` is uploaded with slug `my-demo`
- **THEN** objects are written at `my-demo/index.html` and `my-demo/assets/app.js`

#### Scenario: Bundle without an index is rejected

- **WHEN** a `.zip` containing no resolvable root `index.html` is uploaded
- **THEN** the upload is rejected and no object is written

### Requirement: Each stored object carries a content type derived from its extension

On write, the system SHALL set each object's `Content-Type` from its file extension using a defined
extension→MIME mapping, and SHALL fall back to `application/octet-stream` for an unrecognised
extension. This satisfies the writer's half of the artifact-hosting serving contract.

#### Scenario: Common web assets get correct MIME types

- **WHEN** a bundle containing `index.html`, `styles.css`, and `app.js` is stored
- **THEN** the objects carry `Content-Type: text/html`, `text/css`, and `text/javascript`
  respectively

#### Scenario: Unknown extension falls back

- **WHEN** a bundle entry has an extension not present in the mapping
- **THEN** its object is stored with `Content-Type: application/octet-stream`

### Requirement: Zip extraction is protected against path traversal

Before writing any object, the system SHALL validate every entry in a `.zip` and SHALL reject the
entire upload if any entry path is absolute, contains a `..` segment, contains a backslash or
control character, or otherwise normalises to a location outside the `<slug>/` prefix. A rejected
archive SHALL NOT result in any object being written.

#### Scenario: Traversal entry rejects the whole archive

- **WHEN** a `.zip` contains an entry whose path is `../secrets.txt`
- **THEN** the upload is rejected and no object (not even valid sibling entries) is written outside
  or inside the prefix

#### Scenario: Absolute-path entry is rejected

- **WHEN** a `.zip` contains an entry with an absolute path (e.g. `/etc/passwd`)
- **THEN** the upload is rejected without any object-store write

### Requirement: Upload size and entry-count limits

The system SHALL enforce caps on an upload: a maximum total uncompressed size, a maximum per-file
size, and a maximum entry count. An upload exceeding any cap SHALL be rejected without writing a
complete artifact. The total-size cap SHALL be evaluated against the uncompressed content to guard
against zip bombs.

#### Scenario: Oversized upload is rejected

- **WHEN** an upload's total uncompressed size exceeds the configured maximum
- **THEN** the upload is rejected and no artifact is created

#### Scenario: Too many entries is rejected

- **WHEN** a `.zip` contains more entries than the configured maximum
- **THEN** the upload is rejected and no artifact is created

### Requirement: Slug is validated and must be unused

The system SHALL validate the submitted `slug` against the storage-contract format
(`^[a-z0-9]+(-[a-z0-9]+)*$`) and reject an invalid slug. Before writing, the system SHALL check the
store for any existing object under the `<slug>/` prefix and, if the slug is already in use, SHALL
reject the upload with HTTP 409 Conflict and change nothing.

#### Scenario: Invalid slug is rejected

- **WHEN** an upload supplies a slug that does not match the permitted format (e.g. `My_Demo`)
- **THEN** the upload is rejected and no object is written

#### Scenario: Duplicate slug is rejected

- **WHEN** an upload targets a slug for which objects already exist under `<slug>/`
- **THEN** the response status is 409 and the existing artifact is left unchanged

### Requirement: A conforming meta.json is written per artifact

For every successful upload the system SHALL write a `<slug>/meta.json` object containing valid JSON
with at least `slug` (equal to the prefix), `title`, and `createdAt` (an ISO-8601 UTC timestamp set
at upload time). `title` SHALL default to the slug when the submitted title is blank. To reduce the
chance of a partial artifact appearing in listings, `meta.json` SHALL be written after the artifact's
other objects.

#### Scenario: meta.json carries the required fields

- **WHEN** an artifact `my-demo` titled "My Demo" is uploaded
- **THEN** `my-demo/meta.json` is written as JSON containing `slug: "my-demo"`, `title: "My Demo"`,
  and an ISO-8601 `createdAt`

#### Scenario: Blank title defaults to the slug

- **WHEN** an artifact `my-demo` is uploaded with an empty title field
- **THEN** its `meta.json` records `title: "my-demo"`

### Requirement: Listing of hosted artifacts

The system SHALL expose a gated `GET /api/artifacts` that reads the object store and returns one
entry per hosted artifact, derived from each `<slug>/meta.json`, including the slug, title, created
date, and public share URL. The listing SHALL read from the store (no separate database) and SHALL
require a valid admin session.

#### Scenario: Listing returns hosted artifacts

- **WHEN** an authenticated client requests `GET /api/artifacts` and artifacts `a` and `b` exist
- **THEN** the response includes an entry for each, each with its slug, title, created date, and
  share URL

#### Scenario: Unauthenticated listing is refused

- **WHEN** a client without a valid session requests `GET /api/artifacts`
- **THEN** the response status is 401

### Requirement: Deletion of a hosted artifact

The system SHALL expose a gated `DELETE /api/artifacts/<slug>` that removes every object under the
`<slug>/` prefix. After deletion the artifact SHALL no longer appear in the listing and its share
URL SHALL cease to resolve to content.

#### Scenario: Delete removes the artifact

- **WHEN** an authenticated client sends `DELETE /api/artifacts/my-demo` for an existing artifact
- **THEN** all objects under `my-demo/` are removed and the artifact no longer appears in the listing

#### Scenario: Unauthenticated delete is refused

- **WHEN** a client without a valid session sends `DELETE /api/artifacts/my-demo`
- **THEN** the response status is 401 and no object is removed

### Requirement: Management surface

The system SHALL provide a gated `/artifacts` page that lets an authenticated admin upload an
artifact via drag-and-drop or file picker (choosing a slug and title) and view the list of hosted
artifacts, each showing its title, created date, and share link with a copy-link action and a delete
action. This replaces the placeholder shell.

#### Scenario: Admin uploads and sees the artifact listed

- **WHEN** an authenticated admin drops a valid artifact file, chooses slug `my-demo`, and submits
- **THEN** the artifact is uploaded and `my-demo` appears in the on-page list with a working share
  link

#### Scenario: Admin copies a share link

- **WHEN** an authenticated admin activates the copy-link action for a listed artifact
- **THEN** that artifact's public share URL is copied

### Requirement: Origin isolation is preserved by the write path

Write access SHALL be exercised only through the gated main-app endpoints using the main app's own
store credentials. The write credentials SHALL NOT be added to the public `artifact-server` service,
and the admin session cookie SHALL remain host-only (never sent to the artifacts subdomain). The
`artifact-server` serving path SHALL NOT be modified by this capability.

#### Scenario: Writes never loosen the public server

- **WHEN** the upload and delete endpoints are deployed
- **THEN** the `artifact-server` service remains read-only and public, with no write credential added
  to it

#### Scenario: The admin cookie is not sent to the artifacts subdomain

- **WHEN** the admin performs an upload from the main site
- **THEN** the request to the main app carries the host-only admin session cookie, which is not
  transmitted to `artifacts.iwans.space`
