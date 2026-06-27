/**
 * An equalizer-like row of bars that twinkle in a wave. Decorative; the pulse is
 * gated behind motion-safe, so reduced-motion visitors see static bars. Drawn in
 * a 0–100 viewBox so it scales with the tile.
 */
const BARS = [
  { height: 42, delay: '0s' },
  { height: 72, delay: '0.15s' },
  { height: 54, delay: '0.3s' },
  { height: 86, delay: '0.45s' },
  { height: 48, delay: '0.6s' },
]

const PAD = 16 // breathing room around the bars
const BAR_W = 6
const GAP = 6
const CONTENT = 100 - PAD * 2 // drawable span between the padding
const ROW_W = BARS.length * BAR_W + (BARS.length - 1) * GAP
const START_X = PAD + (CONTENT - ROW_W) / 2 // centre the row horizontally
const BASELINE = PAD + CONTENT // bars sit on this line and grow upward

export default function WaveBars() {
  return (
    <svg
      viewBox="0 0 100 100"
      className="h-full w-full text-thingy-violet"
      aria-hidden="true"
    >
      {BARS.map((bar, i) => {
        const h = (bar.height / 100) * CONTENT
        return (
          <rect
            key={bar.delay}
            x={START_X + i * (BAR_W + GAP)}
            y={BASELINE - h}
            width={BAR_W}
            height={h}
            rx={BAR_W / 2}
            fill="currentColor"
            className="motion-safe:animate-pulse"
            style={{ animationDuration: '1.8s', animationDelay: bar.delay }}
          />
        )
      })}
    </svg>
  )
}
