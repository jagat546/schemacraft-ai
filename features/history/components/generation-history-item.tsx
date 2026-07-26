"use client"

import Link from "next/link"
import { Code2Icon, Trash2Icon } from "lucide-react"

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
