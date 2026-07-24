import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { CodeViewer } from "@/features/workbench/components/code-viewer"
import { MarkdownViewer } from "@/features/workbench/components/markdown-viewer"
import { MermaidViewer } from "@/features/workbench/components/mermaid-viewer"
import { useUiStore } from "@/lib/stores/ui-store"
import type { GeneratedSchema } from "@/types/schema"

export function OutputTabs({ result }: { result: GeneratedSchema }) {
  const activeOutputTab = useUiStore((store) => store.activeOutputTab)
  const setActiveOutputTab = useUiStore((store) => store.setActiveOutputTab)

  return (
    <Tabs value={activeOutputTab} onValueChange={setActiveOutputTab}>
      <TabsList>
        <TabsTrigger value="sql">SQL</TabsTrigger>
        <TabsTrigger value="drizzle">Drizzle</TabsTrigger>
        <TabsTrigger value="json">JSON</TabsTrigger>
        {result.documentation && <TabsTrigger value="documentation">Documentation</TabsTrigger>}
        {result.mermaidDiagram && <TabsTrigger value="mermaid">Mermaid</TabsTrigger>}
      </TabsList>
      <TabsContent value="sql">
        <CodeViewer content={result.sql} variant="sql" />
      </TabsContent>
      <TabsContent value="drizzle">
        <CodeViewer content={result.drizzle} variant="drizzle" />
      </TabsContent>
      <TabsContent value="json">
        <CodeViewer content={result.json} variant="json" />
      </TabsContent>
      {result.documentation && (
        <TabsContent value="documentation">
          <MarkdownViewer content={result.documentation} />
        </TabsContent>
      )}
      {result.mermaidDiagram && (
        <TabsContent value="mermaid">
          <MermaidViewer content={result.mermaidDiagram} />
        </TabsContent>
      )}
    </Tabs>
  )
}
