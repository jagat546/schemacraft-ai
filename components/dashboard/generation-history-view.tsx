import Link from "next/link"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { GenerationHistoryList } from "@/features/history/components/generation-history-list"
import { getProjectGenerationsAction } from "@/lib/actions/generation.actions"
import { getProjectByIdAction } from "@/lib/actions/project.actions"

export async function GenerationHistoryView({ projectId }: { projectId: string }) {
  const [projectResult, generationsResult] = await Promise.all([
    getProjectByIdAction({ projectId }),
    getProjectGenerationsAction({ projectId }),
  ])

  if (!projectResult.ok) {
    return (
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-4">
        <BackToDashboard />
        <Card>
          <CardContent className="flex flex-col items-center gap-2 py-10 text-center">
            <p className="text-sm font-medium">Project not found</p>
            <p className="text-sm text-muted-foreground">{projectResult.error}</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">History</h1>
          <p className="text-sm text-muted-foreground">{projectResult.data.title}</p>
        </div>
        <BackToDashboard />
      </div>
      {generationsResult.ok ? (
        <GenerationHistoryList generations={generationsResult.data} projectId={projectId} />
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 py-10 text-center">
            <p className="text-sm font-medium">Could not load history</p>
            <p className="text-sm text-muted-foreground">{generationsResult.error}</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function BackToDashboard() {
  return (
    <Button variant="outline" size="sm" nativeButton={false} render={<Link href="/dashboard" />}>
      Back to Dashboard
    </Button>
  )
}
