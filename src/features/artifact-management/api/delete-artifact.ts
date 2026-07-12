import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { Artifact } from '@/features/artifact-management/types/artifact'
import { UnauthorizedError } from '@/lib/react-query'
import { artifactsQueryKey } from './get-artifacts'

async function deleteArtifact(slug: string): Promise<void> {
  const response = await fetch(`/api/artifacts/${slug}`, { method: 'DELETE' })
  if (response.ok) return
  if (response.status === 401) throw new UnauthorizedError()
  throw new Error('Delete failed.')
}

type DeleteContext = { previous: Artifact[] | undefined }

/**
 * Deletes an artifact optimistically: the card is removed from the cached list
 * on `onMutate`, before the request resolves. If the request fails, `onError`
 * restores the snapshot so the card reappears — the visible rollback is the
 * failure feedback (there is no toast layer). `onSettled` reconciles with the
 * server either way.
 */
export function useDeleteArtifact() {
  const queryClient = useQueryClient()
  return useMutation<void, Error, string, DeleteContext>({
    mutationFn: deleteArtifact,
    onMutate: async (slug) => {
      // Cancel in-flight list fetches so they can't clobber the optimistic write.
      await queryClient.cancelQueries({ queryKey: artifactsQueryKey })
      const previous = queryClient.getQueryData<Artifact[]>(artifactsQueryKey)
      queryClient.setQueryData<Artifact[]>(artifactsQueryKey, (current) =>
        current?.filter((artifact) => artifact.slug !== slug)
      )
      return { previous }
    },
    onError: (_error, _slug, context) => {
      if (context?.previous) {
        queryClient.setQueryData(artifactsQueryKey, context.previous)
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: artifactsQueryKey })
    },
  })
}
