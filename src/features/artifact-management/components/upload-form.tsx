'use client'

import { useRouter } from 'next/navigation'
import { type FormEvent, useState } from 'react'
import { Button } from '@/components/inputs/button/button'
import { Input } from '@/components/inputs/input/input'
import { Label } from '@/components/inputs/label/label'
import FileDropzone from './file-dropzone'

/** Derive a contract-valid slug suggestion from a chosen filename. */
function slugFromFilename(name: string): string {
  return name
    .replace(/\.[^.]+$/, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export default function UploadForm() {
  const router = useRouter()
  const [file, setFile] = useState<File | null>(null)
  const [slug, setSlug] = useState('')
  const [title, setTitle] = useState('')
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function chooseFile(next: File | null) {
    setFile(next)
    setError(null)
    if (next && slug === '') {
      setSlug(slugFromFilename(next.name))
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
    body.set('slug', slug)
    body.set('title', title)

    const response = await fetch('/api/artifacts', { method: 'POST', body })
    if (response.ok) {
      setFile(null)
      setSlug('')
      setTitle('')
      setPending(false)
      router.refresh()
      return
    }

    const data = (await response.json().catch(() => null)) as {
      error?: string
    } | null
    setError(data?.error ?? 'Upload failed.')
    setPending(false)
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <FileDropzone file={file} onFile={chooseFile} disabled={pending} />

      <div className="flex flex-col gap-2">
        <Label htmlFor="artifact-slug">Slug</Label>
        <Input
          id="artifact-slug"
          name="slug"
          value={slug}
          onChange={(event) => setSlug(event.target.value)}
          placeholder="my-demo"
          autoComplete="off"
          spellCheck={false}
        />
        <p className="text-muted-foreground text-xs">
          Lowercase letters, digits and single hyphens — becomes the share-link
          path.
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="artifact-title">Title</Label>
        <Input
          id="artifact-title"
          name="title"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="Defaults to the slug"
          autoComplete="off"
        />
      </div>

      {error && (
        <p role="alert" className="text-destructive text-sm">
          {error}
        </p>
      )}

      <Button
        type="submit"
        className="w-full"
        disabled={pending || !file || slug.length === 0}
      >
        {pending ? 'Uploading…' : 'Upload artifact'}
      </Button>
    </form>
  )
}
