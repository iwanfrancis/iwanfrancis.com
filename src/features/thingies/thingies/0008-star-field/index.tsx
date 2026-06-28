/**
 * Star field — twelve real constellations overlaid in one patch of sky. Every star
 * from every figure is drawn as a faint, permanent field; then each constellation's
 * lines trace themselves on, hold, and cross-fade into the next, looping forever and
 * slowly. Decorative; the whole sequence is CSS-driven so it freezes for free
 * off-screen and pauses under prefers-reduced-motion, where it rests on the first
 * constellation drawn statically. Tile contract: ../README.md.
 *
 * Geometry is real: bright-star RA/Dec projected to a centred, shape-preserving box
 * (RA mirrored so east is left, north up). Constellations share the tile — and the
 * odd coincident star — by being scaled to the same central region, not placed in
 * their true relative sky positions. Fine lines are deliberate here (a star chart),
 * but they're sized in viewBox units so they scale with the tile, not 1px hairlines.
 */

type Constellation = {
  name: string
  /** Star positions in the 0–100 viewBox. */
  stars: [number, number][]
  /** Lines as index pairs into `stars`. */
  lines: [number, number][]
  /** Index of the brightest star — gets a larger blue glow. */
  bright: number
}

// Projected from catalogue RA/Dec (see the tile's generator); accurate in shape.
const CONSTELLATIONS: Constellation[] = [
  {
    name: 'Orion',
    stars: [
      [34.95, 28.5],
      [57.21, 31.6],
      [45.6, 56.16],
      [49, 53.95],
      [52.11, 51.28],
      [40.42, 79],
      [65.05, 74.66],
      [49.82, 21],
    ],
    lines: [
      [0, 1],
      [1, 4],
      [0, 2],
      [2, 3],
      [3, 4],
      [2, 5],
      [4, 6],
      [5, 6],
      [7, 0],
      [7, 1],
    ],
    bright: 6,
  },
  {
    name: 'Ursa Major',
    stars: [
      [78.33, 34.6],
      [79, 47.89],
      [60.8, 54.54],
      [53.24, 46.28],
      [39.73, 48.93],
      [29.26, 51.49],
      [21, 65.4],
    ],
    lines: [
      [0, 1],
      [1, 2],
      [2, 3],
      [3, 0],
      [3, 4],
      [4, 5],
      [5, 6],
    ],
    bright: 4,
  },
  {
    name: 'Cassiopeia',
    stars: [
      [79, 54.2],
      [61.74, 65.76],
      [52.81, 47.28],
      [36.77, 49.41],
      [21, 34.24],
    ],
    lines: [
      [0, 1],
      [1, 2],
      [2, 3],
      [3, 4],
    ],
    bright: 1,
  },
  {
    name: 'Cygnus',
    stars: [
      [28.41, 21],
      [40.99, 37.86],
      [74.73, 79],
      [25.27, 58.9],
      [65.36, 21.5],
    ],
    lines: [
      [0, 1],
      [1, 2],
      [3, 1],
      [1, 4],
    ],
    bright: 0,
  },
  {
    name: 'Crux',
    stars: [
      [55.88, 79],
      [50.24, 21],
      [30.05, 45.88],
      [69.95, 36.83],
    ],
    lines: [
      [0, 1],
      [2, 3],
    ],
    bright: 0,
  },
  {
    name: 'Leo',
    stars: [
      [68.37, 63.98],
      [68.89, 54.41],
      [62.91, 48.27],
      [64.46, 41.17],
      [75.71, 36.02],
      [79, 40.47],
      [37.46, 46.95],
      [37.42, 57.07],
      [21, 58.8],
    ],
    lines: [
      [0, 1],
      [1, 2],
      [2, 3],
      [3, 4],
      [4, 5],
      [2, 6],
      [6, 8],
      [8, 7],
      [7, 0],
    ],
    bright: 0,
  },
  {
    name: 'Scorpius',
    stars: [
      [74.68, 21],
      [77.31, 27.97],
      [78.09, 36.63],
      [62.29, 37.42],
      [58.93, 41.83],
      [51.55, 56.89],
      [50.67, 66.17],
      [49.28, 76.85],
      [40.19, 79],
      [27.23, 78.42],
      [21.91, 71.33],
      [29.14, 63.82],
    ],
    lines: [
      [0, 1],
      [1, 2],
      [1, 3],
      [3, 4],
      [4, 5],
      [5, 6],
      [6, 7],
      [7, 8],
      [8, 9],
      [9, 10],
      [10, 11],
    ],
    bright: 3,
  },
  {
    name: 'Taurus',
    stars: [
      [57.93, 60.18],
      [62.3, 53.43],
      [65.71, 57.56],
      [67.57, 62.41],
      [79, 70.37],
      [27.76, 29.63],
      [21, 48.5],
    ],
    lines: [
      [4, 3],
      [3, 2],
      [2, 1],
      [1, 5],
      [3, 0],
      [0, 6],
    ],
    bright: 0,
  },
  {
    name: 'Gemini',
    stars: [
      [27.87, 28.4],
      [21, 39.19],
      [60.39, 47.23],
      [73.87, 54.53],
      [79, 54.58],
      [64.37, 71.6],
      [37.17, 56.02],
      [38.45, 71.23],
    ],
    lines: [
      [0, 1],
      [0, 2],
      [2, 3],
      [3, 4],
      [1, 6],
      [6, 7],
      [7, 5],
      [2, 6],
    ],
    bright: 1,
  },
  {
    name: 'Lyra',
    stars: [
      [68.36, 28.34],
      [56.01, 21],
      [55.17, 38.16],
      [46.33, 73.32],
      [31.64, 79],
      [38.98, 43.98],
    ],
    lines: [
      [0, 1],
      [1, 2],
      [2, 0],
      [2, 3],
      [3, 4],
      [4, 5],
      [5, 2],
    ],
    bright: 0,
  },
  {
    name: 'Boötes',
    stars: [
      [61.13, 76.93],
      [44.32, 56.13],
      [26.82, 39.64],
      [34.63, 21],
      [51.72, 26.5],
      [51.89, 47.43],
      [73.18, 79],
    ],
    lines: [
      [0, 1],
      [1, 2],
      [2, 3],
      [3, 4],
      [4, 5],
      [5, 0],
      [0, 6],
    ],
    bright: 0,
  },
  {
    name: 'Canis Major',
    stars: [
      [56.45, 25.67],
      [76.82, 30.56],
      [39.45, 21.37],
      [35.27, 64.08],
      [44.18, 74.27],
      [21, 75.59],
      [79, 78.63],
    ],
    lines: [
      [0, 1],
      [0, 2],
      [0, 3],
      [3, 4],
      [4, 6],
      [3, 5],
      [1, 6],
    ],
    bright: 0,
  },
]

