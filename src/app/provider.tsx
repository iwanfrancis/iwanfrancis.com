'use client'

import { QueryClientProvider } from '@tanstack/react-query'
import { type ReactNode, useState } from 'react'
import ThemeProvider from '@/features/theme/components/theme-provider'
import { makeQueryClient } from '@/lib/react-query'

type AppProviderProps = {
  children: ReactNode
}

/**
 * Composes the application-wide providers: TanStack Query (one client per
 * browser session via `useState`, so it is never shared across server requests)
 * and theming (system default, class-based, persisted, no-flash). Nest further
 * providers here as they're needed.
 */
function AppProvider({ children }: AppProviderProps) {
  const [queryClient] = useState(makeQueryClient)

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>{children}</ThemeProvider>
    </QueryClientProvider>
  )
}

export default AppProvider
