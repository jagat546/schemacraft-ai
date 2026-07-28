import { WorkbenchView } from "@/components/dashboard/workbench-view"

export default async function WorkbenchPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ generation?: string }>
}) {
  const { id: projectId } = await params
  const { generation: generationId } = await searchParams

  return <WorkbenchView projectId={projectId} generationId={generationId} />
}
