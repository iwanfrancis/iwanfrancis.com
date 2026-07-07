import type { Metadata } from 'next'
import LogoutButton from '@/features/auth/components/logout-button'
import ProtectedRoute from '@/features/auth/components/protected-route'

export const metadata: Metadata = {
  title: 'Artifacts · Admin',
}

/**
 * Gated admin landing page, wrapped in `ProtectedRoute` so it re-verifies the
 * session server-side rather than resting on the middleware alone. This change
 * ships only an empty shell to prove the login → view → logout loop; upload,
 * listing, and management arrive in the artifact-management change.
 */
export default function ArtifactsPage() {
  return (
    <ProtectedRoute redirectTo="/login?next=/artifacts">
      <div className="bg-background/80 flex w-full max-w-lg flex-col gap-6 rounded-xl border p-8 shadow-lg backdrop-blur">
        <div className="flex flex-col gap-1">
          <h1 className="text-xl font-semibold">Artifacts</h1>
          <p className="text-muted-foreground text-sm">
            You’re signed in. Upload and management arrive in a later change.
          </p>
        </div>
        <div className="self-start">
          <LogoutButton />
        </div>
      </div>
    </ProtectedRoute>
  )
}
