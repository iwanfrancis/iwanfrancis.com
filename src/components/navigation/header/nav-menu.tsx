'use client'

import { Menu } from 'lucide-react'
import { Button } from '@/components/inputs/button/button'
import { Separator } from '@/components/layout/seperator/separator'
import {
  Dropdown,
  DropdownContent,
  DropdownItem,
  DropdownSeparator,
  DropdownTrigger,
} from '@/components/navigation/dropdown/dropdown'
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/navigation/sheet/sheet'
import type { NavLink } from '@/config/site'
import NavLinkItem from './nav-link-item'

type NavMenuProps = {
  /** Nav links to render; external ones open in a new tab and group below a separator. */
  links: NavLink[]
}

const sheetLinkClass =
  'flex items-center gap-1 rounded-md px-2 py-2 text-md cursor-pointer outline-none hover:bg-accent hover:text-accent-foreground focus-visible:bg-accent'

/**
 * The header's nav control: a single burger that opens a dropdown on desktop and a
 * right-side sheet on mobile. Both surfaces render the same link list from `links`,
 * with external away-links grouped below a separator.
 */
function NavMenu({ links }: NavMenuProps) {
  const internalLinks = links.filter((link) => !link.external)
  const externalLinks = links.filter((link) => link.external)

  return (
    <>
      {/* Desktop: dropdown anchored to the trigger */}
      <div className="hidden md:block">
        <Dropdown>
          <DropdownTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Open navigation menu"
            >
              <Menu />
            </Button>
          </DropdownTrigger>
          <DropdownContent align="end">
            {internalLinks.map((link) => (
              <DropdownItem key={link.href} asChild className="cursor-pointer">
                <NavLinkItem link={link} />
              </DropdownItem>
            ))}
            {externalLinks.length > 0 && <DropdownSeparator />}
            {externalLinks.map((link) => (
              <DropdownItem key={link.href} asChild className="cursor-pointer">
                <NavLinkItem link={link} />
              </DropdownItem>
            ))}
          </DropdownContent>
        </Dropdown>
      </div>

      {/* Mobile: sheet sliding in from the right */}
      <div className="md:hidden">
        <Sheet>
          <SheetTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Open navigation menu"
            >
              <Menu />
            </Button>
          </SheetTrigger>
          <SheetContent side="right" aria-describedby={undefined}>
            <SheetHeader>
              <SheetTitle className="sr-only">Navigation</SheetTitle>
            </SheetHeader>
            <nav className="flex flex-col gap-1 px-4">
              {internalLinks.map((link) => (
                <SheetClose key={link.href} asChild>
                  <NavLinkItem link={link} className={sheetLinkClass} />
                </SheetClose>
              ))}
              {externalLinks.length > 0 && <Separator className="my-2" />}
              {externalLinks.map((link) => (
                <SheetClose key={link.href} asChild>
                  <NavLinkItem link={link} className={sheetLinkClass} />
                </SheetClose>
              ))}
            </nav>
          </SheetContent>
        </Sheet>
      </div>
    </>
  )
}

export default NavMenu
