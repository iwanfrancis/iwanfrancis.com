import { Button } from '@/components/inputs/button/button'
import type { SocialLink } from '@/config/site'
import { cn } from '@/utils/cn'

type SocialLinksProps = {
  links: SocialLink[]
  /** Spacing/layout overrides for the wrapping row (callers differ). */
  className?: string
}

function SocialLinks({ links, className }: SocialLinksProps) {
  return (
    <div className={cn('flex items-center gap-2', className)}>
      {links.map(({ label, href, icon: Icon, external }) => (
        <Button
          key={label}
          variant="ghost"
          size="icon"
          asChild
          className="h-8 w-8"
        >
          <a
            href={href}
            aria-label={label}
            {...(external && {
              target: '_blank',
              rel: 'noopener noreferrer',
            })}
          >
            <Icon className="h-4 w-4" />
          </a>
        </Button>
      ))}
    </div>
  )
}

export default SocialLinks
