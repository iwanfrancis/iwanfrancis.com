'use client'

import type { ReactNode } from 'react'
import ThemeProvider from '@/features/theme/components/theme-provider'

type AppProviderProps = {
  children: ReactNode
}

/**
 * Composes the application-wide providers. Currently just theming
 * (system default, class-based, persisted, no-flash); nest further providers
 * here as they're needed.
 */
function AppProvider({ children }: AppProviderProps) {
  return <ThemeProvider>{children}</ThemeProvider>
}

export default AppProvider
