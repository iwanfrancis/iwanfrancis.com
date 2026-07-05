import Link from 'next/link'
import type { ComponentProps } from 'react'
import ExternalLink from '@/components/navigation/external-link/external-link'
import type { NavLink } from '@/config/site'

type NavLinkItemProps = ComponentProps<'a'> & {
  /** The nav entry to render. External entries open in a new tab with a ↗ affordance. */
  link: NavLink
}

/**
 * Renders one nav entry as a link. Spreads all remaining props (and its ref) onto the
 * underlying anchor so it works as the child of Radix `asChild` — the dropdown item and
 * sheet close clone it and inject their behaviour, ref, and styling. External away-links
 * reuse `ExternalLink` for the shared new-tab + safe-rel + ↗ affordance.
 */
function NavLinkItem({ link, ...props }: NavLinkItemProps) {
  if (link.external) {
    return (
      <ExternalLink {...props} href={link.href}>
        {link.label}
      </ExternalLink>
    )
  }

  return (
    <Link {...props} href={link.href}>
      {link.label}
    </Link>
  )
}

export default NavLinkItem
