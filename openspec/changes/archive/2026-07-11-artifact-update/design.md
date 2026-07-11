## Context

Hosted artifacts (change ①/③) are write-once today: `POST /api/artifacts` creates a slug and 409s
if it already exists; `DELETE /api/artifacts/[slug]` removes one. There is no way to update the files
behind an existing slug, so fixing or re-versioning a shared artifact means a new slug — which breaks
the link already handed out. The storage model is bucket-only (each artifact is a `<slug>/` prefix
with `index.html`, assets, and `meta.json`); `artifact-server` (a sibling repo) is a read-only S3
proxy that serves that bucket, and Cloudflare edge-caches it. Two earlier decisions explicitly
deferred update to this change: ③ rejects a re-used slug, and ① serves everything
`Cache-Control: public, max-age=31536000, immutable`. Full exploration and locked decisions are in
`openspec/notes/artifact-hosting-roadmap.md` (§④).

The load-bearing constraint is caching. Writing new bytes to the bucket does not mean viewers see
them: `immutable` tells a browser that already loaded the artifact never to revalidate that URL, so
an update would be invisible to prior viewers for up to a year. Since the whole point is "update the
thing behind a link I already shared", the serving cache policy has to change too — which is why this
change spans both repos even though the spec of record lives here.

## Goals / Non-Goals

**Goals:**

- Replace the content behind an existing slug in place, keeping the same public URL.
- Make an update actually propagate to viewers (not just to the bucket).
- Never leave orphaned files from a previous version, and never destroy the previous version on a
  failed update.
- Give the admin a discoverable, unambiguous way to update a specific artifact.

**Non-Goals:**

- Version history / rollback (each update overwrites; no retained prior versions).
- Renaming or re-slugging an artifact (the slug is fixed; that stays a delete-then-create).
- Per-artifact cache-policy tuning, CDN purge automation, or serving multiple versions concurrently.
- Any change to the auth/gate model or the origin-isolation invariants.

## Decisions

### 1. Caching: switch `artifact-server` from `immutable` to ETag validation caching

Serve the artifact entrypoint with a revalidatable `Cache-Control` (`no-cache`, or a short `max-age`
+ `must-revalidate`) plus a strong `ETag` passed through from the S3 object. Repeat views send
`If-None-Match` and get a cheap `304` when unchanged; after an update they get `200` + new bytes.

- **Over pure `immutable`:** immutable pins stale bytes in browsers indefinitely — updates can't
  propagate. Non-starter for a mutable resource at a stable URL.
- **Over a per-artifact `meta.json` cache-policy flag (`mutable: true`):** policy is baked in at
  *first* serve, so anything you might ever update has to be revalidatable from the start anyway —
  the flag buys nothing but complexity (an extra meta read on the serving path) for our case.
- **Over versioned/pointer URLs (`slug/v3/…`):** needs HTML rewriting at upload and only pays off
  for large multi-asset bundles. The dominant artifact here is a single self-contained `index.html`
  (Claude inlines assets; CSP blocks external fetches), so there is nothing heavy to protect.

S3 already returns an `ETag` per object, so this is close to header passthrough — no new storage or
hashing scheme.

### 2. Replace semantics: validate → write-new → rewrite meta → prune stale keys

An update is not a bare overwrite. `putObject` overwrites by key, so a new version with fewer or
renamed files would leave the old ones orphaned (and possibly still referenced). Ordering:

1. Validate the *entire* new upload first (same zip-slip / caps / root-`index.html` rules as create).
2. Write the new entries.
3. Rewrite `meta.json` (preserving `createdAt`, setting `updatedAt`).
4. Delete every key under `<slug>/` not in the new set.

- **Over `deleteArtifact(slug)` then normal create:** delete-first has a downtime window where the
  link 404s and, worse, a mid-write failure destroys the previous version with nothing to fall back
  to. Write-new-then-prune keeps the artifact a *superset* during the window (no downtime) and means
  a validation or mid-write failure leaves the previous version fully servable.
- This deliberately inverts ③'s "meta-last so a failed *create* leaves the slug absent": here a
  failed *update* should leave the *previous* version whole, which the same meta-ordering achieves
  because meta is only rewritten once new content is in place.

### 3. API shape: new `PUT /api/artifacts/[slug]`

