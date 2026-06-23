/**
 * Concentric rings that breathe. Decorative; animation is gated behind
 * motion-safe, so reduced-motion visitors see a static set of rings.
 */
export default function ConcentricRings() {
  return (
    <svg
      viewBox="0 0 100 100"
      className="h-full w-full text-thingy-teal"
      aria-hidden="true"
    >
      <title>Concentric rings</title>
      {[42, 32, 22, 12].map((r, i) => (
        <circle
          key={r}
          cx="50"
          cy="50"
          r={r}
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          className="motion-safe:animate-pulse"
          style={{
            transformOrigin: 'center',
            animationDuration: '3.2s',
            animationDelay: `${i * 0.35}s`,
            opacity: 0.3 + i * 0.16,
          }}
        />
      ))}
    </svg>
  )
}
