'use client'

import { Check, Copy } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/inputs/button/button'

/** Copy an artifact's share URL to the clipboard, flashing a confirmation. */
export default function CopyLinkButton({ url }: { url: string }) {
  const [copied, setCopied] = useState(false)

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      // Clipboard unavailable (e.g. insecure context) — silently no-op.
    }
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="icon"
      aria-label={copied ? 'Link copied' : 'Copy share link'}
      title={copied ? 'Copied' : 'Copy link'}
      onClick={handleCopy}
    >
      {copied ? <Check /> : <Copy />}
    </Button>
  )
}
