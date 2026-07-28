"use client"

import Link from "next/link"
import { PlayIcon, SparklesIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { CreateProjectDialog } from "@/features/projects/components/create-project-dialog"

// Dashboard-Experience-Specification.md §Quick Actions: at most 3, all
// secondary-weight. "New Generation" pre-selects the current project
// automatically (the Generator's own selector already reads project-store,
// no extra wiring needed here). "Resume last generation" only appears once
// a project exists to resume.
export function QuickActions({ selectedProjectId }: { selectedProjectId: string | null }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <CreateProjectDialog triggerVariant="outline" />
      <Button
        variant="outline"
        size="sm"
        nativeButton={false}
        render={<Link href="/dashboard/generator" />}
      >
        <SparklesIcon />
        New Generation
      </Button>
      {selectedProjectId ? (
        <Button
          variant="outline"
          size="sm"
          nativeButton={false}
          render={<Link href={`/dashboard/projects/${selectedProjectId}/workbench`} />}
        >
          <PlayIcon />
          Resume last generation
        </Button>
      ) : null}
    </div>
  )
}
