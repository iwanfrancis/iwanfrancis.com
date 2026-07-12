import { useMutation, useQueryClient } from '@tanstack/react-query'
import { UnauthorizedError } from '@/lib/react-query'
import { artifactsQueryKey } from './get-artifacts'

export type UpdateArtifactVars = {
  slug: string
  file: File
  title: string
}

/**
 * Replaces an existing artifact's files via `PUT /api/artifacts/<slug>`. Throws
 * `UnauthorizedError` on 401 (global handler bounces to login); otherwise
 * surfaces the server's error message, falling back to a generic one.
 */
async function updateArtifact(vars: UpdateArtifactVars): Promise<void> {
  const body = new FormData()
  body.set('file', vars.file)
  body.set('title', vars.title)

  const response = await fetch(`/api/artifacts/${vars.slug}`, {
    method: 'PUT',
    body,
  })
  if (response.ok) return
  if (response.status === 401) throw new UnauthorizedError()

  const data = (await response.json().catch(() => null)) as {
    error?: string
  } | null
  throw new Error(data?.error ?? 'Update failed.')
}

export function useUpdateArtifact() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: updateArtifact,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: artifactsQueryKey })
    },
  })
}
