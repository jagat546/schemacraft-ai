// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

vi.mock("@/lib/actions/account-preferences.actions", () => ({
  updateAccessibilityPreferenceAction: vi.fn().mockResolvedValue(undefined),
}))

import { AccessibilitySettings } from "@/features/account-settings/components/accessibility-settings"

describe("AccessibilitySettings", () => {
  afterEach(() => {
    document.documentElement.classList.remove("reduced-motion", "high-contrast")
  })

  it("reflects the initial cookie-derived state", () => {
    render(<AccessibilitySettings initialReducedMotion={true} initialHighContrast={false} />)

    expect(screen.getByRole("switch", { name: /reduced motion/i })).toHaveProperty("checked", true)
    expect(screen.getByRole("switch", { name: /high-contrast/i })).toHaveProperty("checked", false)
  })

  it("toggling reduced motion updates the <html> class immediately", () => {
    render(<AccessibilitySettings initialReducedMotion={false} initialHighContrast={false} />)

    expect(document.documentElement.classList.contains("reduced-motion")).toBe(false)

    fireEvent.click(screen.getByRole("switch", { name: /reduced motion/i }))

    expect(document.documentElement.classList.contains("reduced-motion")).toBe(true)
  })

  it("only shows Reset to defaults once a preference has been changed", () => {
    render(<AccessibilitySettings initialReducedMotion={false} initialHighContrast={false} />)
    expect(screen.queryByRole("button", { name: /reset to defaults/i })).toBeNull()

    fireEvent.click(screen.getByRole("switch", { name: /high-contrast/i }))

    expect(screen.getByRole("button", { name: /reset to defaults/i })).toBeTruthy()
  })

  it("Reset to defaults clears both preferences and the <html> classes", () => {
    render(<AccessibilitySettings initialReducedMotion={true} initialHighContrast={true} />)
    document.documentElement.classList.add("reduced-motion", "high-contrast")

    fireEvent.click(screen.getByRole("button", { name: /reset to defaults/i }))

    expect(document.documentElement.classList.contains("reduced-motion")).toBe(false)
    expect(document.documentElement.classList.contains("high-contrast")).toBe(false)
    expect(screen.queryByRole("button", { name: /reset to defaults/i })).toBeNull()
  })
})
