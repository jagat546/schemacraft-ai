"use client"

import { cn } from "@/lib/utils"
import type { ProjectFilterKind } from "@/features/projects/lib/filter-projects"

const FILTER_OPTIONS: { kind: ProjectFilterKind; label: string }[] = [
  { kind: "has-generations", label: "Has generations" },
  { kind: "empty", label: "Empty" },
]

// Dashboard-Experience-Specification.md §Filters: a small, minimal set of
// pill chips (Design System 2.0 §7 pill shape), deliberately not a
// filter-builder UI. Plain toggle buttons with aria-pressed, matching this
// codebase's existing accessible-toggle convention (ProjectCard).
export function ProjectFilters({
  activeFilters,
  onToggle,
}: {
  activeFilters: ProjectFilterKind[]
  onToggle: (filter: ProjectFilterKind) => void
}) {
  return (
    <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Filter projects">
      {FILTER_OPTIONS.map((option) => {
        const isActive = activeFilters.includes(option.kind)
        return (
          <button
            key={option.kind}
            type="button"
            aria-pressed={isActive}
            onClick={() => onToggle(option.kind)}
            className={cn(
              "rounded-full border px-3 py-1 text-body-sm transition-colors",
              isActive
                ? "border-accent-violet bg-accent-violet/10 text-accent-violet"
                : "border-border-subtle text-text-secondary hover:text-text-primary"
            )}
          >
            {option.label}
          </button>
        )
      })}
    </div>
  )
}
