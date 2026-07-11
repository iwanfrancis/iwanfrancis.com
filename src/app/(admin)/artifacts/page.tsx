import type { Metadata } from 'next'
import ArtifactList from '@/features/artifact-management/components/artifact-list'
import UploadForm from '@/features/artifact-management/components/upload-form'
import type { Artifact } from '@/features/artifact-management/types/artifact'
import { listArtifacts } from '@/features/artifact-management/utils/s3'
import LogoutButton from '@/features/auth/components/logout-button'
import ProtectedRoute from '@/features/auth/components/protected-route'

export const metadata: Metadata = {
  title: 'Artifacts · Admin',
}

/**
 * Fetches the listing server-side (only reached once ProtectedRoute has cleared
 * the session). Tolerates a listing failure — e.g. the bucket env not being
 * configured locally — so the upload form still renders.
 */
async function Dashboard() {
  let artifacts: Artifact[] = []
  let listingFailed = false
  try {
    artifacts = await listArtifacts()
  } catch (error) {
    console.error('Could not load artifacts', error)
    listingFailed = true
  }

  return (
    <div className="flex w-full max-w-3xl flex-col gap-6">
      <header className="bg-card text-card-foreground flex items-center justify-between gap-4 rounded-xl border p-6 shadow-lg">
        <div className="flex flex-col gap-1">
          <h1 className="text-xl font-semibold">Artifacts</h1>
          <p className="text-muted-foreground text-sm">
            Upload and manage hosted artifacts.
          </p>
        </div>
        <LogoutButton />
      </header>

      <section className="bg-card text-card-foreground flex flex-col gap-4 rounded-xl border p-6 shadow-lg">
        <h2 className="text-base font-semibold">Upload</h2>
        <UploadForm />
      </section>

      <section className="bg-card text-card-foreground flex flex-col gap-4 rounded-xl border p-6 shadow-lg">
        <h2 className="text-base font-semibold">Hosted</h2>
        {listingFailed ? (
          <p role="alert" className="text-destructive text-sm">
            Couldn’t load the artifact list — check the bucket configuration.
          </p>
        ) : (
          <ArtifactList artifacts={artifacts} />
        )}
      </section>
    </div>
  )
}

/**
 * Gated admin surface for hosted artifacts: upload a `.html` or `.zip`, and
 * view/copy/delete what's hosted. `ProtectedRoute` re-verifies the session
 * server-side rather than resting on the middleware alone.
 */
export default function ArtifactsPage() {
  return (
    <ProtectedRoute redirectTo="/login?next=/artifacts">
      <Dashboard />
    </ProtectedRoute>
  )
}
