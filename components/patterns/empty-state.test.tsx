// @vitest-environment jsdom
import { render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

import { EmptyState, type EmptyStateProps } from "@/components/patterns/empty-state"

function TestIcon() {
  return <svg data-testid="empty-state-icon" />
}

describe("EmptyState", () => {
  it("renders the icon and message with no action", () => {
    render(<EmptyState icon={<TestIcon />} message="Nothing here yet." />)

    expect(screen.getByTestId("empty-state-icon")).toBeTruthy()
    expect(screen.getByText("Nothing here yet.")).toBeTruthy()
    expect(screen.queryByRole("button")).toBeNull()
    expect(screen.queryByRole("link")).toBeNull()
  })

  it("renders a link-based action when given href", () => {
    render(
      <EmptyState
        icon={<TestIcon />}
        message="No projects yet."
        action={{ label: "Create your first project", href: "/dashboard/generator" }}
      />
    )

    // Base UI's Button renders role="button" even when composed with
    // render={<Link />} (nativeButton={false}) -- it's a button that
    // navigates, not a link styled as a button, matching every other
    // href-based Button in this codebase (hero-section.tsx,
    // marketing-nav.tsx, etc.).
    const button = screen.getByRole("button", { name: "Create your first project" })
    expect(button.getAttribute("href")).toBe("/dashboard/generator")
  })

  it("renders a handler-based action when given onClick, and fires it on click", async () => {
    const onClick = vi.fn()
    render(<EmptyState icon={<TestIcon />} message="No results." action={{ label: "Clear search", onClick }} />)

    const button = screen.getByRole("button", { name: "Clear search" })
    button.click()

    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it("marks the icon container as decorative", () => {
    render(<EmptyState icon={<TestIcon />} message="No history yet." />)

    expect(screen.getByTestId("empty-state-icon").closest('[aria-hidden="true"]')).toBeTruthy()
  })

  it("never accepts both href and onClick on the same action (compile-time guarantee)", () => {
    // @ts-expect-error -- action must be href XOR onClick, never both; if this
    // stops erroring, the "at most one action" constraint has been lost.
    const invalid: EmptyStateProps["action"] = { label: "x", href: "/a", onClick: () => {} }
    expect(invalid).toBeDefined()
  })
})
