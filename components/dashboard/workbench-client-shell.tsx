"use client"

import Link from "next/link"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { WorkbenchCommandRegistration } from "@/components/dashboard/workbench-command-registration"
import { FullscreenToggle } from "@/components/dashboard/workbench-fullscreen-toggle"
import { GenerationNav } from "@/components/dashboard/workbench-generation-nav"
import { OutputTabs } from "@/features/workbench/components/output-tabs"
import { useWorkbenchStore } from "@/lib/stores/workbench-store"
import type { Generation } from "@/lib/repositories/generation.repository"

// Everything Workbench-Experience-Specification.md §S4-015 scope needs
// (fullscreen, scoped commands, prev/next nav, session persistence) is
// client-side interactive state, so this is the Client Component boundary:
// WorkbenchView (Server Component) does the data loading (requireUser's
// gate, Supabase fetches), then hands the already-resolved data to this
// component to render and wire up to useWorkbenchStore.
export function WorkbenchClientShell({
  projectId,
  generation,
  generations,
}: {
  projectId: string
  generation: Generation
  generations: Generation[]
}) {
  const projectState = useWorkbenchStore((state) => state.getProjectState(projectId))
  const setActiveTab = useWorkbenchStore((state) => state.setActiveTab)
  const toggleArtifactPanel = useWorkbenchStore((state) => state.toggleArtifactPanel)
  const toggleErdPanel = useWorkbenchStore((state) => state.toggleErdPanel)
  const setSplitSizes = useWorkbenchStore((state) => state.setSplitSizes)
  const setMinimapOverride = useWorkbenchStore((state) => state.setMinimapOverride)

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
      <WorkbenchCommandRegistration
        projectId={projectId}
        generations={generations}
        artifacts={generation.artifacts}
      />
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Workbench</h1>
          <p className="text-sm text-muted-foreground">
            Version {generation.versionNumber} ·{" "}
            {new Date(generation.createdAt).toLocaleDateString(undefined, {
              dateStyle: "medium",
            })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <GenerationNav
            projectId={projectId}
            generations={generations}
            currentGenerationId={generation.id}
          />
          <FullscreenToggle />
          <Button variant="outline" size="sm" nativeButton={false} render={<Link href="/dashboard" />}>
            Back to Dashboard
          </Button>
        </div>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="line-clamp-2 font-normal text-muted-foreground">
            {generation.prompt}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <OutputTabs
            result={generation.artifacts}
            tabState={{
              value: projectState.activeTab,
              onValueChange: (tab) => setActiveTab(projectId, tab),
            }}
            minimapOverride={projectState.minimapOverride}
            onMinimapOverrideChange={(enabled) => setMinimapOverride(projectId, enabled)}
            panelCollapse={{
              artifactCollapsed: projectState.artifactPanelCollapsed,
              erdCollapsed: projectState.erdPanelCollapsed,
              onToggleArtifact: () => toggleArtifactPanel(projectId),
              onToggleErd: () => toggleErdPanel(projectId),
            }}
            splitSizes={projectState.splitSizes ?? undefined}
            onSplitSizesChange={(sizes) => setSplitSizes(projectId, sizes)}
          />
        </CardContent>
      </Card>
    </div>
  )
}
