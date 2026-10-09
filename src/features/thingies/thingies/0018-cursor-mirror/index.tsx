'use client'

import { useEffect, useId, useReducer, useRef } from 'react'
import { useThingyActive } from '../../hooks/use-thingy-active'
import { useThingyFrame } from '../../hooks/use-thingy-frame'

/**
 * Cursor mirror — a small, old, cracked mirror drawn at the falling-sand tile's 32×32
 * resolution. Pass the cursor over it and its reflection appears in the glass,
 * mirrored about the tile's vertical centre line: it enters from the far side, flipped
 * left to right, and moves against the cursor, so the two meet in the middle.
 *
 * The reflection is the one thing here not drawn to the tile's scale. It is a pixel
 * sprite of whichever cursor is showing (the canvas's grab / grabbing hand, or an
 * arrow) at one sprite pixel per screen pixel, so it stays the real cursor's size at
 * any canvas zoom — zoom in and the mirror grows around it. It is dimmer than the real
 * thing, its rows are nudged a pixel either way by uneven rows of glass, it breaks and
 * shifts across the crack, and the desilvered spots show through it. Without a cursor
 * the tile still reads as a mirror: a framed pane with sheen streaks, foxing, a crack,
 * and a glint that steps across every few seconds.
 *
 * The cursor is read from a passive window listener while the tile is active — the
 * tile itself stays `pointer-events: none` with no handlers. A frame loop maps it
 * through the tile's box every frame, so the reflection also tracks when the canvas
 * pans or zooms under a still cursor, and it re-renders only when the reflection
 * changes. That loop runs under reduced motion too, since it only follows the
 * visitor's own movement; the glint and the fade are motion-safe. Tile contract:
 * ../README.md.
 */

/** Pixels per side — the same resolution as the falling-sand and water tiles. */
const GRID = 32
/** Pixel edge in viewBox units. */
const CELL = 100 / GRID
/** Seam inset so the glass reads as a field of pixels rather than a flat shape. */
const INSET = CELL * 0.07
const LAST = GRID - 1

/** Pixel kinds. EMPTY must stay 0 (a fresh Uint8Array is all-empty). */
const EMPTY = 0
const GLASS = 1
const TARNISH = 2
const FOX = 3
const STREAK = 4
const CRACK = 5
const FRAME = 6

const OPACITY = {
  [GLASS]: 0.07,
  [TARNISH]: 0.14,
  [FOX]: 0.42,
  [STREAK]: 0.2,
  [CRACK]: 0.85,
}
/** The glint stepping across the glass, laid over it. */
const GLINT_OPACITY = 0.1
/** The reflection is never quite as strong as the real thing. */
const REFLECTION_OPACITY = 0.6

type Cell = readonly [number, number]
type CursorKind = 'arrow' | 'grab' | 'grabbing'
type Pointer = { x: number; y: number; target: Element | null }
/** The reflection's hotspot in viewBox units, and viewBox units per screen pixel. */
type Reflection = {
  x: number
  y: number
  px: number
  kind: CursorKind
  shown: boolean
}

/** Where the silvering has failed: old mirrors desilver from the corners and edges
 *  in. Each spot is an anchor cell and how far its foxing reaches, in cells. */
const SPOTS = [
  { c: 30, r: 1, reach: 5 },
  { c: 1, r: 30, reach: 4 },
  { c: 1, r: 17, reach: 2.5 },
  { c: 17, r: 1, reach: 2 },
]
/** Sheen streaks: anti-diagonal runs of cells, as [col + row, first col, last col]. */
const STREAKS = [
  [9, 3, 7],
  [10, 3, 8],
  [13, 5, 9],
] as const
/** The crack (bottom edge to right edge, cutting off a shard), then two dead-end
 *  branches off it. Its ends sit in the frame, which paints over them. */
