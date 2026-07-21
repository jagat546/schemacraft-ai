"use client"

import { useState, useTransition } from "react"
import { toast } from "sonner"

import { OutputSkeleton } from "@/components/dashboard/output-skeleton"
import { OutputTabs } from "@/components/dashboard/output-tabs"
import { PromptEditor } from "@/components/dashboard/prompt-editor"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { generateSchema } from "@/lib/actions/generate-schema"
import type { Project } from "@/lib/repositories/project.repository"
import type { GeneratedSchema } from "@/types/schema"

type GenerationState =
  | { status: "idle" }
  | { status: "generating" }
  | { status: "success"; data: GeneratedSchema }
  | { status: "error"; message: string }

export function SchemaGenerator({ projects }: { projects: Project[] }) {
  const [prompt, setPrompt] = useState("")
  const [projectId, setProjectId] = useState<string | null>(projects[0]?.id ?? null)
  const [state, setState] = useState<GenerationState>({ status: "idle" })
  const [, startTransition] = useTransition()

  function handleGenerate() {
    if (!projectId) return

    setState({ status: "generating" })
    startTransition(async () => {
      const outcome = await generateSchema(prompt, projectId)
      if (outcome.status === "SUCCESS" || outcome.status === "GENERATED_NOT_SAVED") {
        setState({ status: "success", data: outcome.data })
        if (outcome.status === "GENERATED_NOT_SAVED") {
          toast.error(`Generated, but couldn't save it to the project: ${outcome.error}`)
        }
      } else {
        setState({ status: "error", message: outcome.error })
        toast.error(outcome.error)
      }
    })
  }

  const isGenerating = state.status === "generating"

  if (projects.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Create a project above before generating a schema — every generation is saved to a
        project.
      </p>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="generator-project" className="text-sm font-medium">
          Project
        </label>
        <Select value={projectId} onValueChange={setProjectId}>
          <SelectTrigger id="generator-project">
            <SelectValue placeholder="Select a project" />
          </SelectTrigger>
          <SelectContent>
            {projects.map((project) => (
              <SelectItem key={project.id} value={project.id}>
                {project.title}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
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
