'use client'

import {
  Collapsible,
  CollapsibleTrigger,
} from '@/components/layout/collapsible/collapsible'
import { ReactNode, useState } from 'react'
import { CollapsibleContent } from '@radix-ui/react-collapsible'
import { cn } from '@/utils/cn'
import CompanyLogo from './company-logo'
import ExternalLink from '@/components/navigation/external-link/external-link'
import { Button } from '@/components/inputs/button/button'
import { ChevronDown } from 'lucide-react'

type CompanySectionProps = {
  company: string
  website: string
  logoSrc: string
  subTitle: string
  summary?: string
  className?: string
  children: ReactNode | ReactNode[]
}

function CompanySection({
  company,
  website,
  logoSrc,
  subTitle,
  summary,
  className,
  children,
}: CompanySectionProps) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} asChild>
      <section className={cn('flex flex-col items-center', className)}>
        <div className="w-fit grid grid-cols-[min-content_auto] gap-x-2 md:gap-x-4">
          <CompanyLogo
            src={logoSrc}
            alt={`${company} Logo`}
            className="row-span-2 h-11 w-11 md:h-12 md:w-12"
          />
          <div className="col-start-2 ">
            <ExternalLink href={website}>
              <h3 className="font-medium text-md md:text-xl col-start-2">
                {company}
              </h3>
            </ExternalLink>
          </div>

          <p className="text-xs md:text-sm text-muted-foreground col-start-2">
            {subTitle}
          </p>

          {summary && (
            <p className="my-2 text-sm col-span-2 md:col-span-1 md:col-start-2">
              {summary}
            </p>
          )}

          <CollapsibleContent className="mb-4 text-sm col-span-2 md:col-span-1 md:col-start-2">
            {children}
          </CollapsibleContent>
        </div>
        <CollapsibleTrigger asChild>
          <Button
            variant="ghost"
            size="xs"
            className="text-muted-foreground col-span-2"
          >
            {isOpen ? 'see less' : 'see more'}
          </Button>
        </CollapsibleTrigger>
      </section>
    </Collapsible>
  )
}

export default CompanySection
