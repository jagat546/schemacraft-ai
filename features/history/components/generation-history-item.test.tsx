// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

const mockPush = vi.fn()
const mockHandleDelete = vi.fn()

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}))

vi.mock("@/features/history/hooks/use-delete-generation", () => ({
  useDeleteGeneration: () => ({
    open: false,
    setOpen: vi.fn(),
    isPendingDelete: false,
    handleDelete: mockHandleDelete,
  }),
}))

// Dynamic import, not static: a static import is hoisted above the mock
// factories above, which would run them (and reference mockPush/
// mockHandleDelete) before those consts are initialized -- same reasoning
// as account-settings.test.tsx's existing convention for this.
const { GenerationHistoryItem } = await import(
  "@/features/history/components/generation-history-item"
)
const { useGenerationStore } = await import("@/lib/stores/generation-store")
const { useProjectStore } = await import("@/lib/stores/project-store")

const initialGenerationStoreState = useGenerationStore.getState()
const initialProjectStoreState = useProjectStore.getState()

const generation = {
  id: "gen-1",
  projectId: "project-1",
  versionNumber: 3,
  prompt: "A blog with posts and authors",
  artifacts: { sql: "", drizzle: "", json: "" },
  createdAt: "2026-01-01T00:00:00.000Z",
}

beforeEach(() => {
  useGenerationStore.setState(initialGenerationStoreState, true)
  useProjectStore.setState(initialProjectStoreState, true)
  mockPush.mockClear()
  mockHandleDelete.mockClear()
})

describe("GenerationHistoryItem — Edit & Regenerate (S7-002)", () => {
  it("carries the generation's original prompt into the shared store and navigates to the Generator", () => {
    render(<GenerationHistoryItem generation={generation} projectId="project-1" />)

    fireEvent.click(screen.getByRole("button", { name: "Edit & Regenerate" }))

    expect(useGenerationStore.getState().prompt).toBe("A blog with posts and authors")
    expect(mockPush).toHaveBeenCalledWith("/dashboard/generator")
  })

  it("selects this generation's own project, even when a different project was previously selected", () => {
    // Regression test: project-store persists across the whole client
    // session and is never otherwise synced by History -- without
    // explicitly selecting this generation's project, the Generator could
    // land on a stale, unrelated project selection and silently save the
    // new version under the wrong project.
    useProjectStore.getState().selectProject("some-other-project")

    render(<GenerationHistoryItem generation={generation} projectId="project-1" />)
    fireEvent.click(screen.getByRole("button", { name: "Edit & Regenerate" }))

    expect(useProjectStore.getState().selectedProjectId).toBe("project-1")
  })

  it("leaves the existing Open and Delete actions unchanged", () => {
    render(<GenerationHistoryItem generation={generation} projectId="project-1" />)

    const openLink = screen.getByRole("button", { name: "Open" })
    expect(openLink.getAttribute("href")).toBe(
      "/dashboard/projects/project-1/workbench?generation=gen-1"
    )
    expect(screen.getByRole("button", { name: "Delete version 3" })).toBeTruthy()
  })
})
