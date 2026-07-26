import Link from "next/link"
import { Code2Icon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { OutputTabs } from "@/features/workbench/components/output-tabs"
import {
  getGenerationAction,
  getProjectGenerationsAction,
} from "@/lib/actions/generation.actions"
import type { Generation } from "@/lib/repositories/generation.repository"

async function loadGeneration(
  projectId: string,
  generationId?: string
): Promise<Generation | null> {
  if (generationId) {
    const result = await getGenerationAction({ generationId, projectId })
    return result.ok ? result.data : null
  }

  const result = await getProjectGenerationsAction({ projectId })
  return result.ok ? (result.data[0] ?? null) : null
}

export async function WorkbenchView({
  projectId,
  generationId,
}: {
  projectId: string
  generationId?: string
}) {
  const generation = await loadGeneration(projectId, generationId)

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
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Workbench</h1>
          <p className="text-sm text-muted-foreground">
            Version {generation.versionNumber} ·{" "}
            {new Date(generation.createdAt).toLocaleDateString(undefined, {
              dateStyle: "medium",
            })}
          </p>
        </div>
        <BackToDashboard />
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="line-clamp-2 font-normal text-muted-foreground">
            {generation.prompt}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <OutputTabs result={generation.artifacts} />
        </CardContent>
      </Card>
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
