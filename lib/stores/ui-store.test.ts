import { beforeEach, describe, expect, it } from "vitest"

import { useUiStore } from "@/lib/stores/ui-store"

const initialState = useUiStore.getState()

beforeEach(() => {
  useUiStore.setState(initialState, true)
})

describe("useUiStore", () => {
  it("defaults to the sql tab", () => {
    expect(useUiStore.getState().activeOutputTab).toBe("sql")
  })

  it("setActiveOutputTab switches the active tab", () => {
    useUiStore.getState().setActiveOutputTab("mermaid")

    expect(useUiStore.getState().activeOutputTab).toBe("mermaid")
  })

  it("setActiveOutputTab does not affect any other field", () => {
    useUiStore.getState().setActiveOutputTab("drizzle")

    expect(useUiStore.getState()).toEqual({
      activeOutputTab: "drizzle",
      setActiveOutputTab: expect.any(Function),
      commandPaletteOpen: false,
      setCommandPaletteOpen: expect.any(Function),
      toggleCommandPalette: expect.any(Function),
    })
  })

  it("defaults the command palette to closed", () => {
    expect(useUiStore.getState().commandPaletteOpen).toBe(false)
  })

  it("setCommandPaletteOpen sets the open state directly", () => {
    useUiStore.getState().setCommandPaletteOpen(true)
    expect(useUiStore.getState().commandPaletteOpen).toBe(true)

    useUiStore.getState().setCommandPaletteOpen(false)
    expect(useUiStore.getState().commandPaletteOpen).toBe(false)
  })

  it("toggleCommandPalette flips the open state", () => {
    useUiStore.getState().toggleCommandPalette()
    expect(useUiStore.getState().commandPaletteOpen).toBe(true)

    useUiStore.getState().toggleCommandPalette()
    expect(useUiStore.getState().commandPaletteOpen).toBe(false)
  })
})
