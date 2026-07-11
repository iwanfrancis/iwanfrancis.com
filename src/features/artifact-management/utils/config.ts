/**
 * Upload caps, the public artifacts origin, and the (lazily read) S3 bucket
 * connection for the artifact-management feature.
 */

/** Bounds on an upload, enforced against uncompressed content. Tune freely. */
export const UPLOAD_LIMITS = {
  /** Max total uncompressed size across all entries. */
  maxTotalBytes: 25 * 1024 * 1024,
  /** Max size of any single entry. */
  maxFileBytes: 10 * 1024 * 1024,
  /** Max number of files in a .zip bundle. */
  maxEntries: 200,
} as const

/** Public origin that serves artifact content (the artifact-server service). */
export const ARTIFACTS_BASE_URL = 'https://artifacts.iwans.space'

/** Public share URL for a slug (trailing slash resolves to its index.html). */
export function artifactUrl(slug: string): string {
  return `${ARTIFACTS_BASE_URL}/${slug}/`
}

export type S3Config = {
  endpoint: string
  region: string
  accessKeyId: string
  secretAccessKey: string
  bucket: string
  forcePathStyle: boolean
}

function required(name: string): string {
  const value = process.env[name]
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`)
  }
  return value
}

let cached: S3Config | undefined

/**
 * Read the bucket connection from the environment on first use, memoised.
 * Deliberately lazy: reading at module load would throw during `next build`
 * (which evaluates route modules while the vars may be unset), whereas this
 * only fails a request that actually touches the store — with a clear message.
 */
export function getS3Config(): S3Config {
  if (!cached) {
    cached = {
      endpoint: required('ARTIFACTS_S3_ENDPOINT'),
      region: required('ARTIFACTS_S3_REGION'),
      accessKeyId: required('ARTIFACTS_S3_ACCESS_KEY_ID'),
      secretAccessKey: required('ARTIFACTS_S3_SECRET_ACCESS_KEY'),
      bucket: required('ARTIFACTS_S3_BUCKET'),
      forcePathStyle: process.env.ARTIFACTS_S3_FORCE_PATH_STYLE === 'true',
    }
  }
  return cached
}
