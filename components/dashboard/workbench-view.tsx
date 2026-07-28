import Link from "next/link"
import { Code2Icon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { WorkbenchClientShell } from "@/components/dashboard/workbench-client-shell"
import { getProjectGenerationsAction } from "@/lib/actions/generation.actions"

export async function WorkbenchView({
  projectId,
  generationId,
}: {
  projectId: string
  generationId?: string
}) {
  const result = await getProjectGenerationsAction({ projectId })
  const generations = result.ok ? result.data : []
  const generation = generationId
    ? (generations.find((candidate) => candidate.id === generationId) ?? null)
    : (generations[0] ?? null)

  if (!generation) {
    return (
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-4">
        <BackToDashboard />
        <Card>
          <CardContent className="flex flex-col items-center gap-2 py-10 text-center">
            <Code2Icon className="size-8 text-muted-foreground" />
            <p className="text-sm font-medium">No generation to show</p>
            <p className="text-sm text-muted-foreground">
              {generationId
                ? "That generation couldn't be found."
                : "This project doesn't have any generations yet."}
            </p>
            <Button size="sm" nativeButton={false} render={<Link href="/dashboard/generator" />}>
              Open Generator
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <WorkbenchClientShell projectId={projectId} generation={generation} generations={generations} />
  )
}

function BackToDashboard() {
  return (
    <Button variant="outline" size="sm" nativeButton={false} render={<Link href="/dashboard" />}>
      Back to Dashboard
    </Button>
  )
}
