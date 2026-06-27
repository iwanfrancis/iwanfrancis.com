import type { ReactNode } from 'react'
import Container from '@/components/layout/container/container'
import SocialLinks from '@/components/navigation/social-links/social-links'
import type { SocialLink } from '@/config/site'
import ScrollToTopButton from './scroll-to-top-button'

type FooterProps = {
  /** Social / contact links rendered in the footer row. */
  socials?: SocialLink[]
  /** Slot for site-wide actions (e.g. the theme toggle), rendered before scroll-to-top. */
  actions?: ReactNode
}

function Footer({ socials = [], actions }: FooterProps) {
  return (
    <footer className="bg-background p-2 md:p-6">
      <Container className="flex flex-row items-center gap-4 justify-center">
        <div className="flex items-center gap-2">
          <SocialLinks links={socials} />
          {actions}
          <ScrollToTopButton />
        </div>
      </Container>
    </footer>
  )
}

export default Footer
