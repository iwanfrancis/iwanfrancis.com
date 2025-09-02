'use client'

import { Button } from '@/components/inputs/button/button'
import Container from '@/components/layout/container/container'
import Logo from '@/components/navigation/header/logo'
import { cn } from '@/utils/cn'
import Link from 'next/link'
import { useEffect, useState } from 'react'

function Header() {
  const [isAtTop, setIsAtTop] = useState(true)

  useEffect(() => {
    const handleScroll = () => {
      setIsAtTop(window.scrollY === 0)
    }

    window.addEventListener('scroll', handleScroll)

    return () => {
      window.removeEventListener('scroll', handleScroll)
    }
  }, [])

  return (
    <nav
      className={cn('z-50 w-full bg-background fixed top-0 transition-shadow', {
        'shadow-md': !isAtTop,
      })}
    >
      <Container className="flex justify-between items-center p-2 px-4">
        <Link
          href="/"
          aria-label="Iwan Francis - Go to homepage"
          className="rounded-md"
        >
          <Logo />
        </Link>
        <div className="flex items-center gap-2">
          <Button variant="ghost" className="text-md" asChild>
            <Link href="/">Home</Link>
          </Button>
          <Button variant="ghost" className="text-md" asChild>
            <Link href="/cv">Work</Link>
          </Button>
        </div>
      </Container>
    </nav>
  )
}

export default Header
