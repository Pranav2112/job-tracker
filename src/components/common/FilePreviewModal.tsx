import { useState, useEffect } from 'react'
import { X, Download, ExternalLink, FileText, Loader2, ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { supabase } from '@/lib/supabase'
import type { Document } from '@/types'

interface FilePreviewModalProps {
  document: Document | null
  open: boolean
  onClose: () => void
}

function mimeType(filename: string): string {
  const ext = filename.toLowerCase().split('.').pop()
  switch (ext) {
    case 'pdf':  return 'application/pdf'
    case 'png':  return 'image/png'
    case 'jpg':
    case 'jpeg': return 'image/jpeg'
    case 'gif':  return 'image/gif'
    case 'webp': return 'image/webp'
    default:     return 'application/octet-stream'
  }
}

export function FilePreviewModal({ document: doc, open, onClose }: FilePreviewModalProps) {
  const [blobUrl, setBlobUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open || !doc) { cleanup(); return }
    cleanup()
    loadFile()
  }, [open, doc?.id])

  // Lock body scroll when open, restore previous value on close
  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [open])

  function cleanup() {
    setBlobUrl(prev => { if (prev?.startsWith('blob:')) URL.revokeObjectURL(prev); return null })
    setError(null)
    setLoading(false)
  }

  async function loadFile() {
    if (!doc) return

    if (doc.file_url && !doc.storage_path) {
      setBlobUrl(doc.file_url)
      return
    }
    if (!doc.storage_path) return

    setLoading(true)
    try {
      const { data, error } = await supabase.storage.from('documents').download(doc.storage_path)
      if (error) throw error
      const typed = new Blob([await data.arrayBuffer()], { type: mimeType(doc.file_name) })
      setBlobUrl(URL.createObjectURL(typed))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load file.')
    } finally {
      setLoading(false)
    }
  }

  function handleClose() {
    cleanup()
    onClose()
  }

  function handleDownload() {
    if (!blobUrl || !doc) return
    const a = document.createElement('a')
    a.href = blobUrl
    a.download = doc.file_name
    a.click()
  }

  const isPdf   = doc?.file_name?.toLowerCase().endsWith('.pdf') ?? false
  const isImage = !!doc?.file_name?.match(/\.(png|jpg|jpeg|gif|webp)$/i)

  if (!open) return null

  return (
    // Full-screen overlay — sits above everything
    <div className="fixed inset-0 z-50 flex flex-col bg-zinc-900">

      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-3 bg-zinc-800 border-b border-zinc-700 shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <Button
            variant="ghost"
            size="sm"
            className="text-zinc-300 hover:text-white hover:bg-zinc-700 shrink-0 gap-1.5"
            onClick={handleClose}
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
          <div className="h-4 w-px bg-zinc-600 shrink-0" />
          <div className="flex items-center gap-2 min-w-0">
            <FileText className="h-4 w-4 text-zinc-400 shrink-0" />
            <span className="text-sm text-zinc-200 font-medium truncate">{doc?.file_name}</span>
            {doc?.version_label && (
              <span className="text-xs text-zinc-400 shrink-0">· {doc.version_label}</span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {blobUrl && !doc?.file_url && (
            <Button
              variant="ghost"
              size="sm"
              className="text-zinc-300 hover:text-white hover:bg-zinc-700 gap-1.5"
              onClick={handleDownload}
            >
              <Download className="h-3.5 w-3.5" /> Download
            </Button>
          )}
          {blobUrl && (
            <Button variant="ghost" size="sm" className="text-zinc-300 hover:text-white hover:bg-zinc-700 gap-1.5" asChild>
              <a href={blobUrl} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-3.5 w-3.5" /> New tab
              </a>
            </Button>
          )}
          <button
            onClick={handleClose}
            className="ml-1 rounded-md p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-700 transition-colors"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Content area */}
      <div className="flex-1 overflow-hidden relative">
        {loading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-zinc-400">
            <Loader2 className="h-8 w-8 animate-spin" />
            <p className="text-sm">Loading…</p>
          </div>
        )}

        {error && !loading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 px-8 text-center">
            <FileText className="h-10 w-10 text-zinc-500" />
            <p className="text-sm text-red-400">{error}</p>
            <Button variant="outline" size="sm" onClick={loadFile} className="border-zinc-600 text-zinc-300 hover:bg-zinc-700">
              Try again
            </Button>
          </div>
        )}

        {/* PDF — using <object> for maximum browser compatibility */}
        {!loading && !error && blobUrl && isPdf && (
          <object
            data={blobUrl}
            type="application/pdf"
            className="w-full h-full"
            aria-label={doc?.file_name}
          >
            {/* Fallback if browser blocks object embed */}
            <div className="h-full flex flex-col items-center justify-center gap-4 text-zinc-400">
              <FileText className="h-10 w-10 opacity-40" />
              <p className="text-sm">Your browser can't preview this PDF inline.</p>
              <div className="flex gap-2">
                <Button size="sm" onClick={handleDownload} className="gap-1.5">
                  <Download className="h-3.5 w-3.5" /> Download
                </Button>
                <Button variant="outline" size="sm" className="border-zinc-600 text-zinc-300 gap-1.5" asChild>
                  <a href={blobUrl} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-3.5 w-3.5" /> Open in new tab
                  </a>
                </Button>
              </div>
            </div>
          </object>
        )}

        {/* Image */}
        {!loading && !error && blobUrl && isImage && (
          <div className="h-full flex items-center justify-center p-6">
            <img
              src={blobUrl}
              alt={doc?.file_name ?? 'Preview'}
              className="max-h-full max-w-full object-contain rounded shadow-lg"
            />
          </div>
        )}

        {/* Unsupported */}
        {!loading && !error && blobUrl && !isPdf && !isImage && (
          <div className="h-full flex flex-col items-center justify-center gap-4 text-zinc-400">
            <FileText className="h-12 w-12 opacity-30" />
            <p className="text-zinc-200 font-medium text-sm">{doc?.file_name}</p>
            <p className="text-sm">This file type can't be previewed.</p>
            <Button size="sm" onClick={handleDownload} className="gap-1.5">
              <Download className="h-3.5 w-3.5" /> Download to open
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
