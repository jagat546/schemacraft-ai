// @vitest-environment jsdom
import { render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

const mockUsePathname = vi.fn()
vi.mock("next/navigation", () => ({
  usePathname: () => mockUsePathname(),
}))

import { PageTitle, isProjectScopedRoute } from "@/features/shell/components/page-title"

describe("isProjectScopedRoute", () => {
  it("is true for a genuine per-project route sharing a dynamic-route suffix", () => {
    expect(isProjectScopedRoute("/dashboard/projects/proj-1/settings")).toBe(true)
    expect(isProjectScopedRoute("/dashboard/projects/proj-1/workbench")).toBe(true)
    expect(isProjectScopedRoute("/dashboard/projects/proj-1/history")).toBe(true)
  })

  it("is false for the account-level /dashboard/settings route (regression)", () => {
    // Found live during the private-beta browser verification pass:
    // /dashboard/settings ends in "/settings" too, and a bare suffix
    // match incorrectly treated it as the per-project Project Settings
    // screen.
    expect(isProjectScopedRoute("/dashboard/settings")).toBe(false)
  })

  it("is false for routes with no matching suffix at all", () => {
    expect(isProjectScopedRoute("/dashboard")).toBe(false)
    expect(isProjectScopedRoute("/dashboard/generator")).toBe(false)
  })
})

describe("PageTitle", () => {
  it("shows the real NAV_ITEMS label for the account Settings route, not a breadcrumb", () => {
    mockUsePathname.mockReturnValue("/dashboard/settings")

    render(<PageTitle />)

    expect(screen.getByText("Account Settings")).toBeTruthy()
    expect(screen.queryByRole("navigation", { name: "Breadcrumb" })).toBeNull()
  })

  it("renders breadcrumbs for a genuine per-project route", () => {
    mockUsePathname.mockReturnValue("/dashboard/projects/proj-1/settings")

    render(<PageTitle />)

    expect(screen.getByRole("navigation", { name: "Breadcrumb" })).toBeTruthy()
  })
})
