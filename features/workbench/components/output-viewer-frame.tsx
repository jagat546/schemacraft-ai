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
  scrollable = true,
  headerExtra,
  children,
}: {
  label: string
  content: string
  variant: OutputVariant
  // Monaco (CodeViewer) manages its own internal virtualized scrolling and
  // ResizeObserver-driven layout -- nesting it inside another scrollable
  // container is a well-documented Monaco integration issue (competing wheel
  // handlers, layout thrashing on resize), independent of which scrollbar
  // implementation the outer container uses. Every other viewer (Markdown,
  // Mermaid) keeps the shared ScrollArea below; only CodeViewer opts out.
  scrollable?: boolean
  // Optional per-viewer control rendered next to the copy/download actions
  // (currently only CodeViewer's minimap toggle) -- kept generic here rather
  // than hardcoding a minimap-specific prop, so other viewers can use it too.
  headerExtra?: ReactNode
  children: ReactNode
}) {
  return (
    <div className="flex h-full min-h-0 flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-muted-foreground">{label}</span>
        <div className="flex items-center gap-1">
          {headerExtra}
          <OutputActions content={content} variant={variant} />
        </div>
      </div>
      {scrollable ? (
        <ScrollArea className="min-h-0 flex-1 rounded-md border bg-muted/30">{children}</ScrollArea>
      ) : (
        <div className="min-h-0 flex-1 overflow-hidden rounded-md border bg-muted/30">
          {children}
        </div>
      )}
    </div>
  )
}
