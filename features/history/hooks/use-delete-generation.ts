"use client"

// Owns the deleteGenerationAction Server Action call and its side effects
// (dialog state, toast, RSC refresh) — same client-side orchestration
// boundary this project already established in
// features/projects/hooks/use-create-project.ts. One instance per
// GenerationHistoryItem rather than a shared store: which generation is
// pending deletion is local, transient UI state with exactly one
// consumer, not something another part of the app needs to read.
import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

import { deleteGenerationAction } from "@/lib/actions/generation.actions"

export function useDeleteGeneration(input: { generationId: string; projectId: string }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()

  function handleDelete() {
    startTransition(async () => {
      const outcome = await deleteGenerationAction(input)
      if (!outcome.ok) {
        toast.error(outcome.error)
        return
      }
      toast.success("Generation deleted")
      setOpen(false)
      router.refresh()
    })
  }

  return { open, setOpen, isPending, handleDelete }
}
