// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

import GlobalError from "@/app/global-error"

describe("GlobalError", () => {
  it("renders the product's own error UI and logs the error", () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {})
    const error = new Error("root layout exploded")

    render(<GlobalError error={error} reset={vi.fn()} />)

    expect(screen.getByRole("alert")).toBeTruthy()
    expect(consoleError).toHaveBeenCalledWith(error)
    consoleError.mockRestore()
  })

  it("calls reset when Try again is clicked", () => {
    const reset = vi.fn()
    render(<GlobalError error={new Error("boom")} reset={reset} />)

    fireEvent.click(screen.getByRole("button", { name: "Try again" }))

    expect(reset).toHaveBeenCalledTimes(1)
  })
})
