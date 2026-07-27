"use client"

import { useEffect } from "react"
import type { ReactNode } from "react"
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react"
import { usePanelRef } from "react-resizable-panels"
import type { Layout } from "react-resizable-panels"

import { Button } from "@/components/ui/button"
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable"
import { useIsMobile } from "@/hooks/use-mobile"

const LEFT_PANEL_ID = "artifact"
const RIGHT_PANEL_ID = "erd"

export type PanelCollapseState = {
  artifactCollapsed: boolean
  erdCollapsed: boolean
  onToggleArtifact: () => void
  onToggleErd: () => void
}

// Resizable code/diagram split. Deliberately takes no opinion on its own
// height (h-full) — the caller provides the bounded ancestor, whether
// that's today's fixed-height Generator output area or a full-viewport
// Workbench route later. On mobile the panes stack instead of squeezing
// side by side (Engineering Spec §9, M4 acceptance criteria).
export function SplitPaneCanvas({
  left,
  right,
  // Workbench-Experience-Specification.md §Panel Behavior: "a collapse
  // control (chevron) at the panel boundary." Optional and omitted by every
  // caller except the Workbench (Generator/sandbox/landing demo keep
  // today's exact appearance -- no chevrons, no controlled layout).
  collapse,
  splitSizes,
  onSplitSizesChange,
}: {
  left: ReactNode
  right: ReactNode
  collapse?: PanelCollapseState
  splitSizes?: { artifact: number; erd: number }
  onSplitSizesChange?: (sizes: { artifact: number; erd: number }) => void
}) {
  const isMobile = useIsMobile()
  const orientation = isMobile ? "vertical" : "horizontal"
  const leftPanelRef = usePanelRef()
  const rightPanelRef = usePanelRef()
  const artifactCollapsed = collapse?.artifactCollapsed ?? false
  const erdCollapsed = collapse?.erdCollapsed ?? false

  // Driven by the imperative collapse()/expand() API, not conditional
  // rendering of `left`/`right`: both panels keep their content mounted at
  // all times (collapsedSize="0%" just makes the panel itself zero-width),
  // so collapsing the ERD panel doesn't tear down and re-render Monaco or
  // re-run Mermaid's render pass every time a user toggles it back open.
  useEffect(() => {
    const panel = leftPanelRef.current
    if (!panel) return
    if (artifactCollapsed && !panel.isCollapsed()) panel.collapse()
    if (!artifactCollapsed && panel.isCollapsed()) panel.expand()
  }, [artifactCollapsed, leftPanelRef])

  useEffect(() => {
    const panel = rightPanelRef.current
    if (!panel) return
    if (erdCollapsed && !panel.isCollapsed()) panel.collapse()
    if (!erdCollapsed && panel.isCollapsed()) panel.expand()
  }, [erdCollapsed, rightPanelRef])

  function handleLayoutChanged(layout: Layout) {
    if (!onSplitSizesChange) return
    const artifact = layout[LEFT_PANEL_ID]
    const erd = layout[RIGHT_PANEL_ID]
    if (typeof artifact === "number" && typeof erd === "number") {
      onSplitSizesChange({ artifact, erd })
    }
  }

  return (
    <div className="relative h-full">
      {/* Rendered as a sibling of ResizablePanelGroup, not inside
          ResizableHandle: that handle is itself a focusable, role="separator"
          element (keyboard-resizable), and axe's nested-interactive check
          correctly flags a focusable button rendered inside another
          focusable element as an accessibility violation (confirmed via
          test/a11y.test.tsx during the S4-016 audit -- this was a real bug
          in the original implementation, not a hypothetical one). A fixed
          corner toolbar is a discoverable, always-reachable collapse
          affordance without depending on -- or fighting -- the divider's
          own live drag position. */}
      {collapse && (
        /* gap-1, not gap-0.5 (which was off Design-System-2.0.md §4's
           spacing scale to begin with): these are icon-only buttons with a
           44px hit-slop (S6-006) -- a wider gap reduces overlap between
           adjacent hit areas. */
        <div className="absolute top-1 right-1 z-10 flex gap-1">
          <Button
            variant="outline"
            size="icon-sm"
            aria-label={artifactCollapsed ? "Expand code panel" : "Collapse code panel"}
            aria-pressed={artifactCollapsed}
            onClick={collapse.onToggleArtifact}
          >
            <ChevronLeftIcon className={artifactCollapsed ? "rotate-180" : ""} />
          </Button>
          <Button
            variant="outline"
            size="icon-sm"
            aria-label={erdCollapsed ? "Expand ERD panel" : "Collapse ERD panel"}
            aria-pressed={erdCollapsed}
            onClick={collapse.onToggleErd}
          >
            <ChevronRightIcon className={erdCollapsed ? "rotate-180" : ""} />
          </Button>
        </div>
      )}
      <ResizablePanelGroup
        orientation={orientation}
        className="h-full rounded-md"
        defaultLayout={
          splitSizes
            ? { [LEFT_PANEL_ID]: splitSizes.artifact, [RIGHT_PANEL_ID]: splitSizes.erd }
            : undefined
        }
        onLayoutChanged={handleLayoutChanged}
      >
        <ResizablePanel
          id={LEFT_PANEL_ID}
          panelRef={leftPanelRef}
          defaultSize="55%"
          minSize="25%"
          collapsible={!!collapse}
          collapsedSize="0%"
        >
          {left}
        </ResizablePanel>
        <ResizableHandle orientation={orientation} withHandle />
        <ResizablePanel
          id={RIGHT_PANEL_ID}
          panelRef={rightPanelRef}
          defaultSize="45%"
          minSize="25%"
          collapsible={!!collapse}
          collapsedSize="0%"
        >
          {right}
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  )
}
