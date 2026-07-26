"use client"

import type { ReactNode } from "react"

import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable"
import { useIsMobile } from "@/hooks/use-mobile"

// Resizable code/diagram split. Deliberately takes no opinion on its own
// height (h-full) — the caller provides the bounded ancestor, whether
// that's today's fixed-height Generator output area or a full-viewport
// Workbench route later. On mobile the panes stack instead of squeezing
// side by side (Engineering Spec §9, M4 acceptance criteria).
export function SplitPaneCanvas({ left, right }: { left: ReactNode; right: ReactNode }) {
  const isMobile = useIsMobile()
  const orientation = isMobile ? "vertical" : "horizontal"

  return (
    <ResizablePanelGroup orientation={orientation} className="h-full rounded-md">
      <ResizablePanel defaultSize="55%" minSize="25%">
        {left}
      </ResizablePanel>
      <ResizableHandle orientation={orientation} withHandle />
      <ResizablePanel defaultSize="45%" minSize="25%">
        {right}
      </ResizablePanel>
    </ResizablePanelGroup>
  )
}
