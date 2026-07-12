'use client'

import type { Artifact } from '@/features/artifact-management/types/artifact'
import { useArtifacts } from '../api/get-artifacts'
import ArtifactCard from './artifact-card'

/**
 * Live listing of hosted artifacts. Seeded from the server render via
 * `initialData` (no loading flash on first paint), then kept current by the
 * query — refetch on window focus and after mutations. Read errors are the
 * query's own concern now, so this owns the failure message too.
 */
export default function ArtifactList({
  initialData,
}: {
  initialData?: Artifact[]
}) {
  const query = useArtifacts(initialData)

  if (query.isPending) {
    return <p className="text-muted-foreground text-sm">Loading artifacts…</p>
  }

  if (query.isError) {
    return (
      <p role="alert" className="text-destructive text-sm">
        Couldn’t load the artifact list — check the bucket configuration.
      </p>
    )
  }

  if (query.data.length === 0) {
    return (
      <p className="text-muted-foreground text-sm">
        No artifacts yet. Upload one above to get started.
      </p>
    )
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      {query.data.map((artifact) => (
        <ArtifactCard key={artifact.slug} artifact={artifact} />
      ))}
    </div>
  )
}
