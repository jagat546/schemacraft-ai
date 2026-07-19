import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { CodeViewer } from "@/components/dashboard/code-viewer"
import { MarkdownViewer } from "@/components/dashboard/markdown-viewer"
import { MermaidViewer } from "@/components/dashboard/mermaid-viewer"
import type { GeneratedSchema } from "@/types/schema"

export function OutputTabs({ result }: { result: GeneratedSchema }) {
  return (
    <Tabs defaultValue="sql">
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
