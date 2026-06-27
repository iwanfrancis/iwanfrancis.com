import { ACTIVE_MARGIN, MOUNT_MARGIN, PITCH, TILE_SIZE } from '../constants'

/** A snapshot of the pan/zoom surface, in screen px and scale. */
export type Viewport = {
  vw: number
  vh: number
  offsetX: number
  offsetY: number
  scale: number
}

/** A rectangle in layer-local (tile) coordinates. */
export type Rect = { left: number; right: number; top: number; bottom: number }

export type Bands = {
  /** Tiles intersecting this rect stay mounted. */
  mount: Rect
  /** Tiles intersecting this rect keep animating; mounted tiles outside it freeze. */
  active: Rect
  /** Changes only when the mount rect shifts by ~one cell — a cheap gate so the
   *  caller re-renders on band changes, not on every sub-pixel pan frame. */
  key: string
}

const expand = (r: Rect, m: number): Rect => ({
  left: r.left - m,
  right: r.right + m,
  top: r.top - m,
  bottom: r.bottom + m,
})

/**
 * Invert the layer transform to the visible world rect, then derive the mount and
 * active bands from it.
 *
 * The tiles layer sits at the viewport centre with `transform-origin: 0 0` and
 * transform `translate(offset) scale(scale)`, so a screen point p maps to
 * layer-local coords by `local = (p − centre − offset) / scale` (centre = vw/2,
 * vh/2). Dividing by `scale` makes the band zoom-aware for free: zooming out
 * (smaller scale) widens the world rect and mounts more tiles. Margins are in
 * world px, so they stay constant across zoom.
 */
export function computeBands(
  { vw, vh, offsetX, offsetY, scale }: Viewport,
  activeMargin = ACTIVE_MARGIN,
  mountMargin = MOUNT_MARGIN
): Bands {
  const world: Rect = {
    left: (-vw / 2 - offsetX) / scale,
    right: (vw / 2 - offsetX) / scale,
    top: (-vh / 2 - offsetY) / scale,
    bottom: (vh / 2 - offsetY) / scale,
  }
  const mount = expand(world, mountMargin)
  const active = expand(world, activeMargin)
  const cell = (v: number) => Math.round(v / PITCH)
  const key = `${cell(mount.left)}:${cell(mount.right)}:${cell(mount.top)}:${cell(mount.bottom)}`
  return { mount, active, key }
}

/** Whether a TILE_SIZE square at layer-local (left, top) intersects `rect`. */
export function intersects(rect: Rect, left: number, top: number): boolean {
  return (
    left + TILE_SIZE >= rect.left &&
    left <= rect.right &&
    top + TILE_SIZE >= rect.top &&
    top <= rect.bottom
  )
}
