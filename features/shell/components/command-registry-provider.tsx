"use client"

import * as React from "react"

export type RegisteredCommand = {
  group: string
  label: string
  icon?: React.ComponentType<{ className?: string }>
  onSelect: () => void
}

type CommandRegistryContextValue = {
  register: (id: string, commands: RegisteredCommand[]) => void
  unregister: (id: string) => void
  subscribe: (onChange: () => void) => () => void
  getSnapshot: () => RegisteredCommand[]
}

const CommandRegistryContext = React.createContext<CommandRegistryContextValue | null>(null)

/**
 * Generic route-scoped command registry, mirroring KeyboardShortcutProvider's
 * registry design (Map + useSyncExternalStore) rather than inventing a new
 * pattern. Sprint-04-Implementation-Roadmap.md §S4-015 asks specifically for
 * this to be reusable infrastructure, not a Workbench-local hack: any feature
 * can call `useRegisterCommands` for the lifetime of one of its own
 * components, and those commands appear in `CommandPalette` only while that
 * component is mounted -- "scoped to a route" falls out of React's own
 * mount/unmount lifecycle, with no pathname string-matching anywhere.
 */
export function CommandRegistryProvider({ children }: { children: React.ReactNode }) {
  const registryRef = React.useRef(new Map<string, RegisteredCommand[]>())
  const listenersRef = React.useRef(new Set<() => void>())
  // Cached for the same reason as KeyboardShortcutProvider's snapshot:
  // useSyncExternalStore needs a stable reference when nothing changed.
  const snapshotRef = React.useRef<RegisteredCommand[]>([])

  const notify = React.useCallback(() => {
    snapshotRef.current = Array.from(registryRef.current.values()).flat()
    for (const listener of listenersRef.current) {
      listener()
    }
  }, [])

  const register = React.useCallback(
    (id: string, commands: RegisteredCommand[]) => {
      registryRef.current.set(id, commands)
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

  const value = React.useMemo(
    () => ({ register, unregister, subscribe, getSnapshot }),
    [register, unregister, subscribe, getSnapshot]
  )

  return (
    <CommandRegistryContext.Provider value={value}>{children}</CommandRegistryContext.Provider>
  )
}

/**
 * Registers a set of command-palette entries for the calling component's
 * mounted lifetime. `commands` is re-registered whenever the array
 * reference changes, so callers should memoize it (or pass a stable
 * literal computed from stable dependencies) the same way effect
 * dependencies normally would be.
 */
export function useRegisterCommands(commands: RegisteredCommand[]): void {
  const context = React.useContext(CommandRegistryContext)
  const id = React.useId()

  React.useEffect(() => {
    if (!context) {
      throw new Error("useRegisterCommands must be used within a CommandRegistryProvider")
    }
    context.register(id, commands)
    return () => context.unregister(id)
  }, [context, id, commands])
}

/** Reads the live set of route-scoped commands -- useSyncExternalStore for
 *  the same reason as useRegisteredShortcuts: registration happens inside
 *  *other* components' effects, which may not have run yet on this
 *  component's first render, and can change later as those components
 *  mount/unmount. */
export function useRegisteredCommands(): RegisteredCommand[] {
  const context = React.useContext(CommandRegistryContext)
  if (!context) {
    throw new Error("useRegisteredCommands must be used within a CommandRegistryProvider")
  }

  return React.useSyncExternalStore(context.subscribe, context.getSnapshot)
}
