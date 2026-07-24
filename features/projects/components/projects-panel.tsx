"use client"

import { FolderOpen } from "lucide-react"

import { Card, CardContent } from "@/components/ui/card"
import { CreateProjectDialog } from "@/features/projects/components/create-project-dialog"
import { ProjectCard } from "@/features/projects/components/project-card"
import type { Project } from "@/lib/repositories/project.repository"
import { useProjectSelection } from "@/lib/stores/use-project-selection"

export function ProjectsPanel({
  initialProjects,
  loadError,
}: {
  initialProjects: Project[]
  loadError?: string
}) {
  const { selectedProjectId } = useProjectSelection(initialProjects)

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
