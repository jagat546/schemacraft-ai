import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { DrizzlePreview } from "@/components/dashboard/drizzle-preview"
import { JsonPreview } from "@/components/dashboard/json-preview"
import { SqlPreview } from "@/components/dashboard/sql-preview"
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
        <SqlPreview sql={result.sql} />
      </TabsContent>
      <TabsContent value="drizzle">
        <DrizzlePreview drizzle={result.drizzle} />
      </TabsContent>
      <TabsContent value="json">
        <JsonPreview json={result.json} />
      </TabsContent>
    </Tabs>
  )
}
