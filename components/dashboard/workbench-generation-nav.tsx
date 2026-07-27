"use client"

import Link from "next/link"
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import type { Generation } from "@/lib/repositories/generation.repository"

// Workbench-Experience-Specification.md §Navigation: "a compact prev/next
// control to step through a project's generation history without leaving
// the Workbench or opening the full History list." `generations` is
// ordered newest-first (getProjectGenerations' own query order) -- "older"
// is the next index, "newer" is the previous index. Plain <Link>s to the
// same route with a different `?generation=` query param, not a client
// fetch: the Workbench route already knows how to render any generation id
// server-side (WorkbenchView's existing `?generation=<id>` support), so
// this reuses that instead of introducing a second data-fetching path.
export function GenerationNav({
  projectId,
  generations,
  currentGenerationId,
}: {
  projectId: string
  generations: Generation[]
  currentGenerationId: string
}) {
  const currentIndex = generations.findIndex((generation) => generation.id === currentGenerationId)
  const newer = currentIndex > 0 ? generations[currentIndex - 1] : undefined
  const older =
    currentIndex >= 0 && currentIndex < generations.length - 1
      ? generations[currentIndex + 1]
      : undefined

  function hrefFor(generationId: string) {
    return `/dashboard/projects/${projectId}/workbench?generation=${generationId}`
  }

  return (
    // gap-2, not gap-1: these are icon-only buttons with a 44px hit-slop
    // (S6-006) -- a wider gap reduces overlap between adjacent hit areas.
    <div className="flex items-center gap-2">
      <Button
        variant="outline"
        size="icon-sm"
        aria-label={older ? `View version ${older.versionNumber}` : "No older generation"}
        disabled={!older}
        nativeButton={!older}
        render={older ? <Link href={hrefFor(older.id)} /> : undefined}
      >
        <ChevronLeftIcon />
      </Button>
      <Button
        variant="outline"
        size="icon-sm"
        aria-label={newer ? `View version ${newer.versionNumber}` : "No newer generation"}
        disabled={!newer}
        nativeButton={!newer}
        render={newer ? <Link href={hrefFor(newer.id)} /> : undefined}
      >
        <ChevronRightIcon />
      </Button>
    </div>
  )
}