// Pace is set per figure (slow on purpose); the whole loop scales with the count, so
// adding constellations lengthens the loop rather than speeding each one up.
const SECONDS_PER_FIGURE = 7
const CYCLE = CONSTELLATIONS.length * SECONDS_PER_FIGURE
const SLOT = 100 / CONSTELLATIONS.length // % of the cycle each figure owns
const r2 = (n: number) => Math.round(n * 100) / 100

// Phase boundaries as % of the cycle, derived from one slot. The active window runs a
// little past one slot (fade ends at 1.2 slots) so the out- and in-going figures
// cross-fade at the handover; otherwise exactly one figure is visible at a time.
const DRAW = r2(0.35 * SLOT) // lines traced on by here
const HOLD = r2(0.8 * SLOT) // held until here
const FADE = r2(1.2 * SLOT) // faded out by here (overlaps the next figure)
const RESET = r2(FADE + 0.5) // re-arm the dash offset while hidden

// One shared animation, phase-shifted per figure by `animation-delay`, tiles the
// slots. Default (no media query) leaves the first figure drawn statically for
// reduced-motion visitors.
const css = `
.starfield-group { opacity: 0; stroke-dasharray: 1; stroke-dashoffset: 1; }
.starfield-root .starfield-c0 { opacity: 1; stroke-dashoffset: 0; }
@keyframes starfield-form {
  0% { opacity: 0; stroke-dashoffset: 1; }
  ${DRAW}% { opacity: 1; stroke-dashoffset: 0; }
  ${HOLD}% { opacity: 1; stroke-dashoffset: 0; }
  ${FADE}% { opacity: 0; stroke-dashoffset: 0; }
  ${RESET}% { opacity: 0; stroke-dashoffset: 1; }
  100% { opacity: 0; stroke-dashoffset: 1; }
}
@media (prefers-reduced-motion: no-preference) {
  .starfield-root .starfield-group {
    animation: starfield-form ${CYCLE}s linear infinite;
  }
${CONSTELLATIONS.map(
  (_, i) =>
    `  .starfield-root .starfield-c${i} { animation-delay: ${r2(i * SECONDS_PER_FIGURE)}s; }`
).join('\n')}
}`

