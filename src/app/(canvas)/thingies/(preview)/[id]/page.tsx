import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import TilePreview from '@/features/thingies/components/tile-preview'
import { thingies } from '@/features/thingies/thingies'
import { findThingy } from '@/features/thingies/utils/find-thingy'

type PageProps = { params: Promise<{ id: string }> }

/** Pre-render the canonical full-id page for every tile. Bare-number URLs
 *  (`/thingies/13`) aren't listed here — they render on demand and redirect to the
 *  canonical id below. */
export function generateStaticParams() {
  return thingies.map((t) => ({ id: t.id }))
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { id } = await params
  const resolved = findThingy(id)
  if (!resolved) return { title: 'Thingy not found — Iwan Francis' }
  return {
    title: `${resolved.entry.title} — Thingies — Iwan Francis`,
    // Direct-URL preview utility: keep it out of search results.
    robots: { index: false },
  }
}

export default async function ThingyPreviewPage({ params }: PageProps) {
  const { id } = await params
  const resolved = findThingy(id)
  if (!resolved) notFound()
  // Canonicalise a bare-number hit (`13`, `0013`) to the full-id URL.
  if (!resolved.canonical) redirect(`/thingies/${resolved.entry.id}`)

  const { entry } = resolved
  const index = thingies.findIndex((t) => t.id === entry.id)
  // Clamped, not wrapping: the first tile has no prev, the last no next.
  const prev = index > 0 ? thingies[index - 1] : null
  const next = index < thingies.length - 1 ? thingies[index + 1] : null

  return (
    // The ambient background (bg-matrix + LavaBackground) lives in the layout so it
    // survives navigation between tiles; this page just sits above it (z-20).
    <main className="relative z-20 flex h-full flex-col items-center justify-center gap-8 px-6">
      <TilePreview id={entry.id} />

      {/* Fixed to the tile's width so caption and nav never reflow between tiles:
          the caption stays centred and prev/next are pinned to the two edges, so a
          longer or shorter neighbour title can't shift the row's position. Each text
          element gets an opaque bg-background plate so it reads cleanly over the
          dot matrix rather than fighting the dots. */}
      <div className="flex w-[min(80vmin,640px)] flex-col items-center gap-3">
        <p className="rounded-md bg-background px-3 py-1 text-center font-mono text-muted-foreground text-sm">
          {entry.id} · {entry.title} · {entry.date}
        </p>
        <nav className="flex w-full items-center justify-between text-sm">
          {prev ? (
            <Link
              href={`/thingies/${prev.id}`}
              className="whitespace-nowrap rounded-md bg-background px-2.5 py-1 text-muted-foreground transition-colors hover:text-foreground"
            >
              ‹ {prev.title}
            </Link>
          ) : (
            <span className="whitespace-nowrap rounded-md bg-background px-2.5 py-1 text-muted-foreground/40">
              ‹ prev
            </span>
          )}
          {next ? (
            <Link
              href={`/thingies/${next.id}`}
              className="whitespace-nowrap rounded-md bg-background px-2.5 py-1 text-muted-foreground transition-colors hover:text-foreground"
            >
              {next.title} ›
            </Link>
          ) : (
            <span className="whitespace-nowrap rounded-md bg-background px-2.5 py-1 text-muted-foreground/40">
              next ›
            </span>
          )}
        </nav>
      </div>
    </main>
  )
}
