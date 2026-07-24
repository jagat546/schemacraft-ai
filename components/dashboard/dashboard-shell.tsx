import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { SchemaGenerator } from "@/features/ai-workspace/components/schema-generator"
import { ProjectsPanel } from "@/features/projects/components/projects-panel"
import { getProjectsAction } from "@/lib/actions/project.actions"

export async function DashboardShell() {
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

      <div>
        <h2 className="text-xl font-semibold tracking-tight">Schema Generator</h2>
        <p className="text-sm text-muted-foreground">
          Describe your data in plain English and get SQL, a Drizzle model, and sample JSON.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Prompt</CardTitle>
        </CardHeader>
        <CardContent>
          <SchemaGenerator projects={projects} />
        </CardContent>
      </Card>
    </div>
  )
}
