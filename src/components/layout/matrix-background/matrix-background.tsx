'use client'

import useMountEffect from '@/hooks/use-mount-effect/use-mount-effect'
import { cn } from '@/utils/cn'
import { isTouchScreen } from '@/utils/device'
import { useRef } from 'react'

type MatrixBackgroundProps = {
  children: React.ReactNode
  className?: string
}

function MatrixBackground({ children, className }: MatrixBackgroundProps) {
  const overlayRef = useRef<HTMLDivElement>(null)

  useMountEffect(() => {
    const overlay = overlayRef.current

    if (!overlay || !window || isTouchScreen()) return

    const handleMouseMove = (event: MouseEvent) => {
      const { clientX, clientY } = event
      const scrollX = window.scrollX || window.pageXOffset
      const scrollY = window.scrollY || window.pageYOffset
      overlay.style.transform = `translate(${clientX + scrollX}px, ${clientY + scrollY}px)`
    }

    window.addEventListener('mousemove', handleMouseMove)

    // Adding the mask class once we are confident that user isn't on a touch screen
    overlay.classList.add('bg-hover-effect-mask')

    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
    }
  })

  return (
    <div className={cn('bg-matrix relative overflow-hidden', className)}>
      <div ref={overlayRef} className="bg-hover-effect-overlay" />
      <div className="relative z-20">{children}</div>
    </div>
  )
}

export default MatrixBackground
