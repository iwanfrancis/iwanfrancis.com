'use client'

import { ArrowUp } from 'lucide-react'
import { Button } from '@/components/inputs/button/button'

function ScrollToTopButton() {
  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    })
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={scrollToTop}
      className="h-8 w-8 hover:cursor-pointer"
      aria-label="Back to top"
    >
      <ArrowUp className="h-4 w-4" />
    </Button>
  )
}

export default ScrollToTopButton
