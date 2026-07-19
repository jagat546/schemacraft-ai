"use client"

import { useState, useTransition } from "react"
import { toast } from "sonner"

import { OutputSkeleton } from "@/components/dashboard/output-skeleton"
import { OutputTabs } from "@/components/dashboard/output-tabs"
import { PromptEditor } from "@/components/dashboard/prompt-editor"
import { generateSchema } from "@/lib/actions/generate-schema"
import type { GeneratedSchema } from "@/types/schema"

type GenerationState =
  | { status: "idle" }
  | { status: "generating" }
  | { status: "success"; data: GeneratedSchema }
  | { status: "error"; message: string }

export function SchemaGenerator() {
  const [prompt, setPrompt] = useState("")
  const [state, setState] = useState<GenerationState>({ status: "idle" })
  const [, startTransition] = useTransition()

  function handleGenerate() {
    setState({ status: "generating" })
    startTransition(async () => {
      const outcome = await generateSchema(prompt)
      if (outcome.ok) {
        setState({ status: "success", data: outcome.data })
      } else {
        setState({ status: "error", message: outcome.error })
        toast.error(outcome.error)
      }
    })
  }

  const isGenerating = state.status === "generating"

  return (
    <div className="flex flex-col gap-4">
      <PromptEditor
        value={prompt}
        onChange={setPrompt}
        onGenerate={handleGenerate}
        isGenerating={isGenerating}
      />
      {isGenerating && (
        <div aria-busy="true">
          <span className="sr-only" role="status" aria-live="polite">
            Generating schema…
          </span>
          <OutputSkeleton />
        </div>
      )}
      {state.status === "idle" && (
        <p className="text-sm text-muted-foreground">
          Describe a schema above and click Generate to see the SQL, Drizzle model, and sample JSON.
        </p>
      )}
      {state.status === "error" && (
        <p className="text-sm text-destructive">{state.message}</p>
      )}
      {state.status === "success" && <OutputTabs result={state.data} />}
    </div>
  )
}
