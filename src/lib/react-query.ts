import { MutationCache, QueryCache, QueryClient } from '@tanstack/react-query'

/**
 * Thrown by a query/mutation fetcher when the API answers 401 — the admin
 * session expired while the page was open. Lives in this shared layer (not the
 * feature) so the global handler below can recognise it without `lib/`
 * importing from `features/`; feature fetchers import it back from here.
 */
export class UnauthorizedError extends Error {
  constructor(message = 'unauthorized') {
    super(message)
    this.name = 'UnauthorizedError'
  }
}

/** Send an expired-session admin back to login, preserving where they were. */
function redirectToLogin() {
  if (typeof window === 'undefined') return
  if (window.location.pathname === '/login') return
  const next = encodeURIComponent(
    window.location.pathname + window.location.search
  )
  window.location.assign(`/login?next=${next}`)
}

function handleError(error: unknown) {
  if (error instanceof UnauthorizedError) redirectToLogin()
}

/**
 * Builds the app's QueryClient. A single error handler on both caches
 * centralises the "session dead → login" rule so every query and mutation
 * inherits it, and query retries skip an `UnauthorizedError` so a 401 bounces
 * promptly instead of retrying first.
 */
export function makeQueryClient(): QueryClient {
  return new QueryClient({
    queryCache: new QueryCache({ onError: handleError }),
    mutationCache: new MutationCache({ onError: handleError }),
    defaultOptions: {
      queries: {
        retry: (failureCount, error) =>
          !(error instanceof UnauthorizedError) && failureCount < 1,
      },
    },
  })
}
