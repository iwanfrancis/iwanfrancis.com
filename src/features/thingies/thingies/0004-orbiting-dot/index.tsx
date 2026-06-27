/**
 * A dot orbiting a faint ring, with a still dot at the centre. Decorative; the
 * orbit is gated behind motion-safe.
 */
export default function OrbitingDot() {
  return (
    <div className="grid h-full w-full place-items-center text-thingy-rose">
      <div className="relative h-[58%] w-[58%]">
        <div className="absolute inset-0 rounded-full border border-current/40" />
        <span className="-translate-x-1/2 -translate-y-1/2 absolute top-1/2 left-1/2 h-[10%] w-[10%] rounded-full bg-current" />
        <div
          className="absolute inset-0 motion-safe:animate-spin"
          style={{ animationDuration: '6s' }}
        >
          <span className="-translate-x-1/2 absolute top-0 left-1/2 h-[14%] w-[14%] rounded-full bg-current" />
        </div>
      </div>
    </div>
  )
}
