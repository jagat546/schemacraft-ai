"use client"

import { SearchIcon } from "lucide-react"

import { Input } from "@/components/ui/input"

// Dashboard-Experience-Specification.md §Search: filters client-side as the
// user types, no debounce needed at expected project-count scale.
export function ProjectSearch({
  value,
  onChange,
}: {
  value: string
  onChange: (value: string) => void
}) {
  return (
    <div className="relative w-full sm:max-w-xs">
      <SearchIcon
        aria-hidden="true"
        className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-text-muted"
      />
      <Input
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Search projects…"
        aria-label="Search projects"
        className="pl-8"
      />
    </div>
  )
}
