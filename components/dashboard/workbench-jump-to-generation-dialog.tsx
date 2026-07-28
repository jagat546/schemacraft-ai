"use client"

import { useRouter } from "next/navigation"

import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import type { Generation } from "@/lib/repositories/generation.repository"

// Workbench-Experience-Specification.md §Command Palette / §Navigation:
// "Jump to generation…" "opens History inline rather than navigating away"
// -- a separate, lightweight picker scoped to this project's own generation
// list (already fetched for prev/next nav), not a navigation to the full
// /history route. Reuses the same Command primitives CommandPalette itself
// is built from, but is a genuinely separate Dialog with its own open
// state -- selecting "Jump to generation…" from the main palette closes
// that palette and opens this one, rather than nesting dialogs.
export function JumpToGenerationDialog({
  open,
  onOpenChange,
  projectId,
  generations,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  projectId: string
  generations: Generation[]
}) {
  const router = useRouter()

  function handleSelect(generationId: string) {
    onOpenChange(false)
    router.push(`/dashboard/projects/${projectId}/workbench?generation=${generationId}`)
  }

  return (
    <CommandDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Jump to generation"
      description="Pick a generation to view in the Workbench"
    >
      <CommandInput placeholder="Search generations…" />
      <CommandList>
        <CommandEmpty>No generations found.</CommandEmpty>
        <CommandGroup heading="Generations">
          {generations.map((generation) => (
            <CommandItem
              key={generation.id}
              value={`v${generation.versionNumber} ${generation.prompt}`}
              onSelect={() => handleSelect(generation.id)}
            >
              <span className="font-medium">v{generation.versionNumber}</span>
              <span className="truncate text-muted-foreground">{generation.prompt}</span>
              <span className="ml-auto shrink-0 text-xs text-muted-foreground">
                {new Date(generation.createdAt).toLocaleDateString(undefined, { dateStyle: "medium" })}
              </span>
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  )
}
