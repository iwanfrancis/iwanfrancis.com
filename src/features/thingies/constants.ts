/** Tile edge length in px. A multiple of the 20px matrix dot pitch. */
export const TILE_SIZE = 100
/** Gap between adjacent tiles in px, so the dot grid shows as a thin seam. */
export const GUTTER = 2
/** Centre-to-centre distance between adjacent cells in px. */
export const PITCH = TILE_SIZE + GUTTER
/** Fixed seed for deterministic placement jitter. */
export const SEED = 0x7a9e1c3d
