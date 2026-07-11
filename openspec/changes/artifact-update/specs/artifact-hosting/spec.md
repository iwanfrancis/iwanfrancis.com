## REMOVED Requirements

### Requirement: Artifact responses are cached as immutable

**Reason**: Slugs are no longer treated as immutable — the `artifact-management` capability now
supports updating an artifact in place at an existing slug. A one-year `immutable` directive pins
stale bytes in viewers' browser caches, so an update to a re-used slug would never propagate to
anyone who had already loaded it. Replaced by validation caching.

**Migration**: Serve the artifact entrypoint with a revalidatable `Cache-Control` plus a strong
`ETag` (see the added requirement below) instead of `public, max-age=31536000, immutable`. No stored
data changes; only the response headers emitted by `artifact-server` change. Note that any response
already served as `immutable` stays pinned in that viewer's cache until it ages out — the new policy
governs responses served after it ships.

## ADDED Requirements

### Requirement: Artifact responses use validation caching

Successful artifact responses SHALL support cache revalidation rather than being marked immutable, so
that content updated in place at an existing slug can propagate to clients. Each successful 200
artifact response SHALL include a strong `ETag` derived from the served object and a `Cache-Control`
header that requires a cached copy to be revalidated with the origin before reuse — either
`no-cache`, or a short `max-age` combined with `must-revalidate` — and SHALL NOT include the
`immutable` directive. When a conditional request carries an `If-None-Match` that matches the current
object's ETag, the system SHALL respond `304 Not Modified` with no body.

#### Scenario: A served artifact carries a revalidatable cache header and an ETag

- **WHEN** an existing artifact object is served with a 200 response
- **THEN** the response includes an `ETag` and a `Cache-Control` header that forces revalidation
  (e.g. `no-cache`, or `max-age=<small>, must-revalidate`) and does not include `immutable`

#### Scenario: Unchanged content revalidates to 304

- **WHEN** a client re-requests an artifact object with `If-None-Match` equal to the object's current
  ETag
- **THEN** the response status is 304 Not Modified with no body

#### Scenario: Updated content is fetched fresh

- **WHEN** an artifact's bytes at a slug have changed and a client re-requests with an `If-None-Match`
  from the previous version
- **THEN** the response status is 200 with the new bytes and a new ETag
