"use client"

import { useMemo, useState } from "react"
import { ClipboardIcon, MaximizeIcon, MilestoneIcon, PanelRightIcon } from "lucide-react"
import { toast } from "sonner"

import { JumpToGenerationDialog } from "@/components/dashboard/workbench-jump-to-generation-dialog"
import { useRegisterCommands } from "@/features/shell/components/command-registry-provider"
import { useCopyToClipboard } from "@/hooks/use-copy-to-clipboard"
import { OUTPUT_CONFIG } from "@/features/workbench/lib/output-config"
import { useWorkbenchStore } from "@/lib/stores/workbench-store"
import type { Generation } from "@/lib/repositories/generation.repository"
import type { GeneratedSchema } from "@/types/schema"
import type { OutputVariant } from "@/types/ui"

// GeneratedSchema's keys don't map 1:1 onto OutputVariant (the ERD tab is
// "mermaid" but the field is `mermaidDiagram`) -- an exhaustive switch
// keeps this safe against either type changing later, unlike a direct
// `artifacts[tab]` index.
function getTabContent(artifacts: GeneratedSchema, tab: OutputVariant): string | undefined {
  switch (tab) {
    case "sql":
      return artifacts.sql
    case "drizzle":
      return artifacts.drizzle
    case "json":
      return artifacts.json
    case "documentation":
      return artifacts.documentation
    case "mermaid":
      return artifacts.mermaidDiagram
  }
}

// Workbench-Experience-Specification.md §Command Palette: registers the
// four Workbench-scoped commands for as long as this component is mounted
// -- it's rendered only inside WorkbenchClientShell, so these commands
// exist in CommandPalette only while a Workbench route is actually being
// viewed, and disappear the instant the user navigates away. No pathname
// check anywhere; CommandRegistryProvider's own mount-lifetime registration
// is what makes this "route-scoped."
export function WorkbenchCommandRegistration({
  projectId,
  generations,
  artifacts,
}: {
  projectId: string
  generations: Generation[]
  artifacts: GeneratedSchema
}) {
  const [jumpDialogOpen, setJumpDialogOpen] = useState(false)
  const toggleFullscreen = useWorkbenchStore((state) => state.toggleFullscreen)
  const toggleErdPanel = useWorkbenchStore((state) => state.toggleErdPanel)
  const activeTab = useWorkbenchStore((state) => state.getProjectState(projectId).activeTab)
  const { copy } = useCopyToClipboard()

  const commands = useMemo(
    () => [
      {
        group: "Workbench",
        label: "Jump to generation…",
        icon: MilestoneIcon,
        onSelect: () => setJumpDialogOpen(true),
      },
      {
        group: "Workbench",
        label: "Toggle ERD panel",
        icon: PanelRightIcon,
        onSelect: () => toggleErdPanel(projectId),
      },
      {
        group: "Workbench",
        label: "Toggle fullscreen",
        icon: MaximizeIcon,
        onSelect: toggleFullscreen,
      },
      {
        group: "Workbench",
        label: `Copy ${OUTPUT_CONFIG[activeTab].label} to clipboard`,
        icon: ClipboardIcon,
        onSelect: async () => {
          const content = getTabContent(artifacts, activeTab)
          if (!content) return
          const ok = await copy(content)
          if (ok) {
            toast.success(`Copied ${OUTPUT_CONFIG[activeTab].label}`)
          } else {
            toast.error("Couldn't copy. Your browser may have blocked clipboard access.")
          }
        },
      },
    ],
    [projectId, activeTab, artifacts, toggleErdPanel, toggleFullscreen, copy]
  )

  useRegisterCommands(commands)

  return (
    <JumpToGenerationDialog
      open={jumpDialogOpen}
      onOpenChange={setJumpDialogOpen}
      projectId={projectId}
      generations={generations}
    />
  )
}
