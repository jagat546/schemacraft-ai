import { Sparkles, DatabaseZap } from "lucide-react"

import { Card, CardContent } from "@/components/ui/card"
import { ProjectsPanel } from "@/components/dashboard/projects-panel"
import { SchemaGenerator } from "@/components/dashboard/schema-generator"
import { getProjectsAction } from "@/lib/actions/project.actions"

export async function DashboardShell() {
  const projectsResult = await getProjectsAction()
  const projects = projectsResult.ok ? projectsResult.data : []
  const loadError = projectsResult.ok ? undefined : projectsResult.error

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-6 py-8">

      {/* Hero Section */}
      <div className="overflow-hidden rounded-3xl bg-gradient-to-r from-violet-600 via-purple-600 to-fuchsia-600 p-10 text-white shadow-2xl">

        <div className="flex items-center gap-4">
          <div className="rounded-2xl bg-white/20 p-4 backdrop-blur">
            <DatabaseZap className="h-9 w-9" />
          </div>

          <div>
            <h1 className="text-4xl font-bold">
              SchemaCraft AI
            </h1>

            <p className="mt-2 text-violet-100 text-lg">
              Generate SQL Schemas, Drizzle Models, Mermaid ER Diagrams &
              Sample Data with AI.
            </p>
          </div>
        </div>

        <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-3">

          <div className="rounded-2xl bg-white/10 p-5 backdrop-blur">
            <h3 className="text-3xl font-bold">
              ⚡
            </h3>

            <p className="mt-2 font-semibold">
              AI Powered
            </p>

            <p className="text-sm text-violet-100">
              Generate complete database schemas in seconds.
            </p>
          </div>

          <div className="rounded-2xl bg-white/10 p-5 backdrop-blur">
            <h3 className="text-3xl font-bold">
              🚀
            </h3>

            <p className="mt-2 font-semibold">
              Production Ready
            </p>

            <p className="text-sm text-violet-100">
              SQL, Drizzle ORM, JSON and Mermaid diagrams instantly.
            </p>
          </div>

          <div className="rounded-2xl bg-white/10 p-5 backdrop-blur">
            <h3 className="text-3xl font-bold">
              💜
            </h3>

            <p className="mt-2 font-semibold">
              Beautiful UI
            </p>

            <p className="text-sm text-violet-100">
              Modern workspace inspired by premium SaaS products.
            </p>
          </div>

        </div>
      </div>

      {/* Projects */}
      <div>

        <h2 className="mb-1 text-2xl font-bold text-violet-900">
          Your Projects
        </h2>

        <p className="mb-5 text-violet-500">
          Organize all your generated database schemas.
        </p>

        <ProjectsPanel
          initialProjects={projects}
          loadError={loadError}
        />
      </div>

      {/* Generator */}
      <div>

        <h2 className="mb-1 flex items-center gap-2 text-2xl font-bold text-violet-900">
          <Sparkles className="h-6 w-6 text-violet-600" />
          AI Schema Generator
        </h2>

        <p className="mb-5 text-violet-500">
          Describe your application in plain English and let AI generate
          everything automatically.
        </p>

        <Card className="rounded-3xl border border-violet-200 bg-white shadow-xl">
          <CardContent className="p-8">
            <SchemaGenerator projects={projects} />
          </CardContent>
        </Card>

      </div>

    </div>
  )
}