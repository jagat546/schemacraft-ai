import type { Project } from "@/lib/repositories/project.repository"

export type ProjectFilterKind = "has-generations" | "empty"

// Search and filters compose via AND logic
// (Dashboard-Experience-Specification.md §Filters). Pure so it's testable
// without rendering anything.
export function filterProjects(
  projects: Project[],
  {
    query,
    activeFilters,
    generationCounts,
  }: {
    query: string
    activeFilters: ProjectFilterKind[]
    generationCounts: Record<string, number>
  }
): Project[] {
  const normalizedQuery = query.trim().toLowerCase()

  return projects.filter((project) => {
    if (normalizedQuery !== "" && !project.title.toLowerCase().includes(normalizedQuery)) {
      return false
    }

    const count = generationCounts[project.id] ?? 0
    return activeFilters.every((filter) => {
      if (filter === "has-generations") {
        return count > 0
      }
      return count === 0
    })
  })
}
