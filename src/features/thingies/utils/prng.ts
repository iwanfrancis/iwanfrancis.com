import { SEED } from '../constants'

/**
 * mulberry32 — a tiny, fast, deterministic PRNG. Given a 32-bit seed it returns
 * a function yielding floats in [0, 1). Same seed, same sequence — no global
 * state, so it's safe to use for reproducible layout.
 */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/**
 * A deterministic value in [0, 1) for a lattice cell. Order- and
 * count-independent — it depends only on the cell coordinates and the fixed
 * SEED — so a tile's jitter never changes as other tiles are added.
 */
export function cellNoise(col: number, row: number): number {
  const seed =
    (Math.imul(col, 73856093) ^ Math.imul(row, 19349663) ^ SEED) >>> 0
  return mulberry32(seed)()
}
