/**
 * Two nested square outlines rotating at different speeds and directions.
 * Decorative; rotation is gated behind motion-safe.
 */
export default function NestedSquares() {
  return (
    <div className="grid h-full w-full place-items-center text-thingy-amber">
      <div className="relative h-[62%] w-[62%]">
        <div
          className="absolute inset-0 border border-current motion-safe:animate-spin"
          style={{ animationDuration: '16s' }}
        />
        <div
          className="absolute inset-[20%] border border-current/60 motion-safe:animate-spin"
          style={{ animationDuration: '11s', animationDirection: 'reverse' }}
        />
      </div>
    </div>
  )
}
