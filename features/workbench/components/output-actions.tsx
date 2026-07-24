"use client"

import { Check, Copy, Download } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { useCopyToClipboard } from "@/hooks/use-copy-to-clipboard"
import { OUTPUT_CONFIG } from "@/features/workbench/lib/output-config"
import { downloadTextFile } from "@/lib/download"
import type { OutputVariant } from "@/types/ui"

export function OutputActions({
  content,
  variant,
}: {
  content: string
  variant: OutputVariant
}) {
  const { copied, copy } = useCopyToClipboard()
  const config = OUTPUT_CONFIG[variant]

  async function handleCopy() {
    const ok = await copy(content)
    if (ok) {
      toast.success(`Copied ${config.label}`)
    } else {
      toast.error(`Couldn't copy ${config.label}. Your browser may have blocked clipboard access.`)
    }
  }

  function handleDownload() {
    downloadTextFile(config.filename, content, config.mimeType)
    toast.success(`Downloaded ${config.filename}`)
  }

  return (
    <TooltipProvider>
      <div className="flex items-center gap-1">
        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label={`Copy ${config.label}`}
                onClick={handleCopy}
              />
            }
          >
            {copied ? <Check /> : <Copy />}
          </TooltipTrigger>
          <TooltipContent>{copied ? "Copied" : `Copy ${config.label}`}</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label={`Download ${config.filename}`}
                onClick={handleDownload}
              />
            }
          >
            <Download />
          </TooltipTrigger>
          <TooltipContent>{`Download ${config.filename}`}</TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  )
}
