import type { Artifact } from '@/features/artifact-management/types/artifact'
import ArtifactCard from './artifact-card'

export default function ArtifactList({ artifacts }: { artifacts: Artifact[] }) {
  if (artifacts.length === 0) {
    return (
      <p className="text-muted-foreground text-sm">
        No artifacts yet. Upload one above to get started.
      </p>
    )
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      {artifacts.map((artifact) => (
        <ArtifactCard key={artifact.slug} artifact={artifact} />
      ))}
    </div>
  )
}
