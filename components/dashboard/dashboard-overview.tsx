import { ProjectsPanel } from "@/features/projects/components/projects-panel"
import { getProjectsAction } from "@/lib/actions/project.actions"

export async function DashboardOverview() {
  const projectsResult = await getProjectsAction()
  const projects = projectsResult.ok ? projectsResult.data : []
  const loadError = projectsResult.ok ? undefined : projectsResult.error

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Projects</h1>
        <p className="text-sm text-muted-foreground">
          Create a project to organize and save your generated schemas.
        </p>
      </div>
      <ProjectsPanel initialProjects={projects} loadError={loadError} />
    </div>
  )
}
