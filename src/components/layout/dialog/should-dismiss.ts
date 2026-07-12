/** Fraction of the sheet height a downward drag must pass to dismiss on release. */
export const DISMISS_DISTANCE_FRACTION = 0.35
/** Downward release velocity (px/ms) that dismisses regardless of distance. */
export const DISMISS_VELOCITY_THRESHOLD = 0.5

type DragRelease = {
  /** Downward drag distance at release, in px (negative means dragged upward). */
  distance: number
  /** Sheet height in px. */
  height: number
  /** Downward release velocity in px/ms (0 when the release was not downward). */
  velocity: number
}

/**
 * Pure decision for a drawer drag release: dismiss when the sheet was dragged
 * past a fraction of its height, OR flicked down fast enough; otherwise snap
 * back. DOM-free so it can be unit-tested directly.
 */
export function shouldDismiss({ distance, height, velocity }: DragRelease) {
  if (height <= 0) return false
  return (
    distance > height * DISMISS_DISTANCE_FRACTION ||
    velocity > DISMISS_VELOCITY_THRESHOLD
  )
}
