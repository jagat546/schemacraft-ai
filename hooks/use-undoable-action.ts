import { useCallback, useRef } from "react"

// Generic "delay the real action, offer undo, then commit or cancel"
// pattern (Generator-Experience-Specification.md §Undo/Retry Behavior) --
// not History-specific, so it lives here rather than in features/history.
// No backend soft-delete/restore: the action is simply delayed client-side
// until the undo window closes, which is simpler and lower-risk than a
// real soft-delete mechanism (Sprint-04-Implementation-Roadmap.md §S4-013).
export function useUndoableAction<T>(action: (input: T) => void | Promise<void>, delayMs = 5000) {
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const run = useCallback(
    (input: T) => {
      timeoutRef.current = setTimeout(() => {
        timeoutRef.current = null
        void action(input)
      }, delayMs)
    },
    [action, delayMs]
  )

  // Returns whether there was actually a pending action to cancel, so the
  // caller can tell a genuine cancellation apart from a no-op undo click
  // after the window already closed.
  const undo = useCallback(() => {
    if (timeoutRef.current === null) {
      return false
    }
    clearTimeout(timeoutRef.current)
    timeoutRef.current = null
    return true
  }, [])

  return { run, undo }
}
