import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { type RenderOptions, render } from '@testing-library/react'
import type { ReactElement, ReactNode } from 'react'

type Options = {
  /** Supply a preconfigured client (e.g. `makeQueryClient`) to test its behaviour. */
  client?: QueryClient
  renderOptions?: Omit<RenderOptions, 'wrapper'>
}

/**
 * Renders a UI inside a fresh `QueryClientProvider` so components that use
 * queries/mutations work under test. Retries are off by default, so a failed
 * request fails the test immediately instead of backing off. Returns the RTL
 * result plus the `client`, so a test can seed the cache or assert on it.
 */
export function renderWithClient(ui: ReactElement, options: Options = {}) {
  const client =
    options.client ??
    new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    })

  function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>
  }

  return {
    client,
    ...render(ui, { wrapper: Wrapper, ...options.renderOptions }),
  }
}
