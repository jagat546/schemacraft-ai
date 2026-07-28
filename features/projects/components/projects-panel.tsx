"use client"

import { useMemo, useState } from "react"
import { FolderOpenIcon, SearchXIcon } from "lucide-react"

import { EmptyState } from "@/components/patterns/empty-state"
import { CreateProjectDialog } from "@/features/projects/components/create-project-dialog"
import { DashboardMetrics } from "@/features/projects/components/dashboard-metrics"
import { ProjectCard } from "@/features/projects/components/project-card"
import { ProjectFilters } from "@/features/projects/components/project-filters"
import { ProjectSearch } from "@/features/projects/components/project-search"
import { QuickActions } from "@/features/projects/components/quick-actions"
import { filterProjects, type ProjectFilterKind } from "@/features/projects/lib/filter-projects"
import type { Project } from "@/lib/repositories/project.repository"
import { useProjectSelection } from "@/lib/stores/use-project-selection"

export function ProjectsPanel({
  initialProjects,
  generationCounts,
  loadError,
}: {
  initialProjects: Project[]
  generationCounts: Record<string, number>
  loadError?: string
}) {
  const { selectedProjectId } = useProjectSelection(initialProjects)
  const [query, setQuery] = useState("")
  const [activeFilters, setActiveFilters] = useState<ProjectFilterKind[]>([])

  const totalGenerations = useMemo(
    () => Object.values(generationCounts).reduce((sum, count) => sum + count, 0),
    [generationCounts]
  )

  const filteredProjects = useMemo(
    () => filterProjects(initialProjects, { query, activeFilters, generationCounts }),
    [initialProjects, query, activeFilters, generationCounts]
  )

  function toggleFilter(filter: ProjectFilterKind) {
    setActiveFilters((current) =>
      current.includes(filter) ? current.filter((entry) => entry !== filter) : [...current, filter]
    )
  }

  function clearSearchAndFilters() {
    setQuery("")
    setActiveFilters([])
  }

  const noResultsMessage = (() => {
    const trimmedQuery = query.trim()
    if (trimmedQuery && activeFilters.length > 0) {
      return `No projects match "${trimmedQuery}" with the current filters.`
    }
    if (trimmedQuery) {
      return `No projects match "${trimmedQuery}".`
    }
    return "No projects match the current filters."
  })()

  if (loadError) {
    return <p className="text-sm text-destructive">{loadError}</p>
  }

  // Dashboard-Experience-Specification.md §Empty States: replaces the
  // metrics row and grid entirely -- no quick actions, no search, no
  // filters cluttering a brand-new account.
  if (initialProjects.length === 0) {
    return (
      <div className="flex flex-col items-center gap-4">
        <EmptyState
          icon={<FolderOpenIcon />}
          message="Projects are where your generations live. Create one to get started."
        />
        <CreateProjectDialog triggerLabel="Create your first project" triggerSize="lg" />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <QuickActions selectedProjectId={selectedProjectId} />
      <DashboardMetrics totalProjects={initialProjects.length} totalGenerations={totalGenerations} />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <ProjectSearch value={query} onChange={setQuery} />
        <ProjectFilters activeFilters={activeFilters} onToggle={toggleFilter} />
      </div>

      {filteredProjects.length === 0 ? (
        <EmptyState
          icon={<SearchXIcon />}
          message={noResultsMessage}
          action={{ label: "Clear search and filters", onClick: clearSearchAndFilters }}
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {filteredProjects.map((project) => (
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
