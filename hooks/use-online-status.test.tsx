// @vitest-environment jsdom
// .tsx extension (despite no JSX) is deliberate: renderHook needs a real DOM
// and real react-dom/client, which only the "dom" Vitest project (routed by
// the **/*.test.tsx glob) provides -- the "node" project's
// ssr.resolve.conditions: ["react-server"] breaks react-dom/client entirely.
import { act, renderHook } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

import { useOnlineStatus } from "@/hooks/use-online-status"

function setNavigatorOnLine(value: boolean) {
  Object.defineProperty(window.navigator, "onLine", {
    configurable: true,
    value,
  })
}

describe("useOnlineStatus", () => {
  afterEach(() => {
    setNavigatorOnLine(true)
  })

  it("initializes as online when navigator.onLine is true", () => {
    setNavigatorOnLine(true)
    const { result } = renderHook(() => useOnlineStatus())

    expect(result.current).toBe(true)
  })

  it("initializes as offline when navigator.onLine is false", () => {
    setNavigatorOnLine(false)
    const { result } = renderHook(() => useOnlineStatus())

    expect(result.current).toBe(false)
  })

  it("flips to offline on the window 'offline' event", () => {
    setNavigatorOnLine(true)
    const { result } = renderHook(() => useOnlineStatus())
    expect(result.current).toBe(true)

    act(() => {
      window.dispatchEvent(new Event("offline"))
    })

    expect(result.current).toBe(false)
  })

  it("flips to online on the window 'online' event", () => {
    setNavigatorOnLine(false)
    const { result } = renderHook(() => useOnlineStatus())
    expect(result.current).toBe(false)

    act(() => {
      window.dispatchEvent(new Event("online"))
    })

    expect(result.current).toBe(true)
  })

  it("removes its event listeners on unmount", () => {
    const addSpy = vi.spyOn(window, "addEventListener")
    const removeSpy = vi.spyOn(window, "removeEventListener")

    const { unmount } = renderHook(() => useOnlineStatus())
    const onlineHandler = addSpy.mock.calls.find(([type]) => type === "online")?.[1]
    const offlineHandler = addSpy.mock.calls.find(([type]) => type === "offline")?.[1]

    unmount()

    expect(removeSpy).toHaveBeenCalledWith("online", onlineHandler)
    expect(removeSpy).toHaveBeenCalledWith("offline", offlineHandler)

    addSpy.mockRestore()
    removeSpy.mockRestore()
  })
})
