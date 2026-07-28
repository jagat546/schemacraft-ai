import { describe, expect, it, vi } from "vitest"

// Minimal, purpose-built mock of the one Supabase query-builder chain
// getProjectsForUser() actually uses. This repo has no existing convention
// for mocking the Supabase client in a repository test (confirmed: no
// *.test.ts file existed anywhere under lib/repositories/ before S4-008),
// and it can't verify what the new database trigger actually does at
// runtime -- that requires a live Postgres connection this environment
// doesn't have. What this test *can* verify, and does: the query contract
// getProjectsForUser() controls -- which column it sorts by and in which
// direction -- so a future accidental revert back to created_at is caught.
const orderMock = vi.fn().mockReturnValue({
  returns: () => Promise.resolve({ data: [], error: null }),
})
const selectMock = vi.fn().mockReturnValue({ order: orderMock })
const fromMock = vi.fn().mockReturnValue({ select: selectMock })

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({ from: fromMock }),
}))

const { getProjectsForUser } = await import("@/lib/repositories/project.repository")

describe("getProjectsForUser", () => {
  it("orders by last generation activity (updated_at desc), not creation date", async () => {
    await getProjectsForUser()

    expect(fromMock).toHaveBeenCalledWith("projects")
    expect(orderMock).toHaveBeenCalledWith("updated_at", { ascending: false })
  })
})