Add `PUT` to the existing `[slug]` route (co-located with `DELETE`); it means "replace this slug".
`POST /api/artifacts` stays create-only (409 on conflict, unchanged). `PUT` on a non-existent slug
returns 404 — creating is POST's job.

- **Over a `POST` + `overwrite` form flag:** overloads one endpoint with two intents and invites an
  accidental overwrite from a free-text slug. Method-per-intent is clearer and the slug-in-URL can't
  drift. Reuses the same gating (same-origin + session, `runtime = 'nodejs'`) as the sibling handlers.

### 4. UX: an Update action on each artifact card → a slug-scoped dialog

The card gains an Update action opening a dialog for *that* artifact: slug shown read-only, title
prefilled, drop a new `.html`/`.zip`.

- **Over "re-upload the same slug in the shared form + confirm":** the shared form is built for
  "new" (auto-slug from filename, title defaults to slug) and a free-text slug can typo onto the
  *wrong* artifact. The card path is discoverable, can't retarget, and the deliberate
  pick-a-file-then-Replace flow is its own confirmation (no nested AlertDialog needed).
- The card is currently a 3-col action grid (Open / Copy / Delete); a 4th action needs a small
  relayout (2×2 grid or an overflow menu — see Open Questions). The dropzone logic currently lives
  inside `UploadForm`; extract it into a shared component both the create form and the update dialog
  reuse, rather than duplicating drag/drop handling.

### 5. Metadata: preserve `createdAt`, add `updatedAt`, keep title on blank

Read the previous `meta.json` first; carry its `createdAt` forward and set `updatedAt` to now. A
blank title on update keeps the existing title (create defaults blank → slug; update must not, or it
would silently wipe a title). `ArtifactMeta`/`Artifact` gain an optional `updatedAt`.

## Risks / Trade-offs

- **Viewers already served `immutable` stay pinned** → the new policy only governs responses served
  after it ships; a viewer who cached an artifact under the old header keeps it until it ages out.
  Acceptable — the switch lands before update is relied on, and traffic is low. Documented in the
  spec's REMOVED migration note.
- **Cloudflare Cache Rule behaviour** → the ① Cache Rule was "cache everything, respect origin TTL";
  it must *revalidate* against origin on `no-cache`/`max-age=0` and forward `If-None-Match`, not
  treat it as "don't cache". Mitigation: verify `cf-cache-status` and the 304 round-trip during the
  ① rollout before depending on it (this is the main operational unknown).
- **More origin hits** → revalidation costs one conditional request per view outside the `max-age`
  window vs pure edge HITs. Mitigation: a short `max-age` (e.g. 60s) gives a hot-cache window;
  traffic here is tiny regardless.
- **Prune deletes the wrong keys if the new-set diff is computed wrong** → an off-by-one in the "keep
  set" could delete live files. Mitigation: build the keep set from exactly the written entry keys
  plus `meta.json`; cover with the "removed file is pruned" and "invalid replacement leaves v1
  intact" scenarios.

## Migration Plan

1. **`artifact-server` first** — implement the ETag/`Cache-Control` change; deploy; verify response
   headers, the `If-None-Match` → 304 round-trip, and that Cloudflare revalidates (`cf-cache-status`).
   This gates everything: until it ships, updates serve stale.
2. **Main app** — add the `PUT` handler, the replace/prune helper, the `updatedAt` metadata, and the
   card Update dialog (extracting the shared dropzone). Deploy.
3. **Verify end-to-end** — upload v1, open the link, update to v2, confirm the same link serves v2 on
   next load; confirm a removed file is pruned and a failed update leaves v1 intact.

**Rollback:** the two repos are independent. Reverting the main-app change removes update (create/
delete unaffected). Reverting the `artifact-server` change restores `immutable` (updates simply stop
propagating; nothing breaks). No data migration either way — `meta.json` gaining `updatedAt` is
additive and older readers ignore it.

## Open Questions

- Exact entrypoint header: `no-cache` (freshest) vs `max-age=60, must-revalidate` (cheap hot-cache
  window). Lean `max-age=60, must-revalidate`.
- Revalidate *all* objects or only `index.html`/`meta.json`? Moot for single-file artifacts; matters
  only for multi-asset zips with stable-named assets. Simplest correct default: apply to everything.
- Surface `updatedAt` on the card ("updated X") or keep showing `createdAt`? Low stakes; decide at
  build time.
- Card layout for the 4th action: 2×2 grid vs an overflow (kebab) menu.
