"use client"

import { useState, useTransition } from "react"
import { Sparkles } from "lucide-react"
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

export function SchemaGenerator({
  projects,
}: {
  projects: Project[]
}) {
  const [prompt, setPrompt] = useState("")
  const [projectId, setProjectId] = useState<string | null>(
    projects[0]?.id ?? null
  )

  const [state, setState] =
    useState<GenerationState>({
      status: "idle",
    })

  const [, startTransition] =
    useTransition()

  function handleGenerate() {
    if (!projectId) return

    setState({
      status: "generating",
    })

    startTransition(async () => {
      const outcome = await generateSchema(
        prompt,
        projectId
      )

      if (
        outcome.status === "SUCCESS" ||
        outcome.status ===
          "GENERATED_NOT_SAVED"
      ) {
        setState({
          status: "success",
          data: outcome.data,
        })

        toast.success(
          "Schema generated successfully!"
        )

        if (
          outcome.status ===
          "GENERATED_NOT_SAVED"
        ) {
          toast.error(
            `Generated but could not save: ${outcome.error}`
          )
        }
      } else {
        setState({
          status: "error",
          message: outcome.error,
        })

        toast.error(outcome.error)
      }
    })
  }

  const isGenerating =
    state.status === "generating"

  if (projects.length === 0) {
    return (
      <div className="rounded-3xl border border-violet-200 bg-violet-50 p-8 text-center">

        <Sparkles className="mx-auto mb-4 h-12 w-12 text-violet-600" />

        <h3 className="text-xl font-bold text-violet-900">
          Create Your First Project
        </h3>

        <p className="mt-2 text-violet-600">
          Every generated schema is stored
          inside a project.
        </p>

      </div>
    )
  }

  return (
    <div className="space-y-8">

      {/* Project Selector */}

      <div className="rounded-3xl border border-violet-200 bg-gradient-to-r from-violet-50 to-purple-50 p-6">

        <label className="mb-3 block text-sm font-semibold text-violet-900">
          Select Project
        </label>

        <Select
          value={projectId ?? ""}
          onValueChange={setProjectId}
        >
          <SelectTrigger className="border-violet-200 bg-white">
            <SelectValue placeholder="Choose Project" />
          </SelectTrigger>

          <SelectContent>
            {projects.map((project) => (
              <SelectItem
                key={project.id}
                value={project.id}
              >
                {project.title}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

      </div>

      {/* Prompt */}

      <div className="rounded-3xl border border-violet-200 bg-white p-6 shadow-lg">

        <div className="mb-5">

          <h3 className="text-xl font-bold text-violet-900">
            AI Prompt
          </h3>

          <p className="text-sm text-violet-600">
            Describe your database in plain
            English.
          </p>

        </div>

        <PromptEditor
          value={prompt}
          onChange={setPrompt}
          onGenerate={handleGenerate}
          isGenerating={isGenerating}
        />

      </div>

      {/* Loading */}

      {isGenerating && (
        <div className="rounded-3xl border border-violet-200 bg-white p-6 shadow-lg">

          <div className="mb-4 flex items-center gap-3">

            <Sparkles className="h-5 w-5 animate-pulse text-violet-600" />

            <span className="font-medium text-violet-800">
              AI is generating your schema...
            </span>

          </div>

          <OutputSkeleton />

        </div>
      )}

      {/* Idle */}

      {state.status === "idle" && (
        <div className="rounded-3xl border border-dashed border-violet-300 bg-violet-50 p-8 text-center">

          <Sparkles className="mx-auto mb-4 h-10 w-10 text-violet-500" />

          <h3 className="text-lg font-semibold text-violet-900">
            Ready to Generate
          </h3>

          <p className="mt-2 text-violet-600">
            Enter your prompt and click
            <strong> Generate</strong>.
          </p>

        </div>
      )}

      {/* Error */}

      {state.status === "error" && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-red-700">

          {state.message}

        </div>
      )}

      {/* Success */}

      {state.status === "success" && (
        <div className="rounded-3xl border border-violet-200 bg-white p-6 shadow-xl">

          <div className="mb-6 flex items-center gap-3">

            <div className="rounded-full bg-violet-100 p-3">

              <Sparkles className="h-6 w-6 text-violet-700" />

            </div>

            <div>

              <h3 className="text-xl font-bold text-violet-900">
                Generated Output
              </h3>

              <p className="text-sm text-violet-500">
                SQL • Drizzle • JSON • Documentation
              </p>

            </div>

          </div>

          <OutputTabs result={state.data} />

        </div>
      )}
    </div>
  )
}