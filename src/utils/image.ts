import { Breakpoint, BREAKPOINTS } from '@/config/breakpoints'
import { notEmpty } from './array-filters'

type SrcSetOptions = {
  sizes: {
    [key in Breakpoint]?: number
  }
}

export function generateImageSizes({ sizes }: SrcSetOptions): string {
  const providedSizes = Object.entries(sizes).filter(notEmpty)

  return providedSizes.reduce((sizesString, size, index) => {
    const [breakpoint, value] = size

    if (index < providedSizes.length - 1) {
      const maxWidth = BREAKPOINTS[breakpoint as Breakpoint]
      sizesString += `(max-width: ${maxWidth}px) ${value}vw, `
    } else {
      // We add the last breakpoint without a max-width so that it acts as a catch all above that point
      sizesString += `${value}vw`
    }

    return sizesString
  }, '')
}
