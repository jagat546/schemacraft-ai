"use client"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { CodeViewer } from "@/features/workbench/components/code-viewer"
import { MarkdownViewer } from "@/features/workbench/components/markdown-viewer"
import { MermaidViewer } from "@/features/workbench/components/mermaid-viewer"
import { SplitPaneCanvas, type PanelCollapseState } from "@/features/workbench/components/split-pane-canvas"
import { cn } from "@/lib/utils"
import { useUiStore } from "@/lib/stores/ui-store"
import type { GeneratedSchema } from "@/types/schema"
import type { OutputVariant } from "@/types/ui"

export function OutputTabs({
  result,
  tabState,
  className,
  minimapOverride,
  onMinimapOverrideChange,
  panelCollapse,
  splitSizes,
  onSplitSizesChange,
}: {
  result: GeneratedSchema
  // Optional, instance-scoped alternative to the shared ui-store tab
  // selection below. Every existing caller (Workbench, Generator, the
  // sandbox) omits this and keeps today's global-store behavior exactly as
  // before. It exists because the landing page's Interactive Demo (S4-007)
  // can render alongside the sandbox's own OutputTabs on the same page --
  // two instances sharing one global "which tab is active" value would
  // otherwise silently sync their tab selection to each other.
  tabState?: { value: OutputVariant; onValueChange: (tab: OutputVariant) => void }
  // Overrides the fixed 32rem height every other caller keeps -- only the
  // Workbench (a full-viewport route, not a fixed-height panel embedded in
  // a longer page) needs to fill its own bounded ancestor instead.
  className?: string
  // Workbench-only, per-project-persisted minimap choice (see CodeViewer):
  // shared uniformly across the three code tabs, since the spec describes
  // one on/off choice, not one per tab.
  minimapOverride?: boolean | null
  onMinimapOverrideChange?: (enabled: boolean) => void
  panelCollapse?: PanelCollapseState
  splitSizes?: { artifact: number; erd: number }
  onSplitSizesChange?: (sizes: { artifact: number; erd: number }) => void
}) {
  const globalActiveOutputTab = useUiStore((store) => store.activeOutputTab)
  const setGlobalActiveOutputTab = useUiStore((store) => store.setActiveOutputTab)
  const activeOutputTab = tabState?.value ?? globalActiveOutputTab
  const setActiveOutputTab = tabState?.onValueChange ?? setGlobalActiveOutputTab

  const codeTabs = (
    <Tabs value={activeOutputTab} onValueChange={setActiveOutputTab} className="h-full">
      <TabsList>
        <TabsTrigger value="sql">SQL</TabsTrigger>
        <TabsTrigger value="drizzle">Drizzle</TabsTrigger>
        <TabsTrigger value="json">JSON</TabsTrigger>
        {result.documentation && <TabsTrigger value="documentation">Documentation</TabsTrigger>}
      </TabsList>
      <TabsContent value="sql" className="min-h-0">
        <CodeViewer
          content={result.sql}
          variant="sql"
          minimapOverride={minimapOverride}
          onMinimapOverrideChange={onMinimapOverrideChange}
        />
      </TabsContent>
      <TabsContent value="drizzle" className="min-h-0">
        <CodeViewer
          content={result.drizzle}
          variant="drizzle"
          minimapOverride={minimapOverride}
          onMinimapOverrideChange={onMinimapOverrideChange}
        />
      </TabsContent>
      <TabsContent value="json" className="min-h-0">
        <CodeViewer
          content={result.json}
          variant="json"
          minimapOverride={minimapOverride}
          onMinimapOverrideChange={onMinimapOverrideChange}
        />
      </TabsContent>
      {result.documentation && (
        <TabsContent value="documentation" className="min-h-0">
          <MarkdownViewer content={result.documentation} />
        </TabsContent>
      )}
    </Tabs>
  )

  return (
    <div className={cn("h-[32rem]", className)}>
      {result.mermaidDiagram ? (
        <SplitPaneCanvas
          left={codeTabs}
          right={<MermaidViewer content={result.mermaidDiagram} />}
          collapse={panelCollapse}
          splitSizes={splitSizes}
          onSplitSizesChange={onSplitSizesChange}
        />
      ) : (
        codeTabs
      )}
    </div>
  )
}
