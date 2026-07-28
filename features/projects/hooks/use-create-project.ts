"use client"

// Owns the createProjectAction Server Action call and its side effects
// (dialog state, form fields, toast, store sync, RSC refresh). Extracted
// from components/dashboard/projects-panel.tsx, which previously called
// the Server Action directly — same boundary this project already
// established in features/ai-workspace/hooks/use-generate-schema.ts.
import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

import { createProjectAction } from "@/lib/actions/project.actions"
import { useProjectStore } from "@/lib/stores/project-store"

export function useCreateProject() {
  const router = useRouter()
  const addProject = useProjectStore((store) => store.addProject)
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleCreate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    startTransition(async () => {
      const outcome = await createProjectAction({
        title,
        description: description.trim() ? description : undefined,
      })
      if (!outcome.ok) {
        setError(outcome.error)
        toast.error(outcome.error)
        return
      }
      addProject(outcome.data)
      setTitle("")
      setDescription("")
      setOpen(false)
      router.refresh()
    })
  }

  return {
    open,
    setOpen,
    title,
    setTitle,
    description,
    setDescription,
    error,
    isPending,
    handleCreate,
  }
}
