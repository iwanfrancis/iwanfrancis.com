'use client'

import Link from 'next/link'
import { type ReactNode, useEffect, useState } from 'react'
import Container from '@/components/layout/container/container'
import type { NavLink } from '@/config/site'
import { cn } from '@/utils/cn'
import NavMenu from './nav-menu'

type HeaderProps = {
  /** Brand mark rendered inside the homepage link. */
  logo?: ReactNode
  /** In-page nav links rendered between the logo and actions. */
  links?: NavLink[]
  /** Slot for site-wide actions (e.g. the theme toggle), rendered after the nav links. */
  actions?: ReactNode
}

function Header({ logo, links = [], actions }: HeaderProps) {
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
          {logo}
        </Link>
        <div className="flex items-center gap-2">
          {actions}
          <NavMenu links={links} />
        </div>
      </Container>
    </nav>
  )
}

export default Header
