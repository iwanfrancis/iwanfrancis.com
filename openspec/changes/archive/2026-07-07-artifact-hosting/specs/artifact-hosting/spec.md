## ADDED Requirements

### Requirement: Artifact storage contract

The system SHALL store each hosted artifact under a single object-key prefix `<slug>/` in the
object store. That prefix SHALL contain an `index.html` object, zero or more additional asset
objects at arbitrary sub-paths, and a `meta.json` object. `meta.json` SHALL be valid JSON
containing at least `slug` (string, equal to the prefix), `title` (string), and `createdAt` (an
ISO-8601 UTC timestamp). The object store SHALL be the sole source of truth for artifacts; the
system SHALL NOT maintain a separate database or index of artifacts.

A `slug` SHALL consist only of lowercase ASCII letters, digits, and single hyphens, SHALL NOT begin
or end with a hyphen, and SHALL be non-empty.

#### Scenario: An artifact occupies one slug prefix

- **WHEN** an artifact with slug `my-demo` is stored
- **THEN** its files live under keys beginning `my-demo/` (e.g. `my-demo/index.html`,
  `my-demo/app.js`, `my-demo/meta.json`)

#### Scenario: meta.json carries the required fields

- **WHEN** `my-demo/meta.json` is read
- **THEN** it parses as JSON containing at least `slug` (`"my-demo"`), `title`, and an ISO-8601
  `createdAt`

### Requirement: Public serving of artifact content

The system SHALL serve stored artifact content over HTTP by mapping a request path to an object
key. A request for `/<slug>/<path>` SHALL return the object at key `<slug>/<path>`. A request for a
slug root — `/<slug>` or `/<slug>/` — SHALL return the object at key `<slug>/index.html`. Serving
SHALL be public and require no authentication.

#### Scenario: A nested asset is served

- **WHEN** a request arrives for `/my-demo/assets/app.js`
- **THEN** the object at key `my-demo/assets/app.js` is returned with a 200 response

#### Scenario: The slug root serves index.html

- **WHEN** a request arrives for `/my-demo/` (or `/my-demo`)
- **THEN** the object at key `my-demo/index.html` is returned with a 200 response

#### Scenario: No credentials are required

- **WHEN** an unauthenticated client requests an existing artifact path
- **THEN** the content is served without any login or token

### Requirement: Responses carry the object's stored content type

The serving response SHALL set its `Content-Type` header to the value stored on the object in the
object store, so HTML, CSS, JavaScript, images, and other assets are delivered with correct MIME
types.

#### Scenario: HTML and its assets get correct MIME types

- **WHEN** `my-demo/index.html` (stored as `text/html`) and `my-demo/app.js` (stored as
  `text/javascript`) are requested
- **THEN** the responses carry `Content-Type: text/html` and `Content-Type: text/javascript`
  respectively

### Requirement: Artifact responses are cached as immutable

Because an artifact's content at a given slug never changes, successful artifact responses SHALL
include the header `Cache-Control: public, max-age=31536000, immutable`.

#### Scenario: A served artifact is marked immutable

- **WHEN** an existing artifact object is served with a 200 response
- **THEN** the response includes `Cache-Control: public, max-age=31536000, immutable`

### Requirement: Missing artifacts return 404

A request that maps to an object key not present in the store SHALL return an HTTP 404 response and
SHALL NOT return content from any other key.

#### Scenario: Unknown slug

- **WHEN** a request arrives for `/does-not-exist/`
- **THEN** the response status is 404

#### Scenario: Unknown asset within an existing slug

- **WHEN** slug `my-demo` exists but no `my-demo/missing.js` object exists
- **THEN** a request for `/my-demo/missing.js` returns 404

### Requirement: Malformed requests are rejected

The system SHALL reject requests whose slug or path is malformed — including path segments equal to
`..`, a slug not matching the permitted slug format, or otherwise disallowed characters — with an
HTTP 400 response, without performing an object-store lookup.

#### Scenario: Traversal-style segment is rejected

- **WHEN** a request contains a `..` path segment (e.g. `/my-demo/../secrets`)
- **THEN** the response status is 400 and no object-store lookup is performed

#### Scenario: Invalid slug format is rejected

- **WHEN** a request targets a slug containing disallowed characters (e.g. `/My_Demo/`)
- **THEN** the response status is 400

### Requirement: Artifact content is origin-isolated to the artifacts subdomain

The system SHALL serve artifact content only for requests whose host is `artifacts.iwans.space`.
Requests for artifact paths sent to the primary site origin (`iwans.space`) SHALL NOT return
artifact content. This keeps hosted, untrusted artifact code on a separate browser origin from the
main site and any future admin session.

#### Scenario: Served on the artifacts subdomain

- **WHEN** `https://artifacts.iwans.space/my-demo/` is requested and the artifact exists
- **THEN** the artifact is served

#### Scenario: Not served on the primary origin

- **WHEN** a request for the same slug path is made against the `iwans.space` origin
- **THEN** the artifact content is not served from that origin
