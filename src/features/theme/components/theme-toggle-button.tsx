'use client'

import { Moon, Sun } from 'lucide-react'
import { Button } from '@/components/inputs/button/button'
import useThemeToggle from '../hooks/use-theme-toggle'

function ThemeToggleButton() {
  const toggleTheme = useThemeToggle()

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggleTheme}
      className="relative h-8 w-8 hover:cursor-pointer"
      aria-label="Toggle theme"
    >
      <Moon className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
      <Sun className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
    </Button>
  )
}

export default ThemeToggleButton
