/** A hosted artifact as surfaced to the admin UI. */
export type Artifact = {
  slug: string
  title: string
  /** ISO-8601 UTC timestamp. */
  createdAt: string
  /** Public share URL served by artifact-server. */
  url: string
}

/**
 * Shape persisted to `<slug>/meta.json`, per the artifact-hosting storage
 * contract (bucket is the sole source of truth — there is no database).
 */
export type ArtifactMeta = {
  slug: string
  title: string
  createdAt: string
}

/** Successful-upload payload returned by the upload endpoint. */
export type UploadSuccess = {
  slug: string
  url: string
}
