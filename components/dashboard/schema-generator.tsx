"use client"

import { useState } from "react"

import { OutputTabs } from "@/components/dashboard/output-tabs"
import { PromptEditor } from "@/components/dashboard/prompt-editor"
import { generateMockSchema } from "@/lib/mock-schema"
import type { GeneratedSchema } from "@/types/schema"

export function SchemaGenerator() {
  const [prompt, setPrompt] = useState("")
  const [result, setResult] = useState<GeneratedSchema | null>(null)

  function handleGenerate() {
    setResult(generateMockSchema(prompt))
  }

  return (
    <div className="flex flex-col gap-4">
      <PromptEditor value={prompt} onChange={setPrompt} onGenerate={handleGenerate} />
      {result ? (
        <OutputTabs result={result} />
      ) : (
        <p className="text-sm text-muted-foreground">
          Describe a schema above and click Generate to see the SQL, Drizzle model, and sample JSON.
        </p>
      )}
    </div>
  )
}
