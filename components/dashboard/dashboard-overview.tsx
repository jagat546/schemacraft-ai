import { ProjectsPanel } from "@/features/projects/components/projects-panel"
import { OnboardingCard } from "@/features/onboarding/components/onboarding-card"
import { getGenerationCountsByProjectAction } from "@/lib/actions/generation.actions"
import { getProjectsAction } from "@/lib/actions/project.actions"
import { isOnboardingDismissed } from "@/lib/onboarding/dismissed-cookie"

export async function DashboardOverview() {
  const [projectsResult, countsResult, onboardingDismissed] = await Promise.all([
    getProjectsAction(),
    getGenerationCountsByProjectAction(),
    isOnboardingDismissed(),
  ])
  const projects = projectsResult.ok ? projectsResult.data : []
  const loadError = projectsResult.ok ? undefined : projectsResult.error
  const generationCounts = countsResult.ok ? countsResult.data : {}

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
      {onboardingDismissed ? null : <OnboardingCard />}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Projects</h1>
        <p className="text-sm text-muted-foreground">
          Create a project to organize and save your generated schemas.
        </p>
      </div>
      <ProjectsPanel
        initialProjects={projects}
        generationCounts={generationCounts}
        loadError={loadError}
      />
    </div>
  )
}