// Deterministic PRNG (mulberry32) so the scatter is identical on the server and on
// hydration — Math.random() would mismatch and warn. Fixed seed → one stable sky.
function mulberry32(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
const rand = mulberry32(0x5709b1)

// Give each figure its own uniform scale + small offset (shape preserved) so they
// don't all stack into the same centred box — they spread around the sky instead.
const PLACED = CONSTELLATIONS.map((c) => {
  const scale = 0.72 + rand() * 0.28
  const dx = (rand() * 2 - 1) * 8
  const dy = (rand() * 2 - 1) * 8
  return {
    ...c,
    stars: c.stars.map(
      ([x, y]) =>
        [r2(50 + dx + (x - 50) * scale), r2(50 + dy + (y - 50) * scale)] as [
          number,
          number,
        ]
    ),
  }
})

type FieldStar = { x: number; y: number; r: number; o: number }

// Permanent faint field: every (placed) constellation star with varied size and
// brightness, plus scattered bonus stars across the whole tile — corners included —
// so the sky reads as an even, natural field rather than a filled square.
const FIELD: FieldStar[] = [
  ...PLACED.flatMap((c) =>
    c.stars.map(([x, y]) => ({
      x,
      y,
      r: r2(0.7 + rand() * 0.65),
      o: r2(0.16 + rand() * 0.2),
    }))
  ),
  ...Array.from({ length: 36 }, () => ({
    x: r2(2 + rand() * 96),
    y: r2(2 + rand() * 96),
    r: r2(0.5 + rand() * 0.75),
    o: r2(0.1 + rand() * 0.2),
  })),
]

export default function StarField() {
  return (
    <svg
      viewBox="0 0 100 100"
      className="starfield-root h-full w-full text-foreground"
      aria-hidden="true"
    >
      <style>{css}</style>

      {/* Permanent faint field: placed constellation stars (varied size/brightness)
          plus scattered bonus stars, so the sky looks evenly populated. */}
      <g fill="currentColor">
        {FIELD.map((s) => (
          <circle
            key={`${s.x}-${s.y}-${s.r}-${s.o}`}
            cx={s.x}
            cy={s.y}
            r={s.r}
            opacity={s.o}
          />
        ))}
      </g>

      {/* Each constellation: lines trace on, member stars light up, then it fades. */}
      {PLACED.map((c, ci) => (
        <g
          key={c.name}
          className={`starfield-group starfield-c${ci}`}
          stroke="currentColor"
          strokeWidth={1.4}
          strokeLinecap="round"
        >
          {c.lines.map(([a, b]) => (
            <line
              key={`${a}-${b}`}
              x1={c.stars[a][0]}
              y1={c.stars[a][1]}
              x2={c.stars[b][0]}
              y2={c.stars[b][1]}
              pathLength={1}
            />
          ))}
          {c.stars.map(([x, y], si) =>
            si === c.bright ? (
              <circle
                key={`${x},${y}`}
                className="text-thingy-blue"
                cx={x}
                cy={y}
                r={2.5}
                fill="currentColor"
                stroke="none"
              />
            ) : (
              <circle
                key={`${x},${y}`}
                cx={x}
                cy={y}
                r={1.7}
                fill="currentColor"
                stroke="none"
              />
            )
          )}
        </g>
      ))}
    </svg>
  )
}
