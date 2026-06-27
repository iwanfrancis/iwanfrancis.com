/**
 * A rose dot orbiting a faint ink ring, with a still rose dot at the centre — an
 * ink drawing with a single colour accent (the reference for the tile contract's
 * "minority accent" rule). Decorative; the orbit is gated behind motion-safe, so
 * reduced-motion visitors see the dot parked on the ring.
 */
export default function OrbitingDot() {
  return (
    <svg
      viewBox="0 0 100 100"
      className="h-full w-full text-foreground"
      aria-hidden="true"
    >
      {/* faint ink track */}
      <circle
        cx="50"
        cy="50"
        r="29"
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        opacity="0.25"
      />
      {/* still centre dot — rose accent */}
      <circle
        cx="50"
        cy="50"
        r="5"
        className="text-thingy-rose"
        fill="currentColor"
      />
      {/* orbiting dot — rose accent; rotates about the viewBox centre */}
      <g
        className="motion-safe:animate-spin"
        style={{
          transformBox: 'view-box',
          transformOrigin: 'center',
          animationDuration: '6s',
        }}
      >
        <circle
          cx="50"
          cy="21"
          r="7"
          className="text-thingy-rose"
          fill="currentColor"
        />
      </g>
    </svg>
  )
}
