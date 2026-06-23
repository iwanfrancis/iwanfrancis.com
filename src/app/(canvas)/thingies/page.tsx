import type { Metadata } from 'next'
import ThingyCanvas from '@/features/thingies/components/thingy-canvas'

export const metadata: Metadata = {
  title: 'Thingies — Iwan Francis',
}

export default function ThingiesPage() {
  return <ThingyCanvas />
}
