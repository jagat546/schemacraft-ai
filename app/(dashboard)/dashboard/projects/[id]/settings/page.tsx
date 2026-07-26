import { ProjectSettingsView } from "@/components/dashboard/project-settings-view"

export default async function ProjectSettingsPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id: projectId } = await params

  return <ProjectSettingsView projectId={projectId} />
}