const CRACKS: Cell[][] = [
  [
    [18, 31],
    [19, 28],
    [21, 26],
    [23, 25],
    [24, 22],
    [26, 20],
    [28, 19],
    [29, 17],
    [31, 16],
  ],
  [
    [23, 25],
    [25, 28],
  ],
  [
    [26, 20],
    [25, 18],
  ],
]
/** The shard sits at a slightly different angle, so its reflection lands offset, in
 *  screen pixels. */
const SHARD_SHIFT = { x: 2, y: -1 }

/** Each glass row's unevenness: how far it nudges the reflection, in screen pixels. */
const WAVE = Array.from({ length: GRID }, (_, r) =>
  Math.round(Math.sin(r * 1.3) * 0.6 + Math.sin(r * 0.5) * 0.4)
)

/**
 * Each cursor as a pixel silhouette at real cursor size (one sprite pixel per screen
 * pixel), with its hotspot as [col, row]. Gaps between the fingers are left empty so
 * the glass shows through them.
 */
const SPRITES: Record<CursorKind, { rows: string[]; hot: Cell }> = {
  arrow: {
    hot: [0, 0],
    rows: [
      'x',
      'xx',
      'xxx',
      'xxxx',
      'xxxxx',
      'xxxxxx',
      'xxxxxxx',
      'xxxxxxxx',
      'xxxxxxxxx',
      'xxxxxxxxxx',
      'xxxxxxxxxxx',
      'xxxxxxxxxxxx',
      'xxxxxxxx',
      'xxxx.xxxx',
      'xxx..xxxx',
      'xx....xxxx',
      'x.....xxxx',
      '.......xxxx',
      '........xx',
    ],
  },
  grab: {
    hot: [7, 7],
    rows: [
      '......xx',
      '......xx.xx',
      '...xx.xx.xx',
      '...xx.xx.xx.xx',
      '...xx.xx.xx.xx',
      'xx.xx.xx.xx.xx',
      'xx.xx.xx.xx.xx',
      '.xxxxxxxxxxxxx',
      '..xxxxxxxxxxxx',
      '..xxxxxxxxxxxx',
      '...xxxxxxxxxxx',
      '...xxxxxxxxxx',
      '....xxxxxxxxx',
      '....xxxxxxxx',
    ],
  },
  grabbing: {
    hot: [7, 4],
    rows: [
      '...xx.xx.xx.xx',
      '...xx.xx.xx.xx',
      '.xxxxxxxxxxxxx',
      '.xxxxxxxxxxxxx',
      '..xxxxxxxxxxxx',
      '..xxxxxxxxxxxx',
      '...xxxxxxxxxxx',
      '...xxxxxxxxxx',
      '....xxxxxxxxx',
      '....xxxxxxxx',
    ],
  },
}

/** Each sprite's filled pixels as horizontal runs, so a row draws as one rect. */
const RUNS = Object.fromEntries(
  Object.entries(SPRITES).map(([kind, { rows }]) => [
    kind,
    rows.flatMap((line, row) =>
      [...line.matchAll(/x+/g)].map((m) => ({
        row,
        start: m.index ?? 0,
        len: m[0].length,
      }))
    ),
  ])
) as Record<CursorKind, { row: number; start: number; len: number }[]>

