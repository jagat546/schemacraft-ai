// @vitest-environment jsdom
import { act, renderHook } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { useUndoableAction } from "@/hooks/use-undoable-action"

describe("useUndoableAction", () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it("fires the action after the delay when not cancelled", () => {
    const action = vi.fn()
    const { result } = renderHook(() => useUndoableAction(action, 1000))

    act(() => {
      result.current.run("payload")
    })
    expect(action).not.toHaveBeenCalled()

    act(() => {
      vi.advanceTimersByTime(1000)
    })
    expect(action).toHaveBeenCalledWith("payload")
  })

  it("undo cancels the pending action entirely -- it never fires", () => {
    const action = vi.fn()
    const { result } = renderHook(() => useUndoableAction(action, 1000))

    act(() => {
      result.current.run("payload")
    })

    let cancelled = false
    act(() => {
      cancelled = result.current.undo()
    })
    expect(cancelled).toBe(true)

    act(() => {
      vi.advanceTimersByTime(5000)
    })
    expect(action).not.toHaveBeenCalled()
  })

  it("undo returns false when there is nothing pending to cancel", () => {
    const action = vi.fn()
    const { result } = renderHook(() => useUndoableAction(action, 1000))

    let cancelled = true
    act(() => {
      cancelled = result.current.undo()
    })

    expect(cancelled).toBe(false)
  })
})
