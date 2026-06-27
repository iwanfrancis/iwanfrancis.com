/**
 * An arc that sweeps around a faint ring. Decorative; the rotation is gated
 * behind motion-safe, so reduced-motion visitors see a static arc.
 */
export default function RotatingArc() {
  return (
    <svg
      viewBox="0 0 100 100"
      className="h-full w-full text-thingy-amber"
      aria-hidden="true"
    >
      <circle
        cx="50"
        cy="50"
        r="30"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        opacity="0.2"
      />
      <circle
        cx="50"
        cy="50"
        r="30"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeDasharray="47 141"
        className="motion-safe:animate-spin"
        style={{ transformOrigin: 'center', animationDuration: '4s' }}
      />
    </svg>
  )
}
