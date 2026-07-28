import { beforeEach, describe, expect, it, vi } from "vitest"

// Regression guard for AD-004's Solution B: requireUser() was
// reimplemented on top of the new getSessionResult(), and this asserts its
// own external behavior is unchanged -- redirect to /login on no session,
// return the user otherwise.
const mockRedirect = vi.fn()
vi.mock("next/navigation", () => ({
  redirect: (path: string) => mockRedirect(path),
}))

const mockGetCurrentUser = vi.fn()
vi.mock("@/lib/auth/current-user", () => ({
  getCurrentUser: () => mockGetCurrentUser(),
}))

const { requireUser } = await import("@/lib/auth/require-user")

describe("requireUser", () => {
  beforeEach(() => {
    mockRedirect.mockClear()
    mockGetCurrentUser.mockClear()
  })

  it("redirects to /login when there is no session", async () => {
    mockGetCurrentUser.mockResolvedValue(null)

    await requireUser()

    expect(mockRedirect).toHaveBeenCalledWith("/login")
  })

  it("returns the user, without redirecting, when a session exists", async () => {
    const user = { id: "user-1", email: "a@example.com" }
    mockGetCurrentUser.mockResolvedValue(user)

    const result = await requireUser()

    expect(result).toBe(user)
    expect(mockRedirect).not.toHaveBeenCalled()
  })
})
