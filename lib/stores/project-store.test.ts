import { beforeEach, describe, expect, it } from "vitest"

import type { Project } from "@/lib/repositories/project.repository"
import { selectSelectedProject, useProjectStore } from "@/lib/stores/project-store"

const initialState = useProjectStore.getState()

beforeEach(() => {
  useProjectStore.setState(initialState, true)
})

function makeProject(overrides: Partial<Project> = {}): Project {
  return {
    id: "11111111-1111-1111-1111-111111111111",
    userId: "22222222-2222-2222-2222-222222222222",
    title: "Blog",
    description: null,
    createdAt: "2026-07-01T00:00:00.000Z",
    updatedAt: "2026-07-01T00:00:00.000Z",
    ...overrides,
  }
}

describe("useProjectStore", () => {
  it("starts with no projects and no selection", () => {
    const state = useProjectStore.getState()

    expect(state.projects).toEqual([])
    expect(state.selectedProjectId).toBeNull()
  })

  it("setProjects selects the first project when nothing was previously selected", () => {
    const projectA = makeProject({ id: "a" })
    const projectB = makeProject({ id: "b" })

    useProjectStore.getState().setProjects([projectA, projectB])

    expect(useProjectStore.getState().selectedProjectId).toBe("a")
  })

  it("setProjects preserves the current selection when it still exists in the new list", () => {
    const projectA = makeProject({ id: "a" })
    const projectB = makeProject({ id: "b" })
    useProjectStore.getState().setProjects([projectA, projectB])
    useProjectStore.getState().selectProject("b")

    useProjectStore.getState().setProjects([projectA, projectB])

    expect(useProjectStore.getState().selectedProjectId).toBe("b")
  })

  it("setProjects falls back to the first project when the current selection no longer exists", () => {
    const projectA = makeProject({ id: "a" })
    const projectB = makeProject({ id: "b" })
    useProjectStore.getState().setProjects([projectA, projectB])
    useProjectStore.getState().selectProject("b")

    useProjectStore.getState().setProjects([projectA])

    expect(useProjectStore.getState().selectedProjectId).toBe("a")
  })

  it("setProjects with an empty list clears the selection", () => {
    useProjectStore.getState().setProjects([makeProject({ id: "a" })])

    useProjectStore.getState().setProjects([])

    expect(useProjectStore.getState().selectedProjectId).toBeNull()
  })

  it("addProject prepends the new project and keeps the existing selection", () => {
    const projectA = makeProject({ id: "a" })
    useProjectStore.getState().setProjects([projectA])
    useProjectStore.getState().selectProject("a")

    const projectB = makeProject({ id: "b", title: "Inventory" })
    useProjectStore.getState().addProject(projectB)

    const state = useProjectStore.getState()
    expect(state.projects.map((project) => project.id)).toEqual(["b", "a"])
    expect(state.selectedProjectId).toBe("a")
  })

  it("addProject selects the new project when nothing was previously selected", () => {
    const project = makeProject({ id: "a" })

    useProjectStore.getState().addProject(project)

    expect(useProjectStore.getState().selectedProjectId).toBe("a")
  })

  it("selectSelectedProject resolves the full project for the current selection", () => {
    const projectA = makeProject({ id: "a", title: "Blog" })
    const projectB = makeProject({ id: "b", title: "Inventory" })
    useProjectStore.getState().setProjects([projectA, projectB])
    useProjectStore.getState().selectProject("b")

    expect(selectSelectedProject(useProjectStore.getState())).toEqual(projectB)
  })

  it("selectSelectedProject returns null when nothing is selected", () => {
    expect(selectSelectedProject(useProjectStore.getState())).toBeNull()
  })
})
