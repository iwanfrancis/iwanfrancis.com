/**
 * Two nested ink squares rotating at different speeds and directions; their
 * overlap shifts as they turn. Filled (not hairline outlines) so it reads solid
 * rather than wireframey, and sized in percentages so it scales with the tile.
 * Decorative; rotation is gated behind motion-safe.
 */
export default function NestedSquares() {
  return (
    <div className="grid h-full w-full place-items-center text-foreground">
      <div className="relative h-[62%] w-[62%]">
        <div
          className="absolute inset-0 bg-current/15 motion-safe:animate-spin"
          style={{ animationDuration: '16s' }}
        />
        <div
          className="absolute inset-[22%] bg-current/30 motion-safe:animate-spin"
          style={{ animationDuration: '11s', animationDirection: 'reverse' }}
        />
      </div>
    </div>
  )
}
