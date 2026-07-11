import {
  DeleteObjectsCommand,
  GetObjectCommand,
  ListObjectsV2Command,
  NoSuchKey,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3'
import type { Artifact, ArtifactMeta } from '../types/artifact'
import { artifactUrl, getS3Config } from './config'

/**
 * Bucket wrappers for the write side of the artifact-hosting contract. The
 * client is built lazily (and memoised) from the env so importing this module
 * has no side effects — see `getS3Config`. This reuses the same bucket/key as
 * artifact-server; that service stays read-only, so writes only ever happen
 * here, behind the admin gate.
 */

let client: S3Client | undefined

function getClient(): S3Client {
  if (!client) {
    const config = getS3Config()
    client = new S3Client({
      endpoint: config.endpoint,
      region: config.region,
      forcePathStyle: config.forcePathStyle,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
    })
  }
  return client
}

function isNotFound(error: unknown): boolean {
  if (error instanceof NoSuchKey) {
    return true
  }
  const metadata = (error as { $metadata?: { httpStatusCode?: number } })
    .$metadata
  return metadata?.httpStatusCode === 404
}

/** True if any object already lives under `<slug>/` (duplicate-slug guard). */
export async function slugExists(slug: string): Promise<boolean> {
  const { bucket } = getS3Config()
  const response = await getClient().send(
    new ListObjectsV2Command({
      Bucket: bucket,
      Prefix: `${slug}/`,
      MaxKeys: 1,
    })
  )
  return (response.KeyCount ?? 0) > 0
}

/** Write a single object with an explicit content type. */
export async function putObject(
  key: string,
  body: Uint8Array,
  contentType: string
): Promise<void> {
  const { bucket } = getS3Config()
  await getClient().send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: body,
      ContentType: contentType,
    })
  )
}

async function readArtifactMeta(prefix: string): Promise<Artifact | null> {
  const { bucket } = getS3Config()
  try {
    const response = await getClient().send(
      new GetObjectCommand({ Bucket: bucket, Key: `${prefix}meta.json` })
    )
    if (!response.Body) {
      return null
    }
    const meta = JSON.parse(
      await response.Body.transformToString()
    ) as Partial<ArtifactMeta>
    if (typeof meta.slug !== 'string' || typeof meta.createdAt !== 'string') {
      return null
    }
    return {
      slug: meta.slug,
      title: meta.title || meta.slug,
      createdAt: meta.createdAt,
      url: artifactUrl(meta.slug),
    }
  } catch (error) {
    // A prefix with no (or unreadable) meta.json is a partial/foreign upload —
    // skip it rather than failing the whole listing.
    if (isNotFound(error)) {
      return null
    }
    throw error
  }
}

/**
 * List hosted artifacts by reading each `<slug>/meta.json`. Uses a `/`
 * delimiter so the top level enumerates slug prefixes. Single page (up to 1000
 * slugs) — ample for this use.
 */
export async function listArtifacts(): Promise<Artifact[]> {
  const { bucket } = getS3Config()
  const listing = await getClient().send(
    new ListObjectsV2Command({ Bucket: bucket, Delimiter: '/' })
  )
  const prefixes = (listing.CommonPrefixes ?? [])
    .map((entry) => entry.Prefix)
    .filter((prefix): prefix is string => Boolean(prefix))

  const artifacts = await Promise.all(prefixes.map(readArtifactMeta))
  return artifacts
    .filter((artifact): artifact is Artifact => artifact !== null)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}

/** Remove every object under `<slug>/` (batched, paginated). Idempotent. */
export async function deleteArtifact(slug: string): Promise<void> {
  const { bucket } = getS3Config()
  let continuationToken: string | undefined
  do {
    const listing = await getClient().send(
      new ListObjectsV2Command({
        Bucket: bucket,
        Prefix: `${slug}/`,
        ContinuationToken: continuationToken,
      })
    )
    const objects = (listing.Contents ?? [])
      .map((object) => object.Key)
      .filter((key): key is string => Boolean(key))
      .map((Key) => ({ Key }))
    if (objects.length > 0) {
      await getClient().send(
        new DeleteObjectsCommand({
          Bucket: bucket,
          Delete: { Objects: objects },
        })
      )
    }
    continuationToken = listing.IsTruncated
      ? listing.NextContinuationToken
      : undefined
  } while (continuationToken)
}
