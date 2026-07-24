"use client"

import * as React from "react"

type ShortcutHandler = (event: KeyboardEvent) => void

type ShortcutOptions = {
  /** Fire even when focus is inside an input/textarea/select/contenteditable. Defaults to false. */
  allowInInput?: boolean
}

type ShortcutEntry = ShortcutOptions & {
  combo: string
  handler: ShortcutHandler
}

type KeyboardShortcutContextValue = {
  register: (id: string, entry: ShortcutEntry) => void
  unregister: (id: string) => void
}

const KeyboardShortcutContext = React.createContext<KeyboardShortcutContextValue | null>(null)

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  if (target.isContentEditable) return true
  return target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.tagName === "SELECT"
}

function matchesCombo(event: KeyboardEvent, combo: string): boolean {
  const parts = combo.toLowerCase().split("+")
  const key = parts[parts.length - 1]
  const modifiers = parts.slice(0, -1)

  const needsMod = modifiers.includes("mod")
  const needsShift = modifiers.includes("shift")
  const needsAlt = modifiers.includes("alt")

  const hasMod = event.metaKey || event.ctrlKey
  if (needsMod !== hasMod) return false
  if (needsShift !== event.shiftKey) return false
  if (needsAlt !== event.altKey) return false

  return event.key.toLowerCase() === key
}

/**
 * Single app-wide keydown listener that dispatches to registered shortcuts.
 * Centralizing this avoids ad hoc `addEventListener("keydown", ...)` calls
 * scattered per component, which is how shortcut conflicts happen later
 * (Engineering Spec §2 #10).
 */
export function KeyboardShortcutProvider({ children }: { children: React.ReactNode }) {
  const registryRef = React.useRef(new Map<string, ShortcutEntry>())

  const register = React.useCallback((id: string, entry: ShortcutEntry) => {
    registryRef.current.set(id, entry)
  }, [])

  const unregister = React.useCallback((id: string) => {
    registryRef.current.delete(id)
  }, [])

  React.useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      for (const entry of registryRef.current.values()) {
        if (!entry.allowInInput && isEditableTarget(event.target)) continue
        if (matchesCombo(event, entry.combo)) {
          event.preventDefault()
          entry.handler(event)
        }
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [])

  const value = React.useMemo(() => ({ register, unregister }), [register, unregister])

  return (
    <KeyboardShortcutContext.Provider value={value}>{children}</KeyboardShortcutContext.Provider>
  )
}

/**
 * Registers a global keyboard shortcut for the lifetime of the calling
 * component. `combo` is a `+`-joined string, e.g. `"mod+k"` — "mod" matches
 * either Cmd (Mac) or Ctrl (Windows/Linux).
 */
export function useKeyboardShortcut(
  combo: string,
  handler: ShortcutHandler,
  options?: ShortcutOptions
) {
  const context = React.useContext(KeyboardShortcutContext)
  const id = React.useId()
  const handlerRef = React.useRef(handler)
  const allowInInput = options?.allowInInput ?? false

  React.useEffect(() => {
    handlerRef.current = handler
  })

  React.useEffect(() => {
    if (!context) {
      throw new Error("useKeyboardShortcut must be used within a KeyboardShortcutProvider")
    }

    context.register(id, {
      combo,
      allowInInput,
      handler: (event) => handlerRef.current(event),
    })
    return () => context.unregister(id)
  }, [context, id, combo, allowInInput])
}
