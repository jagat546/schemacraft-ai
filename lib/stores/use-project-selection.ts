"use client"

// Single source of truth for "hydrate project-store from server-fetched
// props, then resolve the effective selection synchronously during
// render" — previously duplicated verbatim in
// features/ai-workspace/components/schema-generator.tsx and
// features/projects/components/projects-panel.tsx (Architecture Review
// Iteration #1, High Priority 1).
import { useEffect } from "react"

import type { Project } from "@/lib/repositories/project.repository"
import { useProjectStore } from "@/lib/stores/project-store"

export function useProjectSelection(projects: Project[]) {
  const setProjects = useProjectStore((store) => store.setProjects)
  const storeSelectedProjectId = useProjectStore((store) => store.selectedProjectId)
  const selectProject = useProjectStore((store) => store.selectProject)

  useEffect(() => {
    setProjects(projects)
  }, [projects, setProjects])

  // Falls back to the first project synchronously during render, matching
  // the pre-refactor useState(projects[0]?.id ?? null) initializer exactly.
  // Without this, the store's selectedProjectId is still null for the one
  // frame before the effect above runs.
  const selectedProjectId = storeSelectedProjectId ?? projects[0]?.id ?? null

  return { selectedProjectId, selectProject }
}
