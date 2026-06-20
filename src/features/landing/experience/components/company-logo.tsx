import Image from 'next/image'
import { cn } from '@/utils/cn'

type CompanyLogoProps = {
  src: string
  alt: string
  className?: string
}

function CompanyLogo({ src, alt, className }: CompanyLogoProps) {
  return (
    <div
      className={cn(
        'w-12 h-12 rounded-md relative shadow-lg border',
        className
      )}
    >
      <Image src={src} alt={alt} fill className="p-2" />
    </div>
  )
}

export default CompanyLogo
