/**
 * Shared presentation for modal overlay content: a centred dialog at the `sm`
 * breakpoint and above, a bottom-anchored sheet below it. Consumed by both
 * `DialogContent` and `AlertDialogContent` so the two can't drift.
 *
 * Enter/exit direction is split by media query on purpose: `max-sm:` slides from
 * the bottom, `sm:` zooms. Because the tw-animate custom properties default to
 * identity outside their own breakpoint, exactly one transform is ever active —
 * no cancellation, no conflict. The `sm:` half reproduces today's centred dialog
 * exactly, so the desktop presentation is unchanged.
 */
export const bottomSheetContent =
  // Shared: surface, fade, timing.
  'bg-background fixed z-50 grid w-full gap-4 border p-6 shadow-lg duration-200 ' +
  'data-[state=open]:animate-in data-[state=closed]:animate-out ' +
  'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 ' +
  // Mobile: bottom sheet — full-width, rounded top, slides up from the bottom.
  'max-sm:inset-x-0 max-sm:bottom-0 max-sm:max-h-[90dvh] max-sm:overflow-y-auto ' +
  'max-sm:rounded-t-lg max-sm:border-b-0 ' +
  'max-sm:data-[state=open]:slide-in-from-bottom ' +
  'max-sm:data-[state=closed]:slide-out-to-bottom ' +
  // Desktop: centred dialog — unchanged from before this change.
  'sm:top-1/2 sm:left-1/2 sm:max-w-lg sm:-translate-x-1/2 sm:-translate-y-1/2 ' +
  'sm:rounded-lg ' +
  'sm:data-[state=open]:zoom-in-95 sm:data-[state=closed]:zoom-out-95'
