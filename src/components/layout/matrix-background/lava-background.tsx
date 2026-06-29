'use client'

import { useRef } from 'react'
import useLavaField from './use-lava-field'

/**
 * Client island for the ambient lava-lamp effect. Renders the canvas the
 * useLavaField hook draws into, plus a fallback scrim. The fallback is
 * server-rendered so it mutes the dot matrix from the first paint (no flash to
 * full contrast before hydration); the hook hides it once the canvas has drawn.
 *
 * Both are decorative: they have no content or accessible name, so assistive
 * tech ignores them (no aria-hidden needed — Biome's noAriaHiddenOnFocusable
 * treats <canvas> as focusable and rejects it).
 *
 * `paused` (optional) suspends the drift on demand — used by the /thingies pause
 * toggle. It defaults to `false`, so the landing page, which omits it, is
 * unaffected.
 */
function LavaBackground({ paused = false }: { paused?: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fallbackRef = useRef<HTMLDivElement>(null)

  useLavaField(canvasRef, fallbackRef, paused)

  return (
    <>
      <div ref={fallbackRef} className="lava-scrim-fallback" />
      <canvas ref={canvasRef} className="lava-canvas" />
    </>
  )
}

export default LavaBackground
