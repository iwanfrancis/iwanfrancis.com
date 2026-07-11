'use client'

import { ExternalLink, Trash2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/data-display/card/card'
import { Button } from '@/components/inputs/button/button'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/layout/alert-dialog/alert-dialog'
import type { Artifact } from '@/features/artifact-management/types/artifact'
import CopyLinkButton from './copy-link-button'

// Fixed locale + UTC so server and client render the same string (no hydration
// mismatch).
const dateFormat = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  timeZone: 'UTC',
})

export default function ArtifactCard({ artifact }: { artifact: Artifact }) {
  const router = useRouter()
  const [deleting, setDeleting] = useState(false)

  async function handleDelete() {
    setDeleting(true)
    const response = await fetch(`/api/artifacts/${artifact.slug}`, {
      method: 'DELETE',
    })
    if (response.ok) {
      router.refresh()
      return
    }
    setDeleting(false)
  }

  return (
    <Card className="bg-muted/50 h-full">
      <CardHeader>
        <CardTitle>{artifact.title}</CardTitle>
        <CardDescription>
          {dateFormat.format(new Date(artifact.createdAt))} · {artifact.slug}
        </CardDescription>
      </CardHeader>
      <CardContent className="mt-auto grid grid-cols-3 gap-2">
        <Button asChild variant="outline" size="sm" className="w-full">
          <a href={artifact.url} target="_blank" rel="noreferrer">
            <ExternalLink />
            Open
          </a>
        </Button>
        <CopyLinkButton url={artifact.url} />
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              variant="destructive"
              size="sm"
              className="w-full"
              disabled={deleting}
            >
              <Trash2 />
              {deleting ? 'Deleting…' : 'Delete'}
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete “{artifact.title}”?</AlertDialogTitle>
              <AlertDialogDescription>
                This removes every file under {artifact.slug}/ and the share
                link stops working. It can’t be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete}>
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  )
}
