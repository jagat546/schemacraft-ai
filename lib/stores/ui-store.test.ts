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
    })
  })
})
