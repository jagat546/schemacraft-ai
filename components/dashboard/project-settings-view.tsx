import Link from "next/link"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { DialectSelector } from "@/features/settings/components/dialect-selector"
import { NamingConventionToggle } from "@/features/settings/components/naming-convention-toggle"
import { getProjectByIdAction } from "@/lib/actions/project.actions"

export async function ProjectSettingsView({ projectId }: { projectId: string }) {
  const result = await getProjectByIdAction({ projectId })

  if (!result.ok) {
    return (
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-4">
        <BackToDashboard />
        <Card>
          <CardContent className="flex flex-col items-center gap-2 py-10 text-center">
            <p className="text-sm font-medium">Project not found</p>
            <p className="text-sm text-muted-foreground">{result.error}</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Project Settings</h1>
          <p className="text-sm text-muted-foreground">{result.data.title}</p>
        </div>
        <BackToDashboard />
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="font-normal text-muted-foreground">Generation output</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-6">
          <DialectSelector />
          <NamingConventionToggle />
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
