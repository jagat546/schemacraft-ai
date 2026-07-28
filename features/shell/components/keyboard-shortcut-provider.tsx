"use client"

import * as React from "react"

type ShortcutHandler = (event: KeyboardEvent) => void

type ShortcutOptions = {
  /** Fire even when focus is inside an input/textarea/select/contenteditable. Defaults to false. */
  allowInInput?: boolean
}

type ShortcutEntry = ShortcutOptions & {
  combo: string
  /** Human-readable description, shown in Account Settings' Keyboard
   *  Shortcuts reference (S4-010) -- required so that list is always
   *  sourced from the real registry, never a hand-maintained duplicate
   *  that can drift out of sync. */
  label: string
  handler: ShortcutHandler
}

type RegisteredShortcut = { combo: string; label: string }

type KeyboardShortcutContextValue = {
  register: (id: string, entry: ShortcutEntry) => void
  unregister: (id: string) => void
  subscribe: (onChange: () => void) => () => void
  getSnapshot: () => RegisteredShortcut[]
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
  const listenersRef = React.useRef(new Set<() => void>())
  // Cached, not recomputed on every getSnapshot() call: useSyncExternalStore
  // expects a stable reference when nothing has actually changed, and
  // .map()-ing a fresh array every render would return a new reference each
  // time even with identical contents.
  const snapshotRef = React.useRef<RegisteredShortcut[]>([])

  const notify = React.useCallback(() => {
    snapshotRef.current = Array.from(registryRef.current.values()).map(({ combo, label }) => ({
      combo,
      label,
    }))
    for (const listener of listenersRef.current) {
      listener()
    }
  }, [])

  const register = React.useCallback(
    (id: string, entry: ShortcutEntry) => {
      registryRef.current.set(id, entry)
      notify()
    },
    [notify]
  )

  const unregister = React.useCallback(
    (id: string) => {
      registryRef.current.delete(id)
      notify()
    },
    [notify]
  )

  const subscribe = React.useCallback((onChange: () => void) => {
    listenersRef.current.add(onChange)
    return () => listenersRef.current.delete(onChange)
  }, [])

  const getSnapshot = React.useCallback(() => snapshotRef.current, [])

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

  const value = React.useMemo(
    () => ({ register, unregister, subscribe, getSnapshot }),
    [register, unregister, subscribe, getSnapshot]
  )

  return (
    <KeyboardShortcutContext.Provider value={value}>{children}</KeyboardShortcutContext.Provider>
  )
}

/**
 * Registers a global keyboard shortcut for the lifetime of the calling
 * component. `combo` is a `+`-joined string, e.g. `"mod+k"` — "mod" matches
 * either Cmd (Mac) or Ctrl (Windows/Linux). `label` is a short human-readable
 * description ("Open command palette") -- it powers Account Settings'
 * Keyboard Shortcuts reference, not just documentation.
 */
export function useKeyboardShortcut(
  combo: string,
  handler: ShortcutHandler,
  label: string,
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
      label,
      allowInInput,
      handler: (event) => handlerRef.current(event),
    })
    return () => context.unregister(id)
  }, [context, id, combo, label, allowInInput])
}

/** Reads the current shortcut registry -- the same list AccountSettings'
 *  Keyboard Shortcuts section renders, never a separately-maintained one.
 *
 *  useSyncExternalStore, not a render-time read of the ref directly:
 *  registration happens inside *other* components' effects
 *  (useKeyboardShortcut above), which haven't necessarily run yet during
 *  this component's own first render pass, and registrations can also
 *  change later (a shortcut-owning component unmounting) -- this is
 *  exactly React's own recommended pattern for subscribing to an external
 *  mutable store rather than reading it once and hoping it doesn't change. */
export function useRegisteredShortcuts(): RegisteredShortcut[] {
  const context = React.useContext(KeyboardShortcutContext)
  if (!context) {
    throw new Error("useRegisteredShortcuts must be used within a KeyboardShortcutProvider")
  }

  return React.useSyncExternalStore(context.subscribe, context.getSnapshot)
}
