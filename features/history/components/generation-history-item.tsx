"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { Code2Icon, PencilIcon, Trash2Icon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardAction, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { useDeleteGeneration } from "@/features/history/hooks/use-delete-generation"
import { useGenerationStore } from "@/lib/stores/generation-store"
import { useProjectStore } from "@/lib/stores/project-store"
import type { Generation } from "@/lib/repositories/generation.repository"
import { cn } from "@/lib/utils"

export function GenerationHistoryItem({
  generation,
  projectId,
}: {
  generation: Generation
  projectId: string
}) {
  const { open, setOpen, isPendingDelete, handleDelete } = useDeleteGeneration({
    generationId: generation.id,
    projectId,
  })
  const router = useRouter()
  const setPrompt = useGenerationStore((store) => store.setPrompt)
  const selectProject = useProjectStore((store) => store.selectProject)

  // S7-002: reuses the exact carry-a-prompt-forward pattern
  // OnboardingCard (S6-007) already established -- set the shared
  // generation-store's prompt, then navigate to the Generator, rather
  // than inventing a query-param or prop-drilling mechanism for the same
  // data. Also syncs project-store's selection to this generation's own
  // project: that store persists across the whole client session and is
  // never otherwise updated by History, so without this, the Generator
  // could land on whatever project was previously selected -- a
  // different one than the generation being edited -- and silently save
  // the new version under the wrong project.
  function handleEditAndRegenerate() {
    setPrompt(generation.prompt)
    selectProject(projectId)
    router.push("/dashboard/generator")
  }

  const createdAt = new Date(generation.createdAt).toLocaleDateString(undefined, {
    dateStyle: "medium",
  })

  return (
    <Card
      aria-hidden={isPendingDelete}
      className={cn(
        "transition-opacity duration-200",
        isPendingDelete && "pointer-events-none opacity-40"
      )}
    >
      <CardHeader>
        <CardTitle>
          Version {generation.versionNumber} · {createdAt}
        </CardTitle>
        <CardDescription className="line-clamp-2">{generation.prompt}</CardDescription>
        <CardAction className="flex items-center gap-1">
          <Button
            variant="outline"
            size="sm"
            nativeButton={false}
            render={<Link href={`/dashboard/projects/${projectId}/workbench?generation=${generation.id}`} />}
          >
            <Code2Icon />
            Open
          </Button>
          <Button variant="outline" size="sm" onClick={handleEditAndRegenerate}>
            <PencilIcon />
            Edit & Regenerate
          </Button>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger
              render={
                <Button
                  variant="outline"
                  size="icon-sm"
                  aria-label={`Delete version ${generation.versionNumber}`}
                />
              }
            >
              <Trash2Icon />
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Delete this generation?</DialogTitle>
                <DialogDescription>
                  Version {generation.versionNumber} ({createdAt}) will be deleted. You can undo this
                  for a few seconds right after.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <DialogClose render={<Button type="button" variant="outline" />}>Cancel</DialogClose>
                <Button variant="destructive" onClick={handleDelete}>
                  Delete
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardAction>
      </CardHeader>
    </Card>
  )
}
