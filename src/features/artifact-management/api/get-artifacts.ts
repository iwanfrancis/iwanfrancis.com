import { useQuery } from '@tanstack/react-query'
import type { Artifact } from '@/features/artifact-management/types/artifact'
import { UnauthorizedError } from '@/lib/react-query'

/** Query key for the hosted-artifacts listing. */
export const artifactsQueryKey = ['artifacts'] as const

/**
 * Fetches the listing from the gated `GET /api/artifacts`. Throws
 * `UnauthorizedError` on 401 so the global handler can bounce an expired session
 * to login; any other non-OK response is a generic error the query surfaces.
 */
export async function fetchArtifacts(): Promise<Artifact[]> {
  const response = await fetch('/api/artifacts')
  if (response.status === 401) {
    throw new UnauthorizedError()
  }
  if (!response.ok) {
    throw new Error('Could not load artifacts')
  }
  const data = (await response.json()) as { artifacts: Artifact[] }
  return data.artifacts
}

/**
 * Reads the hosted-artifacts listing. Seeded from the server render via
 * `initialData` so first paint has no loading state; then kept current by
 * refetch-on-window-focus (default-on). No polling. A 30s `staleTime` stops the
 * seeded data being treated as stale the instant it mounts, which would fire a
 * redundant refetch right after SSR.
 */
export function useArtifacts(initialData?: Artifact[]) {
  return useQuery({
    queryKey: artifactsQueryKey,
    queryFn: fetchArtifacts,
    initialData,
    staleTime: 30_000,
  })
}
