/**
 * Infinite mirror — the tunnel you see holding two mirrors face to face. A square
 * frame holds a reflection of itself, a touch smaller and turned a few degrees,
 * which holds another, and so on, so the twist compounds into a slow spiral that
 * dims away to a point. The tunnel zooms in by exactly one reflection per loop
 * (each square grows into its parent's place) for a seamless, endless fall.
 * Decorative; the zoom is CSS-driven, so it freezes for free off-screen and rests
 * as a static tunnel under prefers-reduced-motion. Pure ink. Tile contract:
 * ../README.md.
 *
 * Each reflection is the previous one transformed by STEP (rotate TWIST, scale
 * SHRINK about the centre), nested so it compounds: reflection k sits k·TWIST
 * degrees round at SHRINK^k the size, its stroke shrinking with it like real
 * perspective. Reflection k is dimmed to FADE^k. The loop animates the tunnel group
 * by the inverse step (rotate −TWIST, scale 1/SHRINK) and its opacity FADE → 1, so
 * at the end of a loop reflection k looks exactly like reflection k−1 did at the
 * start. The fixed frame (reflection 0) is drawn on top, covering reflection 1 as
 * it arrives. Tweak the look in the constants below.
 */

// Keep SHRINK · (cos TWIST + sin TWIST) comfortably below 1, or a reflection's
// corners touch its parent's frame.
const LEVELS = 22 // reflections inside the frame; the deepest are sub-pixel
const TWIST = 4 // degrees each reflection turns relative to its parent
const SHRINK = 0.83 // each reflection's size relative to its parent
const FADE = 0.88 // each reflection's opacity relative to its parent
const SECONDS_PER_REFLECTION = 3

const r3 = (n: number) => Math.round(n * 1000) / 1000

const STEP = `translate(50 50) rotate(${TWIST}) scale(${SHRINK}) translate(-50 -50)`

const SQUARE = {
  x: 7,
  y: 7,
  width: 86,
  height: 86,
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 4,
} as const

// Keyframes at quarter steps so scale and opacity follow an exponential (constant
// apparent speed) rather than a straight line, which would hitch at the loop seam.
const keyframes = [0, 25, 50, 75, 100]
  .map((pct) => {
    const p = pct / 100
    return `  ${pct}% { transform: rotate(${r3(-TWIST * p)}deg) scale(${r3(SHRINK ** -p)}); opacity: ${r3(FADE ** (1 - p))}; }`
  })
  .join('\n')

const css = `
.infinite-mirror-tunnel { transform-box: view-box; transform-origin: 50px 50px; }
@keyframes infinite-mirror-zoom {
${keyframes}
}
@media (prefers-reduced-motion: no-preference) {
  .infinite-mirror-tunnel {
    animation: infinite-mirror-zoom ${SECONDS_PER_REFLECTION}s linear infinite;
  }
}`

function Reflection({ depth }: { depth: number }) {
  return (
    <g transform={STEP}>
      {/* The tunnel group's opacity supplies the first FADE. */}
      <rect {...SQUARE} strokeOpacity={r3(FADE ** (depth - 1))} />
      {depth < LEVELS && <Reflection depth={depth + 1} />}
    </g>
  )
}

export default function InfiniteMirror() {
  return (
    <svg
      viewBox="0 0 100 100"
      className="h-full w-full text-foreground"
      aria-hidden="true"
    >
      <style>{css}</style>
      <g className="infinite-mirror-tunnel" opacity={FADE}>
        <Reflection depth={1} />
      </g>
      <rect {...SQUARE} />
    </svg>
  )
}
