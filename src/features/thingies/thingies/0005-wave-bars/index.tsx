/**
 * An equalizer-like row of bars that twinkle in a wave. Decorative; the pulse is
 * gated behind motion-safe, so reduced-motion visitors see static bars.
 */
const BARS = [
  { height: '42%', delay: '0s' },
  { height: '72%', delay: '0.15s' },
  { height: '54%', delay: '0.3s' },
  { height: '86%', delay: '0.45s' },
  { height: '48%', delay: '0.6s' },
]

export default function WaveBars() {
  return (
    <div className="flex h-full w-full items-end justify-center gap-1.5 p-4 text-thingy-violet">
      {BARS.map((bar) => (
        <span
          key={bar.delay}
          className="w-1.5 rounded-full bg-current motion-safe:animate-pulse"
          style={{
            height: bar.height,
            animationDuration: '1.8s',
            animationDelay: bar.delay,
          }}
        />
      ))}
    </div>
  )
}
