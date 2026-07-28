// @vitest-environment jsdom
import { render } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import DashboardLoading from "@/app/(dashboard)/loading"

describe("DashboardLoading", () => {
  it("renders a skeleton fallback that's hidden from assistive tech", () => {
    const { container } = render(<DashboardLoading />)

    expect(container.querySelector('[aria-hidden="true"]')).toBeTruthy()
    expect(container.querySelectorAll('[data-slot="skeleton"]').length).toBeGreaterThan(0)
  })
})
