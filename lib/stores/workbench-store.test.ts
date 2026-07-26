import { beforeEach, describe, expect, it } from "vitest"

import { useWorkbenchStore } from "@/lib/stores/workbench-store"

// This suite runs under the "node" test project (no `sessionStorage`
// global) -- zustand's `persist` middleware itself already handles that
// gracefully (createJSONStorage catches the ReferenceError and falls back
// to an unpersisted store, per its own source), so what's actually under
// test here is this store's own state-transition logic, not the
// third-party persistence mechanism.
const initialState = useWorkbenchStore.getState()

beforeEach(() => {
  useWorkbenchStore.setState(initialState, true)
})

describe("useWorkbenchStore", () => {
  it("defaults to not fullscreen", () => {
    expect(useWorkbenchStore.getState().isFullscreen).toBe(false)
  })

  it("toggleFullscreen flips the fullscreen flag", () => {
    useWorkbenchStore.getState().toggleFullscreen()
    expect(useWorkbenchStore.getState().isFullscreen).toBe(true)

    useWorkbenchStore.getState().toggleFullscreen()
    expect(useWorkbenchStore.getState().isFullscreen).toBe(false)
  })

  it("getProjectState returns defaults for a project with no recorded state", () => {
    expect(useWorkbenchStore.getState().getProjectState("project-1")).toEqual({
      activeTab: "sql",
      artifactPanelCollapsed: false,
      erdPanelCollapsed: false,
      splitSizes: null,
      minimapOverride: null,
    })
  })

  it("setActiveTab only affects the given project", () => {
    useWorkbenchStore.getState().setActiveTab("project-1", "drizzle")

    expect(useWorkbenchStore.getState().getProjectState("project-1").activeTab).toBe("drizzle")
    expect(useWorkbenchStore.getState().getProjectState("project-2").activeTab).toBe("sql")
  })

  it("toggleArtifactPanel and toggleErdPanel flip independently", () => {
    const { toggleArtifactPanel, toggleErdPanel } = useWorkbenchStore.getState()

    toggleArtifactPanel("project-1")
    expect(useWorkbenchStore.getState().getProjectState("project-1").artifactPanelCollapsed).toBe(
      true
    )
    expect(useWorkbenchStore.getState().getProjectState("project-1").erdPanelCollapsed).toBe(false)

    toggleErdPanel("project-1")
    expect(useWorkbenchStore.getState().getProjectState("project-1").erdPanelCollapsed).toBe(true)

    toggleArtifactPanel("project-1")
    expect(useWorkbenchStore.getState().getProjectState("project-1").artifactPanelCollapsed).toBe(
      false
    )
  })

  it("setSplitSizes records the given percentages for that project only", () => {
    useWorkbenchStore.getState().setSplitSizes("project-1", { artifact: 60, erd: 40 })

    expect(useWorkbenchStore.getState().getProjectState("project-1").splitSizes).toEqual({
      artifact: 60,
      erd: 40,
    })
    expect(useWorkbenchStore.getState().getProjectState("project-2").splitSizes).toBeNull()
  })

  it("setMinimapOverride records an explicit true/false choice, distinct from the null default", () => {
    expect(useWorkbenchStore.getState().getProjectState("project-1").minimapOverride).toBeNull()

    useWorkbenchStore.getState().setMinimapOverride("project-1", false)
    expect(useWorkbenchStore.getState().getProjectState("project-1").minimapOverride).toBe(false)

    useWorkbenchStore.getState().setMinimapOverride("project-1", true)
    expect(useWorkbenchStore.getState().getProjectState("project-1").minimapOverride).toBe(true)
  })

  it("per-project actions never affect isFullscreen, and vice versa", () => {
    useWorkbenchStore.getState().toggleFullscreen()
    useWorkbenchStore.getState().setActiveTab("project-1", "json")

    expect(useWorkbenchStore.getState().isFullscreen).toBe(true)
    expect(useWorkbenchStore.getState().getProjectState("project-1").activeTab).toBe("json")
  })
})
