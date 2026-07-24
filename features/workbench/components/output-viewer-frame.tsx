import type { ReactNode } from "react"

import { ScrollArea } from "@/components/ui/scroll-area"
import { OutputActions } from "@/features/workbench/components/output-actions"
import type { OutputVariant } from "@/types/ui"

// Shared header + ScrollArea shell for every Workbench viewer — previously
// duplicated verbatim across CodeViewer, MarkdownViewer, and MermaidViewer
// (Code Review Iteration #2, High Priority 1). Each viewer keeps its own
// content-rendering logic and only supplies it as children.
export function OutputViewerFrame({
  label,
  content,
  variant,
  children,
}: {
  label: string
  content: string
  variant: OutputVariant
  children: ReactNode
}) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-muted-foreground">{label}</span>
        <OutputActions content={content} variant={variant} />
      </div>
      <ScrollArea className="h-[400px] rounded-md border bg-muted/30">{children}</ScrollArea>
    </div>
  )
}
