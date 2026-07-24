// Client-side project list + selection state, shared across the AI
// Workspace (which project a generation targets) and the Projects module
// (which project is open). Source of truth for the *list* is still the
// server (Server Components fetch via getProjectsAction, RLS-scoped) — this
// store is a client-side mirror, hydrated from server-rendered props by the
// consuming feature, not an independent fetcher. It never calls Supabase or
// a Server Action itself.
import { create } from "zustand"

import type { Project } from "@/lib/repositories/project.repository"

export type ProjectStore = {
  projects: Project[]
  selectedProjectId: string | null
  setProjects: (projects: Project[]) => void
  addProject: (project: Project) => void
  selectProject: (projectId: string | null) => void
}

export const useProjectStore = create<ProjectStore>()((set) => ({
  projects: [],
  selectedProjectId: null,
  // Mirrors the previous default in schema-generator.tsx
  // (`projects[0]?.id ?? null`): keep the current selection if it's still
  // present in the new list, otherwise fall back to the first project.
  setProjects: (projects) =>
    set((state) => ({
      projects,
      selectedProjectId:
        state.selectedProjectId !== null &&
        projects.some((project) => project.id === state.selectedProjectId)
          ? state.selectedProjectId
          : (projects[0]?.id ?? null),
    })),
  addProject: (project) =>
    set((state) => ({
      projects: [project, ...state.projects],
      selectedProjectId: state.selectedProjectId ?? project.id,
    })),
  selectProject: (projectId) => set({ selectedProjectId: projectId }),
}))

export function selectSelectedProject(store: ProjectStore): Project | null {
  return store.projects.find((project) => project.id === store.selectedProjectId) ?? null
}
