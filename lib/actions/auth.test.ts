import { describe, expect, it, vi } from "vitest"

// Mirrors lib/repositories/project.repository.test.ts's existing
// Supabase-client mocking convention (no *.test.ts existed for any
// Server Action in lib/actions/ before this). Only exercises
// deleteAccountAction's error branch -- the success branch calls
// next/navigation's redirect(), and this environment has no live
// Supabase project to verify the RPC's actual cascade end-to-end, which
// AD-005 itself already discloses as an open verification gap.
const rpcMock = vi.fn()
const signOutMock = vi.fn()
const mockRedirect = vi.fn()

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({ rpc: rpcMock, auth: { signOut: signOutMock } }),
}))

vi.mock("next/navigation", () => ({
  redirect: (path: string) => mockRedirect(path),
}))

const { deleteAccountAction } = await import("@/lib/actions/auth")

describe("deleteAccountAction", () => {
  it("returns a user-facing error and never signs out when the RPC call fails", async () => {
    rpcMock.mockResolvedValue({ data: null, error: { message: "connection reset" } })

    const result = await deleteAccountAction()

    expect(result).toEqual({
      ok: false,
      error: "Something went wrong deleting your account. Please try again.",
    })
    expect(signOutMock).not.toHaveBeenCalled()
  })

  it("calls delete_own_account with no arguments (never a caller-supplied user id)", async () => {
    rpcMock.mockResolvedValue({ data: null, error: { message: "connection reset" } })

    await deleteAccountAction()

    expect(rpcMock).toHaveBeenCalledWith("delete_own_account")
  })
})
