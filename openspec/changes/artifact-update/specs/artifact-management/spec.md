## ADDED Requirements

### Requirement: Authenticated update endpoint

The system SHALL expose a gated `PUT /api/artifacts/<slug>` endpoint that replaces the files of an
existing artifact in place, accepting the same `multipart/form-data` body as upload (a single
artifact `file` — a `.html` file or a `.zip` bundle — and an optional `title`). The endpoint SHALL
require a valid admin session (an unauthenticated request SHALL receive HTTP 401 and change nothing)
and SHALL reject a cross-site request with HTTP 403 using the shared same-origin check. The target
slug SHALL already exist; a `PUT` to a slug with no existing objects SHALL return HTTP 404 and write
nothing. On success the endpoint SHALL respond with the artifact's slug and its unchanged public
share URL (`https://artifacts.iwans.space/<slug>/`).

#### Scenario: Unauthenticated update is refused

- **WHEN** a client without a valid session sends `PUT /api/artifacts/my-demo`
- **THEN** the response status is 401 and the stored artifact is unchanged

#### Scenario: Cross-site update is refused

- **WHEN** an authenticated request to `PUT /api/artifacts/my-demo` carries an `Origin` header whose
  host differs from the request host
- **THEN** the response status is 403 and the stored artifact is unchanged

#### Scenario: Update of a non-existent slug is a 404

- **WHEN** an authenticated, same-origin `PUT /api/artifacts/never-made` targets a slug with no
  existing objects
- **THEN** the response status is 404 and no object is written

#### Scenario: Successful update returns the unchanged share link

- **WHEN** an authenticated, same-origin update of existing slug `my-demo` with a valid file succeeds
- **THEN** the response indicates success and includes the URL `https://artifacts.iwans.space/my-demo/`

### Requirement: In-place replace removes superseded objects

An update SHALL validate the entire new upload before writing anything, applying the same rules as a
create (zip-slip protection, size/entry-count caps, and a resolvable root `index.html`). It SHALL
then write the new entries and a new `meta.json`, and SHALL delete every object under `<slug>/` that
is not part of the new upload, so no file from the previous version is left orphaned. If the new
upload fails validation, the system SHALL leave the existing artifact unchanged and continue to serve
it.

#### Scenario: A removed file is pruned on update

- **WHEN** slug `my-demo` currently holds `my-demo/index.html` and `my-demo/assets/old.js`, and it is
  updated with a bundle that no longer contains `assets/old.js`
- **THEN** after the update `my-demo/assets/old.js` no longer exists and `my-demo/index.html` is the
  new version

#### Scenario: An invalid replacement leaves the previous version intact

- **WHEN** an update of existing slug `my-demo` supplies a file that fails validation (e.g. a
  zip-slip entry or a bundle with no root `index.html`)
- **THEN** the update is rejected and the previously stored `my-demo` artifact is unchanged and still
  served

### Requirement: Update preserves createdAt and records updatedAt

On a successful update, the rewritten `<slug>/meta.json` SHALL retain the `createdAt` from the
previous `meta.json` and SHALL set an `updatedAt` field to an ISO-8601 UTC timestamp of the update.
If a previous `createdAt` cannot be read, `createdAt` SHALL be set to the update time. A blank title
submitted with an update SHALL keep the existing title and SHALL NOT reset it to the slug.

#### Scenario: createdAt is preserved and updatedAt is set

- **WHEN** existing artifact `my-demo` (created at time T0) is updated at a later time T1
- **THEN** its `meta.json` still records `createdAt` = T0 and records `updatedAt` = T1

#### Scenario: Blank title on update keeps the existing title

- **WHEN** existing artifact `my-demo` titled "My Demo" is updated with an empty title field
- **THEN** its `meta.json` still records `title: "My Demo"`

### Requirement: Update via the artifact card

The management surface SHALL let an authenticated admin update an existing artifact from its card via
an update action that opens a dialog scoped to that artifact. In the dialog the slug SHALL be shown
read-only (the admin SHALL NOT be able to retarget a different slug), the current title SHALL be
prefilled, and the admin SHALL drop or choose a new `.html` file or `.zip` bundle to replace the
content. On success the listing SHALL reflect the update and the artifact's share link SHALL be
unchanged.

#### Scenario: Admin updates an artifact from its card

- **WHEN** an authenticated admin activates the update action on `my-demo`'s card, drops a new valid
  file, and submits
- **THEN** the artifact's content is replaced and its existing share link now serves the new version

#### Scenario: The update dialog fixes the slug

- **WHEN** an authenticated admin opens the update dialog for `my-demo`
- **THEN** the slug `my-demo` is shown read-only and cannot be changed to target another artifact
