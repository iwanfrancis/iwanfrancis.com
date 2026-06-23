/**
 * A 5×5 grid of dots pulsing in a diagonal wave. Decorative; the pulse is gated
 * behind motion-safe, so reduced-motion visitors see a static grid.
 */
const CELLS = Array.from({ length: 25 }, (_, i) => i)

export default function PulseGrid() {
  return (
    <div className="grid h-full w-full grid-cols-5 grid-rows-5 place-items-center p-3 text-thingy-blue">
      {CELLS.map((i) => {
        const col = i % 5
        const row = Math.floor(i / 5)
        return (
          <span
            key={i}
            className="block h-1.5 w-1.5 rounded-full bg-current motion-safe:animate-pulse"
            style={{
              animationDuration: '2.4s',
              animationDelay: `${(col + row) * 0.14}s`,
            }}
          />
        )
      })}
    </div>
  )
}
