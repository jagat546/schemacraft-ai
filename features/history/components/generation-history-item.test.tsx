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

const initialStoreState = useGenerationStore.getState()

const generation = {
  id: "gen-1",
  projectId: "project-1",
  versionNumber: 3,
  prompt: "A blog with posts and authors",
  artifacts: { sql: "", drizzle: "", json: "" },
  createdAt: "2026-01-01T00:00:00.000Z",
}

beforeEach(() => {
  useGenerationStore.setState(initialStoreState, true)
  mockPush.mockClear()
  mockHandleDelete.mockClear()
})

describe("GenerationHistoryItem", () => {
  it("carries the generation's original prompt into the shared store and navigates to the Generator", () => {
    render(<GenerationHistoryItem generation={generation} projectId="project-1" />)

    fireEvent.click(screen.getByRole("button", { name: "Edit & Regenerate" }))

    expect(useGenerationStore.getState().prompt).toBe("A blog with posts and authors")
    expect(mockPush).toHaveBeenCalledWith("/dashboard/generator")
  })
})
