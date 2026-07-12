'use client'

import { ExternalLink, Trash2 } from 'lucide-react'
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
import { useDeleteArtifact } from '../api/delete-artifact'
import CopyLinkButton from './copy-link-button'
import UpdateDialog from './update-dialog'

// Fixed locale + UTC so server and client render the same string (no hydration
// mismatch).
const dateFormat = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  timeZone: 'UTC',
})

export default function ArtifactCard({ artifact }: { artifact: Artifact }) {
  const del = useDeleteArtifact()

  function handleDelete() {
    // Optimistic: the card unmounts as the list drops this slug. A failure
    // rolls the list back, so the card reappears.
    del.mutate(artifact.slug)
  }

  return (
    <Card className="bg-muted/50 h-full">
      <CardHeader>
        <CardTitle>{artifact.title}</CardTitle>
        <CardDescription>
          {artifact.updatedAt
            ? `Updated ${dateFormat.format(new Date(artifact.updatedAt))}`
            : dateFormat.format(new Date(artifact.createdAt))}{' '}
          · {artifact.slug}
        </CardDescription>
      </CardHeader>
      <CardContent className="mt-auto flex justify-end gap-1">
        <Button asChild variant="outline" size="icon">
          <a
            href={artifact.url}
            target="_blank"
            rel="noreferrer"
            aria-label="Open artifact"
            title="Open"
          >
            <ExternalLink />
          </a>
        </Button>
        <CopyLinkButton url={artifact.url} />
        <UpdateDialog artifact={artifact} />
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              aria-label="Delete artifact"
              title="Delete"
              className="text-destructive hover:text-destructive"
            >
              <Trash2 />
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
