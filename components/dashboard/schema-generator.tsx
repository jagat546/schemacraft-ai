"use client"

import { useState, useTransition } from "react"

import { OutputTabs } from "@/components/dashboard/output-tabs"
import { PromptEditor } from "@/components/dashboard/prompt-editor"
import { generateSchema } from "@/lib/actions/generate-schema"
import type { GeneratedSchema } from "@/types/schema"

export function SchemaGenerator() {
  const [prompt, setPrompt] = useState("")
  const [result, setResult] = useState<GeneratedSchema | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleGenerate() {
    setError(null)
    startTransition(async () => {
      const outcome = await generateSchema(prompt)
      if (outcome.ok) {
        setResult(outcome.data)
      } else {
        setError(outcome.error)
      }
    })
  }

  return (
    <div className="flex flex-col gap-4">
      <PromptEditor
        value={prompt}
        onChange={setPrompt}
        onGenerate={handleGenerate}
        isGenerating={isPending}
      />
      {error && <p className="text-sm text-destructive">{error}</p>}
      {!result && !error && (
        <p className="text-sm text-muted-foreground">
          Describe a schema above and click Generate to see the SQL, Drizzle model, and sample JSON.
        </p>
      )}
      {result && <OutputTabs result={result} />}
    </div>
  )
}
