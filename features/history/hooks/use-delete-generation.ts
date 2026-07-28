"use client"

// Owns the deleteGenerationAction Server Action call and its side effects
// (dialog state, toast, RSC refresh) — same client-side orchestration
// boundary this project already established in
// features/projects/hooks/use-create-project.ts. One instance per
// GenerationHistoryItem rather than a shared store: which generation is
// pending deletion is local, transient UI state with exactly one
// consumer, not something another part of the app needs to read.
//
// S4-013: deletion is undoable for a short window
// (Generator-Experience-Specification.md §Undo/Retry Behavior) --
// deleteGenerationAction is delayed via useUndoableAction, not called
// immediately, so clicking Undo genuinely prevents it from ever firing
// rather than reversing an already-completed delete. isPendingDelete
// drives a visual fade in the meantime (GenerationHistoryItem) so the
// card doesn't just sit there unchanged while a "deleted" toast is up.
import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

import { useUndoableAction } from "@/hooks/use-undoable-action"
import { deleteGenerationAction } from "@/lib/actions/generation.actions"

const UNDO_WINDOW_MS = 5000

export function useDeleteGeneration(input: { generationId: string; projectId: string }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [isPendingDelete, setIsPendingDelete] = useState(false)

  const { run, undo } = useUndoableAction(async () => {
    const outcome = await deleteGenerationAction(input)
    if (!outcome.ok) {
      setIsPendingDelete(false)
      toast.error(outcome.error)
      return
    }
    router.refresh()
  }, UNDO_WINDOW_MS)

  function handleDelete() {
    setOpen(false)
    setIsPendingDelete(true)
    run(undefined)
    toast("Generation deleted", {
      action: {
        label: "Undo",
        onClick: () => {
          if (undo()) {
            setIsPendingDelete(false)
            toast.success("Restored")
          }
        },
      },
      duration: UNDO_WINDOW_MS,
    })
  }

  return { open, setOpen, isPendingDelete, handleDelete }
}
