'use client'

import useMountEffect from '@/hooks/use-mount-effect/use-mount-effect'
import { isTouchScreen } from '@/utils/device'
import { useRef } from 'react'

function BackgroundHoverEffect() {
  const overlayRef = useRef<HTMLDivElement>(null)

  useMountEffect(() => {
    const overlay = overlayRef.current

    if (!overlay || !window || isTouchScreen()) return

    const handleMouseMove = (event: MouseEvent) => {
      const { clientX, clientY } = event
      overlay.style.transform = `translate(${clientX}px, ${clientY}px)`
    }

    window.addEventListener('mousemove', handleMouseMove)

    // Adding the mask class once we are confident that user isn't on a touch screen
    overlay.classList.add('bg-hover-effect-mask')

    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
    }
  })

  return <div ref={overlayRef} className="bg-hover-effect-overlay" />
}

export default BackgroundHoverEffect
