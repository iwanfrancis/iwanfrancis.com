import type * as React from 'react'
import { cn } from '@/utils/cn'

/**
 * The drag affordance at the top of a mobile bottom sheet. Hidden at `sm` and
 * above, and rendered only for draggable (non-destructive) sheets. The drag
 * hook's gesture binding is spread onto it via `...props`; `touch-none` stops the
 * browser from scrolling while a drag is in progress.
 */
function SheetGrabber({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="sheet-grabber"
      className={cn(
        'absolute inset-x-0 top-0 flex h-6 touch-none items-center justify-center sm:hidden',
        className
      )}
      {...props}
    >
      <div className="bg-muted-foreground/30 h-1.5 w-10 rounded-full" />
    </div>
  )
}

export default SheetGrabber
