import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { CodeViewer } from "@/components/dashboard/code-viewer"
import type { GeneratedSchema } from "@/types/schema"

export function OutputTabs({ result }: { result: GeneratedSchema }) {
  return (
    <Tabs defaultValue="sql">
      <TabsList>
        <TabsTrigger value="sql">SQL</TabsTrigger>
        <TabsTrigger value="drizzle">Drizzle</TabsTrigger>
        <TabsTrigger value="json">JSON</TabsTrigger>
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
    </Tabs>
  )
}
