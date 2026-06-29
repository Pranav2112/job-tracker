import { useState } from 'react'
import { ExternalLink, FileText, Loader2 } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { supabase } from '@/lib/supabase'
import type { Document } from '@/types'

interface FilePreviewModalProps {
  document: Document | null
  open: boolean
  onClose: () => void
}

export function FilePreviewModal({ document: doc, open, onClose }: FilePreviewModalProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function loadPreview() {
    if (!doc) return
    if (doc.file_url) { setPreviewUrl(doc.file_url); return }
    if (!doc.storage_path) return
    setLoading(true)
    setError(null)
    try {
      const { data, error } = await supabase.storage
        .from('documents')
        .createSignedUrl(doc.storage_path, 3600)
      if (error) throw error
      setPreviewUrl(data.signedUrl)
    } catch (e) {
      setError('Could not load preview. ' + (e instanceof Error ? e.message : ''))
    } finally {
      setLoading(false)
    }
  }

  function handleOpenChange(isOpen: boolean) {
    if (isOpen) { setPreviewUrl(null); loadPreview() }
    else { setPreviewUrl(null); setError(null) }
    if (!isOpen) onClose()
  }

  const isPdf = doc?.file_name?.toLowerCase().endsWith('.pdf') || doc?.file_url?.toLowerCase().includes('.pdf')
  const isImage = doc?.file_name?.match(/\.(png|jpg|jpeg|gif|webp)$/i)

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-4xl h-[85vh] flex flex-col p-0 gap-0">
        <DialogHeader className="px-6 py-4 border-b shrink-0">
          <div className="flex items-center justify-between pr-8">
            <DialogTitle className="flex items-center gap-2 text-base">
              <FileText className="h-4 w-4 text-muted-foreground" />
              {doc?.file_name}
              {doc?.version_label && <span className="text-xs text-muted-foreground font-normal">({doc.version_label})</span>}
            </DialogTitle>
            {previewUrl && (
              <Button variant="outline" size="sm" asChild>
                <a href={previewUrl} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-3.5 w-3.5 mr-1" /> Open in new tab
                </a>
              </Button>
            )}
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-hidden bg-muted/30">
          {loading && (
            <div className="h-full flex items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          )}
          {error && (
            <div className="h-full flex items-center justify-center text-sm text-destructive">{error}</div>
          )}
          {!loading && !error && previewUrl && isPdf && (
            <iframe src={previewUrl} className="w-full h-full border-0" title={doc?.file_name ?? 'Document preview'} />
          )}
          {!loading && !error && previewUrl && isImage && (
            <div className="h-full flex items-center justify-center p-4">
              <img src={previewUrl} alt={doc?.file_name ?? 'Document'} className="max-h-full max-w-full object-contain rounded" />
            </div>
          )}
          {!loading && !error && previewUrl && !isPdf && !isImage && (
            <div className="h-full flex flex-col items-center justify-center gap-3 text-sm text-muted-foreground">
              <FileText className="h-10 w-10" />
              <p>Preview not available for this file type.</p>
              <Button variant="outline" size="sm" asChild>
                <a href={previewUrl} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-3.5 w-3.5 mr-1" /> Download / Open
                </a>
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
