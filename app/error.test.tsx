// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

import RouteError from "@/app/error"

describe("RouteError", () => {
  it("renders the product's own error UI and logs the error", () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {})
    const error = Object.assign(new Error("boom"), { digest: "abc123" })

    render(<RouteError error={error} reset={vi.fn()} />)

    expect(screen.getByRole("alert")).toBeTruthy()
    expect(consoleError).toHaveBeenCalledWith(error)
    consoleError.mockRestore()
  })

  it("calls reset when Try again is clicked", () => {
    const reset = vi.fn()
    render(<RouteError error={new Error("boom")} reset={reset} />)

    fireEvent.click(screen.getByRole("button", { name: "Try again" }))

    expect(reset).toHaveBeenCalledTimes(1)
  })

  it("offers a link back to the Dashboard", () => {
    render(<RouteError error={new Error("boom")} reset={vi.fn()} />)

    const link = screen.getByRole("button", { name: "Back to Dashboard" })
    expect(link.getAttribute("href")).toBe("/dashboard")
  })
})
