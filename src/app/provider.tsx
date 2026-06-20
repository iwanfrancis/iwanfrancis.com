'use client'

import { ThemeProvider } from 'next-themes'
import type { ReactNode } from 'react'

type AppProviderProps = {
  children: ReactNode
}

/**
 * Composes the application-wide providers. Currently just theming
 * (system default, class-based, persisted, no-flash); nest further providers
 * here as they're needed.
 */
function AppProvider({ children }: AppProviderProps) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      {children}
    </ThemeProvider>
  )
}

export default AppProvider
