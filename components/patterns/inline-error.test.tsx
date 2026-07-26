// @vitest-environment jsdom
import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { InlineError } from "@/components/patterns/inline-error"

describe("InlineError", () => {
  it("renders the message", () => {
    render(<InlineError message="Prompt must be under 4,000 characters." />)

    expect(screen.getByText("Prompt must be under 4,000 characters.")).toBeTruthy()
  })

  it("is announced to screen readers as an alert", () => {
    render(<InlineError message="This field is required." />)

    expect(screen.getByRole("alert").textContent).toBe("This field is required.")
  })

  it("applies the given id, for aria-describedby wiring by the field it belongs to", () => {
    render(<InlineError message="Invalid email." id="email-error" />)

    expect(screen.getByRole("alert").id).toBe("email-error")
  })

  it("uses the destructive color and body-sm typography tokens, not raw utilities", () => {
    render(<InlineError message="Invalid email." />)

    const className = screen.getByRole("alert").className
    expect(className).toContain("text-destructive")
    expect(className).toContain("text-body-sm")
  })
})
