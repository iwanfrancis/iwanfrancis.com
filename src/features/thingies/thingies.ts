import type { ComponentType } from 'react'

export type ThingyEntry = {
  /** Stable id; also the folder name under `thingies/`. */
  id: string
  /** Short human name (not yet shown on the page — tiles float bare for now). */
  title: string
  /** ISO date the tile was added. */
  date: string
  /** Dynamic import of the tile's default-exported component, for code-splitting. */
  load: () => Promise<{ default: ComponentType }>
}

/**
 * The ordered list of tiles. Placement is derived from this order, so append new
 * tiles to the END — inserting mid-list would reshuffle later tiles' positions.
 * Each tile is its own chunk via the `load` dynamic import.
 *
 * To add a tile, run the `add-a-thingy` skill (it scaffolds + registers one for
 * you). The tile contract and id convention live in ./thingies/README.md.
 */
export const thingies: ThingyEntry[] = [
  {
    id: '0001-concentric-rings',
    title: 'Concentric rings',
    date: '2026-06-22',
    load: () => import('./thingies/0001-concentric-rings'),
  },
  {
    id: '0002-nested-squares',
    title: 'Nested squares',
    date: '2026-06-22',
    load: () => import('./thingies/0002-nested-squares'),
  },
  {
    id: '0003-pulse-grid',
    title: 'Pulse grid',
    date: '2026-06-22',
    load: () => import('./thingies/0003-pulse-grid'),
  },
  {
    id: '0004-orbiting-dot',
    title: 'Orbiting dot',
    date: '2026-06-22',
    load: () => import('./thingies/0004-orbiting-dot'),
  },
  {
    id: '0005-wave-bars',
    title: 'Wave bars',
    date: '2026-06-22',
    load: () => import('./thingies/0005-wave-bars'),
  },
  {
    id: '0006-rotating-arc',
    title: 'Rotating arc',
    date: '2026-06-27',
    load: () => import('./thingies/0006-rotating-arc'),
  },
  {
    id: '0007-snake',
    title: 'Snake',
    date: '2026-06-28',
    load: () => import('./thingies/0007-snake'),
  },
  {
    id: '0008-star-field',
    title: 'Star field',
    date: '2026-06-28',
    load: () => import('./thingies/0008-star-field'),
  },
  {
    id: '0009-game-of-life',
    title: 'Game of life',
    date: '2026-06-28',
    load: () => import('./thingies/0009-game-of-life'),
  },
  {
    id: '0010-spirograph',
    title: 'Spirograph',
    date: '2026-06-28',
    load: () => import('./thingies/0010-spirograph'),
  },
  {
    id: '0011-rotating-cube',
    title: 'Rotating cube',
    date: '2026-06-28',
    load: () => import('./thingies/0011-rotating-cube'),
  },
  {
    id: '0012-falling-sand',
    title: 'Falling sand',
    date: '2026-06-29',
    load: () => import('./thingies/0012-falling-sand'),
  },
  {
    id: '0013-slinky-steps',
    title: 'Slinky steps',
    date: '2026-07-05',
    load: () => import('./thingies/0013-slinky-steps'),
  },
]
