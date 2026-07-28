"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

import { DYNAMIC_ROUTE_TITLES, isProjectScopedRoute } from "@/features/shell/components/page-title"
import { useProjectStore } from "@/lib/stores/project-store"

const PROJECT_ID_PATTERN = /^\/dashboard\/projects\/([^/]+)\//

// Rendered by PageTitle in place of the plain route title on project-scoped
// routes (Workbench, History, Project Settings) -- a bare title can't say
// *which* project the user is in (Navigation-Experience-Specification.md
// §Breadcrumbs).
//
// The project name resolves from project-store, which is populated whenever
// the user has visited the Dashboard this session (the store's own charter:
// "hydrated from server-rendered props by the consuming feature"). On a
// fresh direct link to a project-scoped route, before that's happened, the
// store is empty and this degrades gracefully to "Dashboard / [Screen]" --
// no new data-fetching abstraction, per the roadmap's own acceptance
// criterion, and never renders nothing.
export function Breadcrumbs() {
  const pathname = usePathname()
  const projects = useProjectStore((state) => state.projects)

  if (!isProjectScopedRoute(pathname)) {
    return null
  }
  const screenEntry = DYNAMIC_ROUTE_TITLES.find((entry) => pathname.endsWith(entry.suffix))
  if (!screenEntry) {
    return null
  }

  const projectId = pathname.match(PROJECT_ID_PATTERN)?.[1]
  const project = projectId ? projects.find((candidate) => candidate.id === projectId) : undefined

  return (
    <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-sm">
      <Link href="/dashboard" className="text-text-muted hover:text-text-primary hover:underline">
        Dashboard
      </Link>
      <span aria-hidden="true" className="text-text-muted">
        /
      </span>
      {project && projectId ? (
        <>
          <Link
            href={`/dashboard/projects/${projectId}/workbench`}
            className="text-text-muted hover:text-text-primary hover:underline"
          >
            {project.title}
          </Link>
          <span aria-hidden="true" className="text-text-muted">
            /
          </span>
        </>
      ) : null}
      <span className="font-medium text-text-primary">{screenEntry.label}</span>
    </nav>
  )
}
