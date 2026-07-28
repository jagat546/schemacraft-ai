// Workbench-Experience-Specification.md §State Persistence: "per project,
// for the session (not indefinitely across devices/logins)" -- this is
// workspace convenience state, not user data worth syncing to the backend.
// sessionStorage (not localStorage) is what actually encodes "for the
// session" -- it clears on tab close, matching the spec's own wording,
// whereas ui-store.ts's existing in-memory-only state doesn't survive a
// reload at all and localStorage would survive far longer than "a session."
//
// Deliberately a separate store from ui-store.ts, not an extension of it:
// ui-store's `activeOutputTab` is shared, single-value state used by every
// OutputTabs instance (Generator, sandbox, landing's Interactive Demo) that
// doesn't have a "project" to key by. Workbench state is keyed *per project*
// and needs `persist`; folding both concerns into one store would force
// every other caller to pay for persistence machinery it doesn't want.
import { create } from "zustand"
import { createJSONStorage, persist } from "zustand/middleware"

import type { OutputVariant } from "@/types/ui"

export type WorkbenchProjectState = {
  activeTab: OutputVariant
  artifactPanelCollapsed: boolean
  erdPanelCollapsed: boolean
  splitSizes: { artifact: number; erd: number } | null
  // null = no explicit user choice yet -> CodeViewer's own auto-threshold
  // (suppressed under ~40 lines) decides. Once the user actually toggles it
  // via the command palette, that explicit choice is what persists -- the
  // auto-threshold default is deliberately never itself written back here.
  minimapOverride: boolean | null
}

const DEFAULT_PROJECT_STATE: WorkbenchProjectState = {
  activeTab: "sql",
  artifactPanelCollapsed: false,
  erdPanelCollapsed: false,
  splitSizes: null,
  minimapOverride: null,
}

type WorkbenchStore = {
  // Deliberately NOT persisted (see partialize below): Fullscreen-Mode
  // §"Re-entering the Workbench route later does not persist fullscreen
  // state -- it's a transient viewing mode, not a saved layout."
  isFullscreen: boolean
  setFullscreen: (fullscreen: boolean) => void
  toggleFullscreen: () => void

  projects: Record<string, WorkbenchProjectState>
  getProjectState: (projectId: string) => WorkbenchProjectState
  setActiveTab: (projectId: string, tab: OutputVariant) => void
  toggleArtifactPanel: (projectId: string) => void
  toggleErdPanel: (projectId: string) => void
  setSplitSizes: (projectId: string, sizes: { artifact: number; erd: number }) => void
  setMinimapOverride: (projectId: string, enabled: boolean) => void
}

function updateProject(
  projects: Record<string, WorkbenchProjectState>,
  projectId: string,
  patch: Partial<WorkbenchProjectState>
): Record<string, WorkbenchProjectState> {
  const current = projects[projectId] ?? DEFAULT_PROJECT_STATE
  return { ...projects, [projectId]: { ...current, ...patch } }
}

export const useWorkbenchStore = create<WorkbenchStore>()(
  persist(
    (set, get) => ({
      isFullscreen: false,
      setFullscreen: (fullscreen) => set({ isFullscreen: fullscreen }),
      toggleFullscreen: () => set((state) => ({ isFullscreen: !state.isFullscreen })),

      projects: {},
      getProjectState: (projectId) => get().projects[projectId] ?? DEFAULT_PROJECT_STATE,
      setActiveTab: (projectId, tab) =>
        set((state) => ({ projects: updateProject(state.projects, projectId, { activeTab: tab }) })),
      toggleArtifactPanel: (projectId) =>
        set((state) => {
          const current = state.projects[projectId] ?? DEFAULT_PROJECT_STATE
          return {
            projects: updateProject(state.projects, projectId, {
              artifactPanelCollapsed: !current.artifactPanelCollapsed,
            }),
          }
        }),
      toggleErdPanel: (projectId) =>
        set((state) => {
          const current = state.projects[projectId] ?? DEFAULT_PROJECT_STATE
          return {
            projects: updateProject(state.projects, projectId, {
              erdPanelCollapsed: !current.erdPanelCollapsed,
            }),
          }
        }),
      setSplitSizes: (projectId, sizes) =>
        set((state) => ({
          projects: updateProject(state.projects, projectId, { splitSizes: sizes }),
        })),
      setMinimapOverride: (projectId, enabled) =>
        set((state) => ({
          projects: updateProject(state.projects, projectId, { minimapOverride: enabled }),
        })),
    }),
    {
      name: "schemacraft-workbench",
      storage: createJSONStorage(() => sessionStorage),
      // Excludes isFullscreen from the persisted snapshot entirely -- it
      // still resets to `false` on every fresh load via the initializer
      // above regardless, but partialize makes the "never saved" intent
      // explicit rather than incidental.
      partialize: (state) => ({ projects: state.projects }),
    }
  )
)
