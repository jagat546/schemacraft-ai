// @vitest-environment jsdom
import { act, render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { OfflineBanner } from "@/components/patterns/offline-banner"

function setNavigatorOnLine(value: boolean) {
  Object.defineProperty(window.navigator, "onLine", {
    configurable: true,
    value,
  })
}

describe("OfflineBanner", () => {
  it("is hidden while online", () => {
    setNavigatorOnLine(true)
    render(<OfflineBanner />)

    expect(screen.queryByRole("status")).toBeNull()
  })

  it("is visible while offline", () => {
    setNavigatorOnLine(false)
    render(<OfflineBanner />)

    const banner = screen.getByRole("status")
    expect(banner.textContent).toContain("You're offline")
  })

  it("auto-hides the moment connectivity returns", () => {
    setNavigatorOnLine(false)
    render(<OfflineBanner />)
    expect(screen.getByRole("status")).toBeTruthy()

    act(() => {
      window.dispatchEvent(new Event("online"))
    })

    expect(screen.queryByRole("status")).toBeNull()
  })

  it("exposes the offline state via an accessible status role, not color alone", () => {
    setNavigatorOnLine(false)
    render(<OfflineBanner />)

    expect(screen.getByRole("status")).toBeTruthy()
  })
})
