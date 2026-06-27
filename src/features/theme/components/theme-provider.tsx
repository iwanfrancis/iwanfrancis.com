'use client'

import { ThemeProvider as NextThemeProvider } from 'next-themes'
import type { ReactNode } from 'react'

type ThemeProviderProps = {
  children: ReactNode
}

/**
 * Wraps next-themes with this site's theming policy: system default, class-based,
 * persisted across visits, and applied before first paint (no flash). Owning the
 * configuration here keeps theme concerns inside the theme feature.
 */
function ThemeProvider({ children }: ThemeProviderProps) {
  return (
    <NextThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      {children}
    </NextThemeProvider>
  )
}

export default ThemeProvider
