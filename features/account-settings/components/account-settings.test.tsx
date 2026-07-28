// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

const mockDeleteAccountAction = vi.fn()

vi.mock("@/lib/actions/auth", () => ({
  confirmPasswordReset: vi.fn(),
  signOutAllSessionsAction: vi.fn(),
  deleteAccountAction: mockDeleteAccountAction,
}))

// Dynamic import, not static: a static import is hoisted above the const
// declaration above, which would run this file's vi.mock factory (and
// therefore reference mockDeleteAccountAction) before it's initialized --
// same reasoning as lib/repositories/project.repository.test.ts and
// lib/auth/require-user.test.ts's existing `await import(...)` convention.
const { AccountSettings } = await import(
  "@/features/account-settings/components/account-settings"
)

describe("AccountSettings — delete account confirmation", () => {
  it("keeps the destructive confirm button disabled until the exact word 'delete' or the account email is typed", () => {
    render(<AccountSettings email="jane@example.com" />)

    fireEvent.click(screen.getByRole("button", { name: "Delete account" }))
    const confirmButton = screen.getByRole("button", { name: "Delete my account" })
    const input = screen.getByLabelText(/type/i)

    expect(confirmButton).toHaveProperty("disabled", true)

    fireEvent.change(input, { target: { value: "delet" } })
    expect(confirmButton).toHaveProperty("disabled", true)

    fireEvent.change(input, { target: { value: "delete" } })
    expect(confirmButton).toHaveProperty("disabled", false)
  })

  it("also accepts the account's own email as confirmation (case-insensitive)", () => {
    render(<AccountSettings email="jane@example.com" />)

    fireEvent.click(screen.getByRole("button", { name: "Delete account" }))
    const confirmButton = screen.getByRole("button", { name: "Delete my account" })
    const input = screen.getByLabelText(/type/i)

    fireEvent.change(input, { target: { value: "JANE@EXAMPLE.COM" } })
    expect(confirmButton).toHaveProperty("disabled", false)
  })

  it("calls deleteAccountAction only once the confirmation text is valid and the button is clicked", async () => {
    mockDeleteAccountAction.mockResolvedValue({ ok: true })
    render(<AccountSettings email="jane@example.com" />)

    fireEvent.click(screen.getByRole("button", { name: "Delete account" }))
    fireEvent.change(screen.getByLabelText(/type/i), { target: { value: "delete" } })
    fireEvent.click(screen.getByRole("button", { name: "Delete my account" }))

    expect(mockDeleteAccountAction).toHaveBeenCalledTimes(1)
  })
})
