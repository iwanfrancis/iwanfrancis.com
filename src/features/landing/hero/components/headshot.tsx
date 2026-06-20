import Image from 'next/image'
import { cn } from '@/utils/cn'

type HeadshotProps = {
  className?: string
}

function Headshot({ className }: HeadshotProps) {
  return (
    <div
      className={cn(
        'relative rounded-full overflow-hidden shadow-md w-40 h-40 md:w-48 md:h-48',
        className
      )}
    >
      <Image
        src="/images/headshot.jpg"
        alt="Headshot of Iwan Francis"
        fill
        sizes="(max-width: 768px) 160px, 192px"
      />
    </div>
  )
}

export default Headshot
