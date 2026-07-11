import { Readable } from 'node:stream'
import {
  DeleteObjectsCommand,
  GetObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3'
import { sdkStreamMixin } from '@smithy/util-stream'
import { mockClient } from 'aws-sdk-client-mock'
import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest'
import {
  deleteArtifact,
  getArtifactMeta,
  listArtifacts,
  pruneArtifact,
  putObject,
  slugExists,
} from './s3'

const s3Mock = mockClient(S3Client)

const metaBody = (meta: Record<string, unknown>) =>
  sdkStreamMixin(Readable.from([JSON.stringify(meta)]))

const notFound = () =>
  Object.assign(new Error('NoSuchKey'), {
    $metadata: { httpStatusCode: 404 },
  })

beforeAll(() => {
  vi.stubEnv('ARTIFACTS_S3_ENDPOINT', 'http://127.0.0.1:9000')
  vi.stubEnv('ARTIFACTS_S3_REGION', 'auto')
  vi.stubEnv('ARTIFACTS_S3_ACCESS_KEY_ID', 'test-key')
  vi.stubEnv('ARTIFACTS_S3_SECRET_ACCESS_KEY', 'test-secret')
  vi.stubEnv('ARTIFACTS_S3_BUCKET', 'artifacts-test')
})

afterAll(() => {
  vi.unstubAllEnvs()
})

beforeEach(() => {
  s3Mock.reset()
})

describe('slugExists', () => {
  it('asks for at most one key under the slug prefix', async () => {
    // Arrange
    s3Mock.on(ListObjectsV2Command).resolves({ KeyCount: 1 })

    // Act
    const exists = await slugExists('my-demo')

    // Assert
    expect(exists).toBe(true)
    expect(s3Mock.commandCalls(ListObjectsV2Command)[0].args[0].input).toEqual({
      Bucket: 'artifacts-test',
      Prefix: 'my-demo/',
      MaxKeys: 1,
    })
  })

  it('reports an empty prefix as free', async () => {
    s3Mock.on(ListObjectsV2Command).resolves({ KeyCount: 0 })
    expect(await slugExists('my-demo')).toBe(false)
  })
})

describe('putObject', () => {
  it('writes the key with its explicit content type', async () => {
    // Arrange
    s3Mock.on(PutObjectCommand).resolves({})
    const bytes = new TextEncoder().encode('<!doctype html>')

    // Act
    await putObject('my-demo/index.html', bytes, 'text/html')

    // Assert
    expect(s3Mock.commandCalls(PutObjectCommand)[0].args[0].input).toEqual({
      Bucket: 'artifacts-test',
      Key: 'my-demo/index.html',
      Body: bytes,
      ContentType: 'text/html',
    })
  })
})

describe('getArtifactMeta', () => {
  it('reads and returns the stored meta', async () => {
    // Arrange
    s3Mock.on(GetObjectCommand, { Key: 'my-demo/meta.json' }).resolves({
      Body: metaBody({
        slug: 'my-demo',
        title: 'My demo',
        createdAt: '2026-07-01T00:00:00.000Z',
      }),
    })

    // Act
    const meta = await getArtifactMeta('my-demo')

    // Assert
    expect(meta).toEqual({
      slug: 'my-demo',
      title: 'My demo',
      createdAt: '2026-07-01T00:00:00.000Z',
      updatedAt: undefined,
    })
  })

  it('falls back to the slug when the stored title is missing', async () => {
    // Arrange
    s3Mock.on(GetObjectCommand).resolves({
      Body: metaBody({
        slug: 'my-demo',
        createdAt: '2026-07-01T00:00:00.000Z',
      }),
    })

    // Act
    const meta = await getArtifactMeta('my-demo')

    // Assert
    expect(meta?.title).toBe('my-demo')
  })

  it.each([
    ['meta missing required fields', { title: 'only a title' }],
  ])('returns null for %s', async (_label, stored) => {
    s3Mock.on(GetObjectCommand).resolves({ Body: metaBody(stored) })
    expect(await getArtifactMeta('my-demo')).toBeNull()
  })

  it('returns null when the object has no body', async () => {
    s3Mock.on(GetObjectCommand).resolves({})
    expect(await getArtifactMeta('my-demo')).toBeNull()
  })

  it('treats a 404 as an absent artifact', async () => {
    s3Mock.on(GetObjectCommand).rejects(notFound())
    expect(await getArtifactMeta('my-demo')).toBeNull()
  })

  it('rethrows a non-404 storage error', async () => {
    s3Mock.on(GetObjectCommand).rejects(new Error('bucket down'))
    await expect(getArtifactMeta('my-demo')).rejects.toThrow('bucket down')
  })
})

describe('listArtifacts', () => {
  it('lists slug prefixes, skips broken ones, and sorts newest first', async () => {
    // Arrange
    s3Mock.on(ListObjectsV2Command).resolves({
      CommonPrefixes: [
        { Prefix: 'older/' },
        { Prefix: 'newer/' },
        { Prefix: 'broken/' },
      ],
    })
    s3Mock.on(GetObjectCommand, { Key: 'older/meta.json' }).resolves({
      Body: metaBody({
        slug: 'older',
        title: 'Older',
        createdAt: '2026-01-01T00:00:00.000Z',
      }),
    })
    s3Mock.on(GetObjectCommand, { Key: 'newer/meta.json' }).resolves({
      Body: metaBody({
        slug: 'newer',
        title: 'Newer',
        createdAt: '2026-07-01T00:00:00.000Z',
      }),
    })
    s3Mock.on(GetObjectCommand, { Key: 'broken/meta.json' }).rejects(notFound())

    // Act
    const artifacts = await listArtifacts()

    // Assert
    expect(artifacts.map((artifact) => artifact.slug)).toEqual([
      'newer',
      'older',
    ])
    expect(artifacts[0].url).toBe('https://artifacts.iwans.space/newer/')
    expect(s3Mock.commandCalls(ListObjectsV2Command)[0].args[0].input).toEqual({
      Bucket: 'artifacts-test',
      Delimiter: '/',
    })
  })
})

describe('pruneArtifact', () => {
  it('deletes only the keys not in the keep set', async () => {
    // Arrange
    s3Mock.on(ListObjectsV2Command).resolves({
      Contents: [
        { Key: 'my-demo/index.html' },
        { Key: 'my-demo/stale.js' },
        { Key: 'my-demo/meta.json' },
      ],
    })

    // Act
    await pruneArtifact(
      'my-demo',
      new Set(['my-demo/index.html', 'my-demo/meta.json'])
    )

    // Assert
    const deletes = s3Mock.commandCalls(DeleteObjectsCommand)
    expect(deletes).toHaveLength(1)
    expect(deletes[0].args[0].input.Delete?.Objects).toEqual([
      { Key: 'my-demo/stale.js' },
    ])
  })

  it('sends no delete when nothing is stale', async () => {
    // Arrange
    s3Mock.on(ListObjectsV2Command).resolves({
      Contents: [{ Key: 'my-demo/index.html' }],
    })

    // Act
    await pruneArtifact('my-demo', new Set(['my-demo/index.html']))

    // Assert
    expect(s3Mock.commandCalls(DeleteObjectsCommand)).toHaveLength(0)
  })

  it('follows pagination with the continuation token', async () => {
    // Arrange
    s3Mock
      .on(ListObjectsV2Command)
      .resolvesOnce({
        Contents: [{ Key: 'my-demo/a.js' }],
        IsTruncated: true,
        NextContinuationToken: 'page-2',
      })
      .resolvesOnce({ Contents: [{ Key: 'my-demo/b.js' }] })

    // Act
    await pruneArtifact('my-demo', new Set())

    // Assert
    const lists = s3Mock.commandCalls(ListObjectsV2Command)
    expect(lists).toHaveLength(2)
    expect(lists[1].args[0].input.ContinuationToken).toBe('page-2')
    const deletes = s3Mock.commandCalls(DeleteObjectsCommand)
    expect(deletes.map((call) => call.args[0].input.Delete?.Objects)).toEqual([
      [{ Key: 'my-demo/a.js' }],
      [{ Key: 'my-demo/b.js' }],
    ])
  })
})

describe('deleteArtifact', () => {
  it('removes every object under the slug', async () => {
    // Arrange
    s3Mock.on(ListObjectsV2Command).resolves({
      Contents: [{ Key: 'my-demo/index.html' }, { Key: 'my-demo/meta.json' }],
    })

    // Act
    await deleteArtifact('my-demo')

    // Assert
    const deletes = s3Mock.commandCalls(DeleteObjectsCommand)
    expect(deletes[0].args[0].input.Delete?.Objects).toEqual([
      { Key: 'my-demo/index.html' },
      { Key: 'my-demo/meta.json' },
    ])
  })
})
