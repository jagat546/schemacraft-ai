// @vitest-environment jsdom
import { render, screen } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { Breadcrumbs } from "@/features/shell/components/breadcrumbs"
import { useProjectStore } from "@/lib/stores/project-store"

const mockUsePathname = vi.fn()
vi.mock("next/navigation", () => ({
  usePathname: () => mockUsePathname(),
}))

describe("Breadcrumbs", () => {
  beforeEach(() => {
    useProjectStore.setState({ projects: [], selectedProjectId: null })
  })

  it("renders nothing on a non-project-scoped route", () => {
    mockUsePathname.mockReturnValue("/dashboard/generator")
    const { container } = render(<Breadcrumbs />)

    expect(container.firstChild).toBeNull()
  })

  it("renders the full Dashboard / [Project] / [Screen] trail when the project is in the store", () => {
    useProjectStore.setState({
      projects: [
        {
          id: "proj-1",
          userId: "user-1",
          title: "Blog Schema",
          description: null,
          createdAt: "2026-01-01T00:00:00Z",
          updatedAt: "2026-01-01T00:00:00Z",
        },
      ],
      selectedProjectId: null,
    })
    mockUsePathname.mockReturnValue("/dashboard/projects/proj-1/workbench")

    render(<Breadcrumbs />)

    const dashboardLink = screen.getByRole("link", { name: "Dashboard" })
    expect(dashboardLink.getAttribute("href")).toBe("/dashboard")

    const projectLink = screen.getByRole("link", { name: "Blog Schema" })
    expect(projectLink.getAttribute("href")).toBe("/dashboard/projects/proj-1/workbench")

    expect(screen.getByText("Workbench")).toBeTruthy()
  })

  it("degrades to Dashboard / [Screen] when the project isn't in the store yet", () => {
    mockUsePathname.mockReturnValue("/dashboard/projects/proj-unknown/history")

    render(<Breadcrumbs />)

    expect(screen.getByRole("link", { name: "Dashboard" })).toBeTruthy()
    expect(screen.getByText("History")).toBeTruthy()
    expect(screen.queryAllByRole("link")).toHaveLength(1)
  })

  it("resolves the Project Settings screen label", () => {
    mockUsePathname.mockReturnValue("/dashboard/projects/proj-1/settings")

    render(<Breadcrumbs />)

    expect(screen.getByText("Project Settings")).toBeTruthy()
  })

  it("renders nothing on the account-level /dashboard/settings route, even though it shares the /settings suffix (regression)", () => {
    // Found live during the private-beta browser verification pass: a
    // bare `.endsWith('/settings')` match also matched this account-level
    // route, showing "Project Settings" for a screen with no project at
    // all.
    mockUsePathname.mockReturnValue("/dashboard/settings")

    const { container } = render(<Breadcrumbs />)

    expect(container.firstChild).toBeNull()
  })
})
