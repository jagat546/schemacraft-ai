import {
  Database,
  FileJson,
  BookOpen,
  Boxes,
  Workflow,
} from "lucide-react"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { CodeViewer } from "@/components/dashboard/code-viewer"
import { MarkdownViewer } from "@/components/dashboard/markdown-viewer"
import { MermaidViewer } from "@/components/dashboard/mermaid-viewer"

import type { GeneratedSchema } from "@/types/schema"

export function OutputTabs({ result }: { result: GeneratedSchema }) {
  return (
    <Tabs defaultValue="sql" className="space-y-6">

      <div className="flex items-center justify-between">

        <div>
          <h2 className="text-2xl font-bold text-violet-900">
            Generated Output
          </h2>

          <p className="mt-1 text-sm text-violet-500">
            Switch between generated SQL, Drizzle ORM, JSON,
            Documentation and ER Diagram.
          </p>
        </div>

      </div>

      <TabsList
        className="
          grid
          w-full
          grid-cols-5
          rounded-2xl
          border
          border-violet-200
          bg-violet-100
          p-2
          shadow-sm
        "
      >

        <TabsTrigger
          value="sql"
          className="rounded-xl data-[state=active]:bg-violet-600 data-[state=active]:text-white"
        >
          <Database className="mr-2 h-4 w-4" />
          SQL
        </TabsTrigger>

        <TabsTrigger
          value="drizzle"
          className="rounded-xl data-[state=active]:bg-violet-600 data-[state=active]:text-white"
        >
          <Boxes className="mr-2 h-4 w-4" />
          Drizzle
        </TabsTrigger>

        <TabsTrigger
          value="json"
          className="rounded-xl data-[state=active]:bg-violet-600 data-[state=active]:text-white"
        >
          <FileJson className="mr-2 h-4 w-4" />
          JSON
        </TabsTrigger>

        {result.documentation && (
          <TabsTrigger
            value="documentation"
            className="rounded-xl data-[state=active]:bg-violet-600 data-[state=active]:text-white"
          >
            <BookOpen className="mr-2 h-4 w-4" />
            Docs
          </TabsTrigger>
        )}

        {result.mermaidDiagram && (
          <TabsTrigger
            value="mermaid"
            className="rounded-xl data-[state=active]:bg-violet-600 data-[state=active]:text-white"
          >
            <Workflow className="mr-2 h-4 w-4" />
            ER Diagram
          </TabsTrigger>
        )}

      </TabsList>

      <TabsContent value="sql">
        <div className="rounded-3xl border border-violet-200 bg-white p-6 shadow-lg">
          <CodeViewer content={result.sql} variant="sql" />
        </div>
      </TabsContent>

      <TabsContent value="drizzle">
        <div className="rounded-3xl border border-violet-200 bg-white p-6 shadow-lg">
          <CodeViewer content={result.drizzle} variant="drizzle" />
        </div>
      </TabsContent>

      <TabsContent value="json">
        <div className="rounded-3xl border border-violet-200 bg-white p-6 shadow-lg">
          <CodeViewer content={result.json} variant="json" />
        </div>
      </TabsContent>

      {result.documentation && (
        <TabsContent value="documentation">
          <div className="rounded-3xl border border-violet-200 bg-white p-6 shadow-lg">
            <MarkdownViewer content={result.documentation} />
          </div>
        </TabsContent>
      )}

      {result.mermaidDiagram && (
        <TabsContent value="mermaid">
          <div className="rounded-3xl border border-violet-200 bg-white p-6 shadow-lg">
            <MermaidViewer content={result.mermaidDiagram} />
          </div>
        </TabsContent>
      )}

    </Tabs>
  )
}