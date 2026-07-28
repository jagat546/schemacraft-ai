"use client"

import { useState } from "react"
import { DownloadIcon, Loader2Icon } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { buildExportZip } from "@/features/ai-workspace/lib/export-bundle"
import { downloadBlob } from "@/lib/download"
import type { GeneratedSchema } from "@/types/schema"

// Generator-Experience-Specification.md §Export UX: one click, one
// download, all artifacts bundled -- additive to, not a replacement for,
// each artifact's own per-tab copy/download (OutputActions).
export function ExportAllButton({ result }: { result: GeneratedSchema }) {
  const [isExporting, setIsExporting] = useState(false)

  async function handleExport() {
    setIsExporting(true)
    try {
      const blob = await buildExportZip(result)
      downloadBlob("schema-export.zip", blob)
      toast.success("Downloaded schema-export.zip")
    } catch {
      toast.error("Couldn't build the export. Please try again.")
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <Button variant="outline" size="sm" onClick={handleExport} disabled={isExporting}>
      {isExporting ? <Loader2Icon className="animate-spin" /> : <DownloadIcon />}
      {isExporting ? "Exporting…" : "Export all"}
    </Button>
  )
}
