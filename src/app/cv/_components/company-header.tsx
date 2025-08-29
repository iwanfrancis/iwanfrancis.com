import ExternalLink from '@/components/navigation/external-link/external-link'
import CompanyLogo from './company-logo'
import { cn } from '@/utils/cn'

type CompanyHeaderProps = {
  company: string
  website: string
  logoSrc: string
  subTitle: string
  className?: string
}

function CompanyHeader({
  company,
  website,
  logoSrc,
  subTitle,
  className,
}: CompanyHeaderProps) {
  return (
    <div className={cn('grid gap-x-2', className)}>
      <CompanyLogo
        src={logoSrc}
        alt={`${company} Logo`}
        className="row-span-2"
      />
      <div className="col-start-2">
        <ExternalLink href={website}>
          <h3 className="font-medium text-xl col-start-2">{company}</h3>
        </ExternalLink>
      </div>
      <p className="text-sm text-muted-foreground col-start-2">{subTitle}</p>
    </div>
  )
}

export default CompanyHeader
