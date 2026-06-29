/**
 * Return a new array with the same items in a uniformly random order
 * (Fisher–Yates). The input is not mutated.
 *
 * Used to reshuffle the blob's tile→cell assignment: shuffling the cells a tile
 * list is zipped against permutes which tile sits in each cell while leaving the
 * set of cells — and so the blob's shape — unchanged. Plain `Math.random`: this
 * runs only on an explicit visitor action, so it carries no SSR/determinism
 * constraint (unlike the seeded placement in `place-tiles.ts`).
 */
export function shuffle<T>(items: readonly T[]): T[] {
  const out = items.slice()
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}
