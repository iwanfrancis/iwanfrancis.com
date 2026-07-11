'use client'

import { Pencil } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { type FormEvent, useState } from 'react'
import { Button } from '@/components/inputs/button/button'
import { Input } from '@/components/inputs/input/input'
import { Label } from '@/components/inputs/label/label'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/layout/dialog/dialog'
import type { Artifact } from '@/features/artifact-management/types/artifact'
import FileDropzone from './file-dropzone'

/**
 * Replace the files behind an existing artifact. Scoped to one slug: the slug is
 * fixed (shown read-only so it can't be retargeted), the current title is
 * prefilled, and dropping a new file replaces the content via `PUT`. The share
 * link stays the same.
 */
export default function UpdateDialog({ artifact }: { artifact: Artifact }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [title, setTitle] = useState(artifact.title)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function handleOpenChange(next: boolean) {
    setOpen(next)
    if (!next) {
      // Reset to the artifact's current state whenever the dialog closes.
      setFile(null)
      setTitle(artifact.title)
      setError(null)
      setPending(false)
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!file) {
      setError('Choose a .html file or a .zip bundle first.')
      return
    }
    setPending(true)
    setError(null)

    const body = new FormData()
    body.set('file', file)
    body.set('title', title)

    const response = await fetch(`/api/artifacts/${artifact.slug}`, {
      method: 'PUT',
      body,
    })
    if (response.ok) {
      handleOpenChange(false)
      router.refresh()
      return
    }

    const data = (await response.json().catch(() => null)) as {
      error?: string
    } | null
    setError(data?.error ?? 'Update failed.')
    setPending(false)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          aria-label="Update artifact"
          title="Update"
        >
          <Pencil />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Update “{artifact.title}”</DialogTitle>
          <DialogDescription>
            Replace the files behind this artifact. The share link stays the
            same.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="update-slug">Slug</Label>
            <Input
              id="update-slug"
              value={artifact.slug}
              readOnly
              disabled
              aria-label="Slug (cannot be changed)"
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="update-title">Title</Label>
            <Input
              id="update-title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder={artifact.slug}
              autoComplete="off"
            />
          </div>

          <FileDropzone file={file} onFile={setFile} disabled={pending} />

          {error && (
            <p role="alert" className="text-destructive text-sm">
              {error}
            </p>
          )}

          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline">
                Cancel
              </Button>
            </DialogClose>
            <Button type="submit" disabled={pending || !file}>
              {pending ? 'Replacing…' : 'Replace files'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