/** Seeded PRNG (mulberry32), so the foxing is the same on every mount. */
function mulberry32(seed: number) {
  let a = seed
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** The cells of a straight line between two cells (Bresenham). 8-connected, which
 *  still walls off a 4-connected flood fill. */
function line([c0, r0]: Cell, [c1, r1]: Cell): Cell[] {
  const dc = Math.abs(c1 - c0)
  const dr = -Math.abs(r1 - r0)
  const sc = c0 < c1 ? 1 : -1
  const sr = r0 < r1 ? 1 : -1
  let err = dc + dr
  let c = c0
  let r = r0
  const cells: Cell[] = [[c, r]]
  while (c !== c1 || r !== r1) {
    const e2 = 2 * err
    if (e2 >= dr) {
      err += dr
      c += sc
    }
    if (e2 <= dc) {
      err += dc
      r += sr
    }
    cells.push([c, r])
  }
  return cells
}

const at = (c: number, r: number) => r * GRID + c
const isGlass = (c: number, r: number) =>
  c >= 1 && c <= LAST - 1 && r >= 1 && r <= LAST - 1

/** The mirror's pixels, and which glass pixels belong to the shard. Static, so built
 *  once. */
const MIRROR = (() => {
  const kinds = new Uint8Array(GRID * GRID)
  const rand = mulberry32(0xf0c5)
  for (let r = 0; r < GRID; r++) {
    for (let c = 0; c < GRID; c++) {
      if (!isGlass(c, r)) {
        const corner = (c === 0 || c === LAST) && (r === 0 || r === LAST)
        kinds[at(c, r)] = corner ? EMPTY : FRAME
        continue
      }
      let p = 0
      for (const s of SPOTS) {
        const d = Math.hypot(c - s.c, r - s.r) / s.reach
        p = Math.max(p, Math.exp(-d * d))
      }
      const edge = c === 1 || r === 1 || c === LAST - 1 || r === LAST - 1
      const x = rand()
      kinds[at(c, r)] =
        x < p * 0.6 ? FOX : x < p * 1.3 || (edge && x < 0.15) ? TARNISH : GLASS
    }
  }
  for (const [sum, from, to] of STREAKS) {
    for (let c = from; c <= to; c++) {
      const r = sum - c
      if (isGlass(c, r) && kinds[at(c, r)] !== FOX) kinds[at(c, r)] = STREAK
    }
  }
  for (const points of CRACKS) {
    for (let i = 1; i < points.length; i++) {
      for (const [c, r] of line(points[i - 1], points[i])) {
        if (isGlass(c, r)) kinds[at(c, r)] = CRACK
      }
    }
  }
  // The shard: everything the crack walls off from the bottom-right corner.
  const shard = new Uint8Array(GRID * GRID)
  const stack = [at(LAST - 1, LAST - 1)]
  while (stack.length > 0) {
    const p = stack.pop() as number
    const c = p % GRID
    const r = Math.floor(p / GRID)
    if (shard[p] || !isGlass(c, r) || kinds[p] === CRACK) continue
    shard[p] = 1
    stack.push(p - 1, p + 1, p - GRID, p + GRID)
  }
  return { kinds, shard }
})()

const f = (n: number) => n.toFixed(3)

/** One seamed square per cell — a single path per kind, as in the water tile. */
function cellsPath(cells: Iterable<Cell>): string {
  const size = (CELL - INSET * 2).toFixed(2)
  let d = ''
  for (const [c, r] of cells) {
    const x = (c * CELL + INSET).toFixed(2)
    const y = (r * CELL + INSET).toFixed(2)
    d += `M${x} ${y}h${size}v${size}h-${size}z`
  }
  return d
}

function* cellsOf(has: (c: number, r: number) => boolean): Generator<Cell> {
  for (let r = 0; r < GRID; r++) {
    for (let c = 0; c < GRID; c++) if (has(c, r)) yield [c, r]
  }
}

/** A region as unseamed row runs, for the frame and for clipping. Rows overlap a hair
 *  so they never leave a hairline between them. */
function regionPath(has: (c: number, r: number) => boolean): string {
  let d = ''
  for (let r = 0; r < GRID; r++) {
    let c = 0
    while (c < GRID) {
      if (!has(c, r)) {
        c++
        continue
      }
      const start = c
      while (c < GRID && has(c, r)) c++
      const w = f((c - start) * CELL)
      d += `M${f(start * CELL)} ${f(r * CELL)}h${w}v${f(CELL + 0.02)}h-${w}z`
    }
  }
  return d
}

const kindPath = (kind: number) =>
  cellsPath(cellsOf((c, r) => MIRROR.kinds[at(c, r)] === kind))

const PATHS = {
  glass: kindPath(GLASS),
  tarnish: kindPath(TARNISH),
  fox: kindPath(FOX),
  streak: kindPath(STREAK),
  crack: kindPath(CRACK),
  // Solid rather than seamed, so it reads as a frame rather than a dashed line.
  frame: regionPath((c, r) => MIRROR.kinds[at(c, r)] === FRAME),
  pane: regionPath((c, r) => isGlass(c, r) && !MIRROR.shard[at(c, r)]),
  shard: regionPath((c, r) => MIRROR.shard[at(c, r)] === 1),
  // A two-pixel anti-diagonal band spanning the tile, swept across by CSS.
  glint: cellsPath(
    Array.from({ length: GRID }, (_, r): Cell[] => [
      [LAST - r, r],
      [GRID - r, r],
    ]).flat()
  ),
}

/** The reflection's pixels in viewBox units: the sprite flipped left to right about
 *  its hotspot, one sprite pixel per screen pixel, each row nudged by the row of glass
 *  it falls on, and the whole offset by `shift` screen pixels. */
function reflectionPath(
  { x, y, px, kind }: Reflection,
  shift: { x: number; y: number }
): string {
  const [hc, hr] = SPRITES[kind].hot
  let d = ''
  for (const { row, start, len } of RUNS[kind]) {
    const top = y + (row - hr + shift.y) * px
    const nudge = WAVE[Math.floor((top + px / 2) / CELL)] ?? 0
    const right = x - (start - hc - nudge - shift.x) * px
    const w = f(len * px)
    d += `M${f(right - len * px)} ${f(top)}h${w}v${f(px * 1.04)}h-${w}z`
  }
  return d
}

/** Which cursor is showing, from the computed style of the element under it. */
function cursorKind(el: Element | null): CursorKind {
  const cursor = el ? getComputedStyle(el).cursor : ''
  if (cursor.includes('grabbing')) return 'grabbing'
  if (cursor.includes('grab')) return 'grab'
  return 'arrow'
}

/** The reflection for a cursor over the tile, or null when it isn't over it. Uses the
 *  tile's on-screen box, which already accounts for canvas pan and zoom. */
function locate(
  svg: SVGSVGElement | null,
  ptr: Pointer | null
): Omit<Reflection, 'shown'> | null {
  if (!svg || !ptr) return null
  const box = svg.getBoundingClientRect()
  if (box.width === 0) return null
  if (
    ptr.x < box.left ||
    ptr.x > box.right ||
    ptr.y < box.top ||
    ptr.y > box.bottom
  ) {
    return null
  }
  const px = 100 / box.width
  // Mirror about the vertical centre line, snapped to whole screen pixels so the
  // sprite's pixels land crisply.
  const mx = Math.round(box.left + box.right - ptr.x)
  const my = Math.round(ptr.y)
  return {
    x: (mx - box.left) * px,
    y: (my - box.top) * px,
    px,
    kind: cursorKind(ptr.target),
  }
}

// The glint rests just off the glass's left edge; the sweep steps it a whole pixel at
// a time clear past the right edge, then it jumps back unseen. A negative delay brings
// the first sweep in soon after mount. Reduced motion keeps it parked off the glass.
const GLINT_FROM = f(-(GRID + 1) * CELL)
const GLINT_TO = f(GRID * CELL)
const css = `
.cursor-mirror-glint { transform: translateX(${GLINT_FROM}px); }
@keyframes cursor-mirror-glint {
  0%, 70% { transform: translateX(${GLINT_FROM}px); }
  85%, 100% { transform: translateX(${GLINT_TO}px); }
}
@media (prefers-reduced-motion: no-preference) {
  .cursor-mirror-glint {
    animation: cursor-mirror-glint 8s steps(${2 * GRID + 1}) -4s infinite;
  }
  .cursor-mirror-reflection { transition: opacity 0.2s ease-out; }
}`

export default function CursorMirror() {
  const svg = useRef<SVGSVGElement>(null)
  /** Latest cursor position (client px) and the element under it. */
  const pointer = useRef<Pointer | null>(null)
  /** Null until the cursor first crosses the tile; then kept, so it can fade out. */
  const reflection = useRef<Reflection | null>(null)
  const [, render] = useReducer((n: number) => n + 1, 0)
  const active = useThingyActive()
  const id = useId().replace(/[^\w-]/g, '')
  const url = (name: string) => `url(#${id}-${name})`

  // The tile is pointer-events: none, so the cursor is read off the window instead —
  // passive, never captured, and only while the tile is live.
  useEffect(() => {
    if (!active) return
    const onMove = (e: PointerEvent) => {
      // A finger has no cursor to reflect.
      pointer.current =
        e.pointerType === 'touch'
          ? null
          : {
              x: e.clientX,
              y: e.clientY,
              target: e.target instanceof Element ? e.target : null,
            }
    }
    const onLeave = () => {
      pointer.current = null
    }
    window.addEventListener('pointermove', onMove, {
      passive: true,
      capture: true,
    })
    document.documentElement.addEventListener('pointerleave', onLeave)
    return () => {
      window.removeEventListener('pointermove', onMove, { capture: true })
      document.documentElement.removeEventListener('pointerleave', onLeave)
      pointer.current = null
    }
  }, [active])

  useThingyFrame(
    () => {
      const next = locate(svg.current, pointer.current)
      const prev = reflection.current
      if (next) {
        const changed =
          !prev?.shown ||
          prev.kind !== next.kind ||
          Math.abs(prev.x - next.x) > 1e-3 ||
          Math.abs(prev.y - next.y) > 1e-3 ||
          Math.abs(prev.px - next.px) > 1e-6
        if (changed) {
          reflection.current = { ...next, shown: true }
          render()
        }
      } else if (prev?.shown) {
        reflection.current = { ...prev, shown: false }
        render()
      }
    },
    { respectReducedMotion: false }
  )

  const r = reflection.current

  return (
    <svg
      ref={svg}
      viewBox="0 0 100 100"
      className="h-full w-full text-foreground"
      aria-hidden="true"
    >
      <style>{css}</style>
      <defs>
        <clipPath id={`${id}-glass`}>
          <rect x={CELL} y={CELL} width={CELL * 30} height={CELL * 30} />
        </clipPath>
        <clipPath id={`${id}-pane`}>
          <path d={PATHS.pane} />
        </clipPath>
        <clipPath id={`${id}-shard`}>
          <path d={PATHS.shard} />
        </clipPath>
      </defs>

      <g fill="currentColor">
        <path d={PATHS.glass} opacity={OPACITY[GLASS]} />
        <path d={PATHS.tarnish} opacity={OPACITY[TARNISH]} />

        {/* The reflection, drawn once per piece of glass so it breaks across the
            crack. Under the foxing (desilvered spots don't reflect) and the sheen. */}
        {r && (
          <g
            className="cursor-mirror-reflection"
            style={{ opacity: r.shown ? REFLECTION_OPACITY : 0 }}
          >
            <path
              d={reflectionPath(r, { x: 0, y: 0 })}
              clipPath={url('pane')}
            />
            <path d={reflectionPath(r, SHARD_SHIFT)} clipPath={url('shard')} />
          </g>
        )}

        <path d={PATHS.fox} opacity={OPACITY[FOX]} />
        <path d={PATHS.streak} opacity={OPACITY[STREAK]} />
        <g clipPath={url('glass')}>
          <path
            className="cursor-mirror-glint"
            d={PATHS.glint}
            opacity={GLINT_OPACITY}
          />
        </g>
        <path d={PATHS.crack} opacity={OPACITY[CRACK]} />
        <path d={PATHS.frame} />
      </g>
    </svg>
  )
}
