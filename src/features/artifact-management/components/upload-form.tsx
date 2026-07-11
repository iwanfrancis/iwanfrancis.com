'use client'

import { UploadCloud } from 'lucide-react'
import { useRouter } from 'next/navigation'
import {
  type ChangeEvent,
  type DragEvent,
  type FormEvent,
  useRef,
  useState,
} from 'react'
import { Button } from '@/components/inputs/button/button'
import { Input } from '@/components/inputs/input/input'
import { Label } from '@/components/inputs/label/label'
import { cn } from '@/utils/cn'

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
  const inputRef = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<File | null>(null)
  const [slug, setSlug] = useState('')
  const [title, setTitle] = useState('')
  const [dragging, setDragging] = useState(false)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function chooseFile(next: File | null) {
    setFile(next)
    setError(null)
    if (next && slug === '') {
      setSlug(slugFromFilename(next.name))
    }
  }

  function handleDrop(event: DragEvent<HTMLButtonElement>) {
    event.preventDefault()
    setDragging(false)
    const dropped = event.dataTransfer.files?.[0]
    if (dropped) {
      chooseFile(dropped)
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
      if (inputRef.current) {
        inputRef.current.value = ''
      }
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
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        onDragOver={(event) => {
          event.preventDefault()
          setDragging(true)
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        className={cn(
          'flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed p-8 text-center text-sm transition-colors',
          dragging
            ? 'border-primary bg-accent'
            : 'border-input hover:bg-accent/50'
        )}
      >
        <UploadCloud className="text-muted-foreground size-6" />
        {file ? (
          <span className="font-medium">{file.name}</span>
        ) : (
          <span className="text-muted-foreground">
            Drag &amp; drop a .html or .zip, or click to choose
          </span>
        )}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept=".html,.htm,.zip"
        className="hidden"
        onChange={(event: ChangeEvent<HTMLInputElement>) =>
          chooseFile(event.target.files?.[0] ?? null)
        }
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
        disabled={pending || !file || slug.length === 0}
      >
        {pending ? 'Uploading…' : 'Upload artifact'}
      </Button>
    </form>
  )
}
