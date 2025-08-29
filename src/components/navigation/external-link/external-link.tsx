import { cn } from '@/utils/cn'
import { ExternalLink as ExternalLinkIcon } from 'lucide-react'

type ExternalLinkProps = React.AnchorHTMLAttributes<HTMLAnchorElement>

function ExternalLink({ children, className, ...props }: ExternalLinkProps) {
  return (
    <a
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        'inline-flex gap-1 items-center hover:text-foreground/80 rounded',
        className
      )}
      {...props}
    >
      {children}
      <ExternalLinkIcon className="h-[1em] w-[1em]" />
    </a>
  )
}

export default ExternalLink
