'use client'

import dynamic from 'next/dynamic'
import { useMemo, useState } from 'react'
import { cn } from '@/utils/cn'
import {
  BLEED,
  FADE_DELAY_MAX_MS,
  FADE_IN_MS,
  TILE_PADDING,
  TILE_SIZE,
} from '../constants'
import { ThingyActiveProvider } from '../hooks/use-thingy-active'
import type { ThingyEntry } from '../thingies'
import TileErrorBoundary from './tile-error-boundary'

type ThingyFrameProps = {
  entry: ThingyEntry
  /** Position within the tiles layer, in px (centre of the blob is at 0,0). */
  left: number
  top: number
  /** True when the tile's animations are paused (see the .thingy-frozen rule in
   *  globals.css): either it is off-screen within the mount band, or the canvas
   *  is globally paused. */
  frozen?: boolean
  /** True when the canvas is globally paused. Distinct from `frozen` so the tile
   *  can tell *why* it is frozen: a tile that mounts while paused must appear at
   *  full opacity rather than holding at the deferred-fade's 0 opacity (which is
   *  correct only for the off-screen freeze). */
  paused?: boolean
}

/**
 * The reusable square that hosts one tile. It:
 * - is a fixed-size square; the outer div only positions and sizes it,
 * - code-splits its content (each tile is its own chunk, loaded on demand),
 * - fades the whole tile in when that chunk resolves (see FadedTile below),
 * - renders the content non-interactively, so a drag is never captured by a
 *   tile, and
 * - isolates failures, so one broken tile can't blank the page.
 *
 * Content is client-only (`ssr: false`): tiles are decorative and often animate,
 * so there's nothing to gain from server rendering them.
 *
 * The opaque background, the hairline-cover box-shadow, and the overflow clip all
 * live on FadedTile — the wrapper *inside* the dynamic boundary — not on the outer
 * positioning div. That keys the fade to content arrival (the wrapper only mounts
 * once the chunk resolves, so the fade can't elapse against a blank placeholder)
 * and lets the whole tile materialise as one unit. The outer div is left
 * transparent and *unclipped* on purpose: an overflow clip there would crop the
 * wrapper's outward box-shadow and reopen the sub-pixel matrix sliver between flush
 * tiles that the shadow exists to hide.
 */
function ThingyFrame({ entry, left, top, frozen, paused }: ThingyFrameProps) {
  const Content = useMemo(
    () =>
      dynamic(
        () =>
          entry.load().then((mod) => {
            const Inner = mod.default
            function FadedTile({ pausedAtMount }: { pausedAtMount?: boolean }) {
              // Decide once, at mount, whether to fade: a tile that mounts while
              // the canvas is paused can't animate, so skip the fade and show it
              // at full opacity (otherwise the .thingy-frozen rule would hold its
              // fade at 0 opacity — invisible). A tile that mounts while running
              // fades as normal. Captured in state so a later resume doesn't
              // suddenly start the fade on an already-visible tile.
              const [skipFade] = useState(() => Boolean(pausedAtMount))
              // One random start delay per mount (lazy init, so it's stable across
              // this instance's renders but re-rolls on a genuine remount). Plain
              // Math.random — fade timing has no SSR/determinism constraint, unlike
              // the seeded placement PRNG.
              const [delay] = useState(() => Math.random() * FADE_DELAY_MAX_MS)
              return (
                <div
                  className={cn(
                    'h-full w-full overflow-hidden bg-background',
                    !skipFade && 'thingy-fade'
                  )}
                  style={{
                    // Opaque ring just past the edge so two flush tiles never
                    // reveal a sub-pixel sliver of the dot matrix between them at
                    // fractional zoom.
                    boxShadow: `0 0 0 ${BLEED}px var(--background)`,
                    // Duration + per-tile stagger drive the .thingy-fade longhands
                    // (the animation name/timing/fill live in globals.css, gated by
                    // prefers-reduced-motion). Omitted when the fade is skipped.
                    ...(skipFade
                      ? {}
                      : {
                          animationDuration: `${FADE_IN_MS}ms`,
                          animationDelay: `${delay}ms`,
                        }),
                  }}
                >
                  <div
                    className="pointer-events-none h-full w-full"
                    style={{
                      // Uniform safe area: content is inset on every side, so flush
                      // neighbours keep 2 x TILE_PADDING of breathing room.
                      // border-box (Tailwind default) keeps the frame size unchanged.
                      padding: TILE_PADDING,
                    }}
                  >
                    <Inner />
                  </div>
                </div>
              )
            }
            return FadedTile
          }),
        { ssr: false, loading: () => null }
      ),
    [entry.load]
  )

  return (
    <div
      className={cn('absolute', frozen && 'thingy-frozen')}
      style={{ left, top, width: TILE_SIZE, height: TILE_SIZE }}
    >
      <TileErrorBoundary>
        <ThingyActiveProvider active={!frozen}>
          <Content pausedAtMount={paused} />
        </ThingyActiveProvider>
      </TileErrorBoundary>
    </div>
  )
}

export default ThingyFrame
