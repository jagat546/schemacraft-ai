import { GenerationHistoryView } from "@/components/dashboard/generation-history-view"

export default async function GenerationHistoryPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id: projectId } = await params

  return <GenerationHistoryView projectId={projectId} />
}
