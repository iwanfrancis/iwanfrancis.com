'use client'

import { Minus, Pause, Play, Plus, Shuffle } from 'lucide-react'
import { Button } from '@/components/inputs/button/button'

type CanvasControlsProps = {
  onZoomIn: () => void
  onZoomOut: () => void
  onShuffle: () => void
  /** Whether the canvas is currently paused (drives the toggle's pressed state). */
  paused: boolean
  onTogglePause: () => void
  /** When set, the pause toggle is shown pressed but disabled — used under
   *  reduced motion, where motion is already suppressed at a lower layer so the
   *  toggle is informational rather than an offer to start motion. */
  pauseDisabled?: boolean
}

/**
 * Accessible controls for the canvas: focusable, labelled buttons so the surface
 * can be shuffled, paused, and zoomed without a wheel, trackpad, or touch
 * gesture. They sit above the layers and capture their own pointer events, so a
 * press on them never starts a pan of the surface behind.
 */
function CanvasControls({
  onZoomIn,
  onZoomOut,
  onShuffle,
  paused,
  onTogglePause,
  pauseDisabled,
}: CanvasControlsProps) {
  return (
    <div
      className="pointer-events-auto absolute right-4 bottom-4 z-30 flex flex-col gap-2"
      // Don't let a press on the controls begin a drag on the canvas behind them.
      onPointerDown={(e) => e.stopPropagation()}
    >
      <Button
        variant="outline"
        size="icon"
        onClick={onShuffle}
        aria-label="Shuffle tiles"
      >
        <Shuffle />
      </Button>
      <Button
        variant="outline"
        size="icon"
        onClick={onTogglePause}
        aria-pressed={paused}
        disabled={pauseDisabled}
        aria-label={paused ? 'Resume animations' : 'Pause animations'}
        title={
          pauseDisabled
            ? 'Reduced motion is on in your system settings'
            : undefined
        }
      >
        {paused ? <Play /> : <Pause />}
      </Button>
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

export default CanvasControls
