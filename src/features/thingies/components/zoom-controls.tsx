'use client'

import { Minus, Plus } from 'lucide-react'
import { Button } from '@/components/inputs/button/button'

type ZoomControlsProps = {
  onZoomIn: () => void
  onZoomOut: () => void
}

/**
 * Accessible zoom controls for the canvas: focusable, labelled buttons so the
 * surface can be zoomed without a wheel, trackpad, or touch gesture. They sit
 * above the layers and capture their own pointer events, so clicking them never
 * starts a pan.
 */
function ZoomControls({ onZoomIn, onZoomOut }: ZoomControlsProps) {
  return (
    <div
      className="pointer-events-auto absolute right-4 bottom-4 z-30 flex flex-col gap-2"
      // Don't let a press on the controls begin a drag on the canvas behind them.
      onPointerDown={(e) => e.stopPropagation()}
    >
      <Button
        variant="outline"
        size="icon"
        onClick={onZoomIn}
        aria-label="Zoom in"
      >
        <Plus />
      </Button>
      <Button
        variant="outline"
        size="icon"
        onClick={onZoomOut}
        aria-label="Zoom out"
      >
        <Minus />
      </Button>
    </div>
  )
}

export default ZoomControls
