"use client"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { CodeViewer } from "@/features/workbench/components/code-viewer"
import { MarkdownViewer } from "@/features/workbench/components/markdown-viewer"
import { MermaidViewer } from "@/features/workbench/components/mermaid-viewer"
import { SplitPaneCanvas } from "@/features/workbench/components/split-pane-canvas"
import { useUiStore } from "@/lib/stores/ui-store"
import type { GeneratedSchema } from "@/types/schema"

export function OutputTabs({ result }: { result: GeneratedSchema }) {
  const activeOutputTab = useUiStore((store) => store.activeOutputTab)
  const setActiveOutputTab = useUiStore((store) => store.setActiveOutputTab)

  const codeTabs = (
    <Tabs value={activeOutputTab} onValueChange={setActiveOutputTab} className="h-full">
      <TabsList>
        <TabsTrigger value="sql">SQL</TabsTrigger>
        <TabsTrigger value="drizzle">Drizzle</TabsTrigger>
        <TabsTrigger value="json">JSON</TabsTrigger>
        {result.documentation && <TabsTrigger value="documentation">Documentation</TabsTrigger>}
      </TabsList>
      <TabsContent value="sql" className="min-h-0">
        <CodeViewer content={result.sql} variant="sql" />
      </TabsContent>
      <TabsContent value="drizzle" className="min-h-0">
        <CodeViewer content={result.drizzle} variant="drizzle" />
      </TabsContent>
      <TabsContent value="json" className="min-h-0">
        <CodeViewer content={result.json} variant="json" />
      </TabsContent>
      {result.documentation && (
        <TabsContent value="documentation" className="min-h-0">
          <MarkdownViewer content={result.documentation} />
        </TabsContent>
      )}
    </Tabs>
  )

  return (
    <div className="h-[32rem]">
      {result.mermaidDiagram ? (
        <SplitPaneCanvas
          left={codeTabs}
          right={<MermaidViewer content={result.mermaidDiagram} />}
        />
      ) : (
        codeTabs
      )}
    </div>
  )
}
