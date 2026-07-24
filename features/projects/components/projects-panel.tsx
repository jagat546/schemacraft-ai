"use client"

import { useEffect } from "react"
import { FolderOpen } from "lucide-react"

import { Card, CardContent } from "@/components/ui/card"
import { CreateProjectDialog } from "@/features/projects/components/create-project-dialog"
import { ProjectCard } from "@/features/projects/components/project-card"
import type { Project } from "@/lib/repositories/project.repository"
import { useProjectStore } from "@/lib/stores/project-store"

export function ProjectsPanel({
  initialProjects,
  loadError,
}: {
  initialProjects: Project[]
  loadError?: string
}) {
  const setProjects = useProjectStore((store) => store.setProjects)
  const storeSelectedProjectId = useProjectStore((store) => store.selectedProjectId)

  // Same server-props-hydration pattern as SchemaGenerator (see
  // docs/architecture/frontend-modularization.md) — both components
  // receive the same DashboardShell-fetched array and independently sync
  // it into project-store; idempotent, so this is safe even though
  // SchemaGenerator also does it.
  useEffect(() => {
    setProjects(initialProjects)
  }, [initialProjects, setProjects])

  // Falls back to the first project synchronously during render, same
  // reasoning as the Day 4 fix in schema-generator.tsx: without this, no
  // card would show as selected for the one frame before the effect
  // above runs.
  const selectedProjectId = storeSelectedProjectId ?? initialProjects[0]?.id ?? null

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-muted-foreground">
          {initialProjects.length} {initialProjects.length === 1 ? "project" : "projects"}
        </span>
        <CreateProjectDialog />
      </div>

      {loadError && <p className="text-sm text-destructive">{loadError}</p>}

      {initialProjects.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 py-10 text-center">
            <FolderOpen className="size-8 text-muted-foreground" />
            <p className="text-sm font-medium">No projects yet</p>
            <p className="text-sm text-muted-foreground">
              Create your first project to start saving generated schemas.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {initialProjects.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              isSelected={project.id === selectedProjectId}
            />
          ))}
        </div>
      )}
    </div>
  )
}
