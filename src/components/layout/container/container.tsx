import PolymorphicProps from '@/types/polymorphic-as-props'
import { cn } from '@/utils/cn'
import { ElementType, ReactNode } from 'react'

const defaultElement = 'div'

type ContainerProps<E extends ElementType = typeof defaultElement> =
  PolymorphicProps<E> & {
    children: ReactNode
    rootClassName?: string
    className?: string
  }

function Container<E extends ElementType = typeof defaultElement>({
  as,
  children,
  rootClassName,
  className,
}: ContainerProps<E>) {
  const Component = as ?? defaultElement

  return (
    <Component
      className={cn('mx-auto max-w-7xl px-4 sm:px-6 lg:px-8', rootClassName)}
    >
      <div className={cn('mx-auto max-w-4xl', className)}>{children}</div>
    </Component>
  )
}

export default Container
