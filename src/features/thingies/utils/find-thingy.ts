import { type ThingyEntry, thingies } from '../thingies'

export type ResolvedThingy = {
  entry: ThingyEntry
  /** True when the incoming segment was already the canonical full id (`NNNN-slug`).
   *  A bare-number hit is non-canonical, so the route can redirect it to the full id. */
  canonical: boolean
}

/**
 * Resolve a `/thingies/[id]` URL segment to a registry entry. Accepts either the
 * full id (`NNNN-kebab-name`) or a bare number (`13`, `0013`): a bare number is
 * zero-padded to four digits and matched against the `NNNN-` id prefix. Ids are
 * unique per number, so a numeric segment matches at most one tile. Returns the
 * entry plus whether the segment was already canonical, or null when nothing matches.
 */
export function findThingy(segment: string): ResolvedThingy | null {
  if (/^\d{1,4}$/.test(segment)) {
    const padded = segment.padStart(4, '0')
    const entry = thingies.find((t) => t.id.startsWith(`${padded}-`))
    return entry ? { entry, canonical: false } : null
  }
  const entry = thingies.find((t) => t.id === segment)
  return entry ? { entry, canonical: true } : null
}
