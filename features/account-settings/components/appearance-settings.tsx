"use client"

import { useTheme } from "next-themes"

import { cn } from "@/lib/utils"

const THEME_OPTIONS = [
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
  { value: "system", label: "System" },
] as const

// Wraps next-themes' own state -- the same source of truth the top-bar
// ThemeToggle already uses, not a second one
// (Dashboard-Experience-Specification.md §Settings: "same source of truth,
// not duplicated").
export function AppearanceSettings() {
  const { theme, setTheme } = useTheme()

  return (
    <div className="flex flex-col gap-3">
      <div>
        <h3 className="text-h3 font-semibold text-text-primary">Theme</h3>
        <p className="text-body-sm text-text-secondary">Choose how SchemaCraft AI looks.</p>
      </div>
      <div className="flex gap-2" role="radiogroup" aria-label="Theme">
        {THEME_OPTIONS.map((option) => (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={theme === option.value}
            onClick={() => setTheme(option.value)}
            className={cn(
              "rounded-md border px-3 py-1.5 text-body-sm transition-colors",
              theme === option.value
                ? "border-accent-violet bg-accent-violet/10 text-accent-violet"
                : "border-border-subtle text-text-secondary hover:text-text-primary"
            )}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  )
}
