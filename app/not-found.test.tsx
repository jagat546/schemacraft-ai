// @vitest-environment jsdom
import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import NotFound from "@/app/not-found"

describe("NotFound", () => {
  it("renders a branded not-found message with a link home", () => {
    render(<NotFound />)

    expect(
      screen.getByText("This page doesn't exist, or you may not have access to it.")
    ).toBeTruthy()
    const link = screen.getByRole("button", { name: "Go home" })
    expect(link.getAttribute("href")).toBe("/")
  })
})
