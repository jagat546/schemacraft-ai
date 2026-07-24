"use client"

import { useEffect } from "react"

import { OutputTabs } from "@/components/dashboard/output-tabs"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { GenerationStatus } from "@/features/compiler/components/generation-status"
import { PromptEditor } from "@/features/ai-workspace/components/prompt-editor"
import { useGenerateSchema } from "@/features/ai-workspace/hooks/use-generate-schema"
import type { Project } from "@/lib/repositories/project.repository"
import { useProjectStore } from "@/lib/stores/project-store"

export function SchemaGenerator({ projects }: { projects: Project[] }) {
  const setProjects = useProjectStore((store) => store.setProjects)
  const selectedProjectId = useProjectStore((store) => store.selectedProjectId)
  const selectProject = useProjectStore((store) => store.selectProject)
  const { prompt, setPrompt, state, generate } = useGenerateSchema()

  // project-store is a client-side mirror of the server-fetched `projects`
  // prop (see docs/architecture/frontend-modularization.md) — this keeps
  // it in sync whenever DashboardShell re-fetches (e.g. after creating a
  // project triggers router.refresh()).
  useEffect(() => {
    setProjects(projects)
  }, [projects, setProjects])

  function handleGenerate() {
    generate(selectedProjectId)
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
        <Select value={selectedProjectId} onValueChange={selectProject}>
          <SelectTrigger id="generator-project">
            {/*
              TD-002 fix: SelectValue resolves a selected item's label by
              matching against items registered by mounted SelectItems,
              which haven't mounted yet for a value set programmatically
              before the popup is ever opened (the default-selected first
              project) — it falls back to stringifying the raw value,
              showing the project's UUID instead of its title. An explicit
              children resolver looks the title up directly from `projects`
              instead of depending on that registration timing. This is
              Base UI's own documented pattern for this exact case.
            */}
            <SelectValue placeholder="Select a project">
              {(value: string | null) =>
                projects.find((project) => project.id === value)?.title ?? "Select a project"
              }
            </SelectValue>
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
      <GenerationStatus />
      {state.status === "success" && <OutputTabs result={state.data} />}
    </div>
  )
}
