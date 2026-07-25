"use client"

// TD-016 fix: project cards previously rendered as plain, non-interactive
// elements — no role, no tabindex, no click handler, unreachable via
// keyboard, and clicking one did nothing. Root cause: the click/select
// behavior was simply never wired up; project-store (Day 1) already
// existed as the shared source of truth for "which project is active,"
// and the AI Workspace's project dropdown already read from it — this
// card just never wrote to it. Selecting a card now sets it as the
// active project via project-store, immediately reflected in the AI
// Workspace's own selector (both read the same store).
import Link from "next/link"
import { Code2Icon, SettingsIcon } from "lucide-react"

import { Card, CardAction, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import type { Project } from "@/lib/repositories/project.repository"
import { useProjectStore } from "@/lib/stores/project-store"

export function ProjectCard({
  project,
  isSelected,
}: {
  project: Project
  isSelected: boolean
}) {
  const selectProject = useProjectStore((store) => store.selectProject)

  function handleKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault()
      selectProject(project.id)
    }
  }

  return (
    <Card
      role="button"
      tabIndex={0}
      aria-pressed={isSelected}
      onClick={() => selectProject(project.id)}
      onKeyDown={handleKeyDown}
      className={cn(
        "cursor-pointer transition-colors hover:ring-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
        isSelected && "ring-2 ring-primary"
      )}
    >
      <CardHeader>
        <CardTitle>{project.title}</CardTitle>
        {project.description && <CardDescription>{project.description}</CardDescription>}
        <CardAction className="flex items-center gap-1">
          <Link
            href={`/dashboard/projects/${project.id}/workbench`}
            onClick={(event) => event.stopPropagation()}
            aria-label={`Open ${project.title} in the Workbench`}
            className="flex size-7 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-accent-foreground"
          >
            <Code2Icon className="size-4" />
          </Link>
          <Link
            href={`/dashboard/projects/${project.id}/settings`}
            onClick={(event) => event.stopPropagation()}
            aria-label={`Open ${project.title} settings`}
            className="flex size-7 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-accent-foreground"
          >
            <SettingsIcon className="size-4" />
          </Link>
        </CardAction>
      </CardHeader>
    </Card>
  )
}
