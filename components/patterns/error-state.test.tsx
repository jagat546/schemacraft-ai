// @vitest-environment jsdom
import { render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

import { ErrorState, type ErrorStateProps } from "@/components/patterns/error-state"

function TestIcon() {
  return <svg data-testid="error-state-icon" />
}

describe("ErrorState", () => {
  it("renders the icon and message with no action", () => {
    render(<ErrorState icon={<TestIcon />} message="Something unexpected happened." />)

    expect(screen.getByTestId("error-state-icon")).toBeTruthy()
    expect(screen.getByText("Something unexpected happened.")).toBeTruthy()
    expect(screen.queryByRole("button")).toBeNull()
  })

  it("marks the container as an alert for screen readers", () => {
    render(<ErrorState icon={<TestIcon />} message="Generation failed." />)

    expect(screen.getByRole("alert")).toBeTruthy()
  })

  it("marks the icon as decorative", () => {
    render(<ErrorState icon={<TestIcon />} message="Generation failed." />)

    expect(screen.getByTestId("error-state-icon").closest('[aria-hidden="true"]')).toBeTruthy()
  })

  it("renders an optional retry action and fires its handler on click", () => {
    const onRetry = vi.fn()
    render(
      <ErrorState
        icon={<TestIcon />}
        message="Couldn't reach the server."
        action={{ kind: "retry", label: "Retry", onClick: onRetry }}
      />
    )

    const button = screen.getByRole("button", { name: "Retry" })
    button.click()

    expect(onRetry).toHaveBeenCalledTimes(1)
  })

  it("renders an optional secondary action alongside the primary one", () => {
    render(
      <ErrorState
        icon={<TestIcon />}
        message="This project was updated concurrently. Please try again."
        action={{ kind: "retry", label: "Retry", onClick: vi.fn() }}
        secondaryAction={{ kind: "back-to-dashboard", label: "Back to Dashboard", href: "/dashboard" }}
      />
    )

    expect(screen.getByRole("button", { name: "Retry" })).toBeTruthy()
    const secondary = screen.getByRole("button", { name: "Back to Dashboard" })
    expect(secondary.getAttribute("href")).toBe("/dashboard")
  })

  it("never accepts both href and onClick on the same action (compile-time guarantee)", () => {
    const invalid: ErrorStateProps["action"] = {
      kind: "retry",
      label: "x",
      href: "/a",
      // @ts-expect-error -- an action must be href XOR onClick, never both;
      // if this stops erroring, the "one trigger per action" constraint has
      // been lost.
      onClick: () => {},
    }
    expect(invalid).toBeDefined()
  })
})
