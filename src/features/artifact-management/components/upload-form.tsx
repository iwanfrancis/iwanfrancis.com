'use client'

import { type FormEvent, useState } from 'react'
import { Button } from '@/components/inputs/button/button'
import { Input } from '@/components/inputs/input/input'
import { Label } from '@/components/inputs/label/label'
import { useUploadArtifact } from '../api/upload-artifact'
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
  const [file, setFile] = useState<File | null>(null)
  const [slug, setSlug] = useState('')
  const [title, setTitle] = useState('')
  const [error, setError] = useState<string | null>(null)
  const upload = useUploadArtifact()

  function chooseFile(next: File | null) {
    setFile(next)
    setError(null)
    if (next && slug === '') {
      setSlug(slugFromFilename(next.name))
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!file) {
      setError('Choose a .html file or a .zip bundle first.')
      return
    }
    setError(null)

    upload.mutate(
      { file, slug, title },
      {
        onSuccess: () => {
          setFile(null)
          setSlug('')
          setTitle('')
        },
        onError: (err) => setError(err.message),
      }
    )
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <FileDropzone
        file={file}
        onFile={chooseFile}
        disabled={upload.isPending}
      />

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
        disabled={upload.isPending || !file || slug.length === 0}
      >
        {upload.isPending ? 'Uploading…' : 'Upload artifact'}
      </Button>
    </form>
  )
}
