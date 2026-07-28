"use client"

import { useRegisteredShortcuts } from "@/features/shell/components/keyboard-shortcut-provider"

function formatCombo(combo: string): string {
  return combo
    .split("+")
    .map((part) => (part === "mod" ? "Ctrl/Cmd" : part.charAt(0).toUpperCase() + part.slice(1)))
    .join(" + ")
}

// Read-only reference, sourced from the real registry
// (KeyboardShortcutProvider.getShortcuts()) rather than a hand-maintained
// list that can silently drift out of sync with what's actually
// registered.
export function KeyboardShortcutsSettings() {
  const shortcuts = useRegisteredShortcuts()

  return (
    <div className="flex flex-col gap-3">
      <div>
        <h3 className="text-h3 font-semibold text-text-primary">Keyboard shortcuts</h3>
        <p className="text-body-sm text-text-secondary">
          Available anywhere in the authenticated app.
        </p>
      </div>
      <ul className="flex flex-col divide-y divide-border-subtle rounded-lg border border-border-subtle">
        {shortcuts.map((shortcut) => (
          <li
            key={shortcut.combo + shortcut.label}
            className="flex items-center justify-between px-4 py-2.5"
          >
            <span className="text-body-sm text-text-secondary">{shortcut.label}</span>
            <kbd className="rounded border border-border-subtle bg-surface-1 px-2 py-0.5 font-mono text-caption text-text-primary">
              {formatCombo(shortcut.combo)}
            </kbd>
          </li>
        ))}
      </ul>
    </div>
  )
}
