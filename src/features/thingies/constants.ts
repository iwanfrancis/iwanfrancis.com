/** Tile edge length in px. A multiple of the 20px matrix dot pitch. */
export const TILE_SIZE = 100
/** Gap between adjacent tiles in px. Zero, so tiles sit flush and no dot grid
 *  shows between them — the matrix only frames the blob's outer edge. */
export const GUTTER = 0
/** Centre-to-centre distance between adjacent cells in px. With GUTTER = 0 this
 *  equals TILE_SIZE (100), a whole 5× the 20px dot pitch, so every tile — not
 *  just the first — lands exactly on the dot grid. */
export const PITCH = TILE_SIZE + GUTTER
/** Per-tile inner safe-area inset in px, proportional to TILE_SIZE so it holds
 *  under zoom and any size change. Content is inset by this on every side, so two
 *  flush tiles keep 2 × TILE_PADDING of breathing room between their drawings. */
export const TILE_PADDING = Math.round(TILE_SIZE * 0.05)
/** Opaque outset (px) painted just past each frame's edge to cover the sub-pixel
 *  hairline that flush tiles can leave at fractional zoom. Kept ≤ TILE_PADDING so
 *  it never reaches drawn content. */
export const BLEED = 1
/** Fixed seed for deterministic placement jitter. */
export const SEED = 0x7a9e1c3d

// --- Pan tunables ---------------------------------------------------------
/** How far past the tiles' edge a visitor may overscroll, in px. */
export const EDGE_MARGIN = 140
/** Per-frame velocity decay during a fling. */
export const FRICTION = 0.92
/** Below this px/frame the fling stops. */
export const MIN_VELOCITY = 0.25
/** Converts @use-gesture drag velocity (px/ms) to the fling's px/frame. Tunable. */
export const FLING_SPEED = 16

// --- Windowing tunables (world px; felt out in-browser, like JITTER) -------
/** How far past the viewport a tile keeps animating. Inside this band tiles are
 *  mounted AND active; just beyond it they freeze. A small hysteresis so tiles
 *  at the very edge don't flicker between animating and frozen. */
export const ACTIVE_MARGIN = 80
/** How far past the viewport a tile stays mounted (frozen) before it unmounts.
 *  Larger than ACTIVE_MARGIN so the frozen band absorbs fast pans and the actual
 *  teardown happens well away from the visible edge — no unmount stutter. */
export const MOUNT_MARGIN = 320

// --- Zoom tunables (felt out in-browser, like JITTER) ---------------------
/** Minimum zoom scale (zoomed out). */
export const MIN_SCALE = 0.4
/** Maximum zoom scale (zoomed in). */
export const MAX_SCALE = 3
/** Scale change per px of (normalised) wheel deltaY: factor = exp(-dy * this). */
export const WHEEL_ZOOM_SPEED = 0.008
/** Scale multiplier applied per +/- control or keyboard zoom step. */
export const ZOOM_STEP = 1.3
/** Duration of an animated (button/keyboard) zoom, in ms. */
export const ZOOM_ANIM_MS = 200
/** Idle gap (ms) after the last wheel event that ends a wheel "session". Within a
 *  session the zoom-vs-pan mode is locked, so one continuous scroll can't flip
 *  between zooming and panning mid-gesture. */
export const WHEEL_SESSION_GAP = 140
