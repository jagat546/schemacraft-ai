// @vitest-environment jsdom
import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import {
  KeyboardShortcutProvider,
  useKeyboardShortcut,
  useRegisteredShortcuts,
} from "@/features/shell/components/keyboard-shortcut-provider"

function Registrar({ combo, label }: { combo: string; label: string }) {
  useKeyboardShortcut(combo, () => {}, label)
  return null
}

function ShortcutList() {
  const shortcuts = useRegisteredShortcuts()
  return (
    <ul>
      {shortcuts.map((shortcut) => (
        <li key={shortcut.combo + shortcut.label}>
          {shortcut.label}: {shortcut.combo}
        </li>
      ))}
    </ul>
  )
}

describe("KeyboardShortcutProvider registry", () => {
  it("exposes exactly what was registered, not a separately-maintained list", () => {
    render(
      <KeyboardShortcutProvider>
        <Registrar combo="mod+k" label="Open command palette" />
        <Registrar combo="mod+shift+c" label="Copy current tab" />
        <ShortcutList />
      </KeyboardShortcutProvider>
    )

    expect(screen.getByText("Open command palette: mod+k")).toBeTruthy()
    expect(screen.getByText("Copy current tab: mod+shift+c")).toBeTruthy()
  })

  it("throws when used outside a KeyboardShortcutProvider", () => {
    function Unwrapped() {
      useRegisteredShortcuts()
      return null
    }

    expect(() => render(<Unwrapped />)).toThrow(
      "useRegisteredShortcuts must be used within a KeyboardShortcutProvider"
    )
  })
})
