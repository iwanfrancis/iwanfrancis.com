'use client'

import { UploadCloud } from 'lucide-react'
import {
  type ChangeEvent,
  type DragEvent,
  useEffect,
  useRef,
  useState,
} from 'react'
import { cn } from '@/utils/cn'

/** Extensions the upload/update endpoints accept. */
const ACCEPT = '.html,.htm,.zip'

/**
 * Drag-and-drop / click-to-choose file picker, shared by the create form and
 * the update dialog. Controlled via `file`/`onFile`; clears the native input
 * whenever `file` becomes null so the same file can be re-picked after a reset.
 */
export default function FileDropzone({
  file,
  onFile,
  disabled,
}: {
  file: File | null
  onFile: (file: File | null) => void
  disabled?: boolean
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)

  useEffect(() => {
    if (file === null && inputRef.current) {
      inputRef.current.value = ''
    }
  }, [file])

  function handleDrop(event: DragEvent<HTMLButtonElement>) {
    event.preventDefault()
    setDragging(false)
    const dropped = event.dataTransfer.files?.[0]
    if (dropped) {
      onFile(dropped)
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        onDragOver={(event) => {
          event.preventDefault()
          setDragging(true)
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        disabled={disabled}
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
        accept={ACCEPT}
        className="hidden"
        onChange={(event: ChangeEvent<HTMLInputElement>) =>
          onFile(event.target.files?.[0] ?? null)
        }
      />
    </>
  )
}
