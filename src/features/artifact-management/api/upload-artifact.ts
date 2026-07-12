import { useMutation, useQueryClient } from '@tanstack/react-query'
import { UnauthorizedError } from '@/lib/react-query'
import { artifactsQueryKey } from './get-artifacts'

export type UploadArtifactVars = {
  file: File
  slug: string
  title: string
}

/**
 * Uploads a new artifact via `POST /api/artifacts`. Throws `UnauthorizedError`
 * on 401 (global handler bounces to login); otherwise surfaces the server's
 * error message, falling back to a generic one.
 */
async function uploadArtifact(vars: UploadArtifactVars): Promise<void> {
  const body = new FormData()
  body.set('file', vars.file)
  body.set('slug', vars.slug)
  body.set('title', vars.title)

  const response = await fetch('/api/artifacts', { method: 'POST', body })
  if (response.ok) return
  if (response.status === 401) throw new UnauthorizedError()

  const data = (await response.json().catch(() => null)) as {
    error?: string
  } | null
  throw new Error(data?.error ?? 'Upload failed.')
}

export function useUploadArtifact() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: uploadArtifact,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: artifactsQueryKey })
    },
  })
}
