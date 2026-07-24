"use client"

// Owns the actual generateSchema Server Action call and the side effects
// around it (toasts, transition). This is the boundary that used to live
// inside components/dashboard/schema-generator.tsx directly — moved here
// so the component stays presentation-only and the store stays free of
// any API-calling responsibility (generation-store just holds state).
import { useTransition } from "react"
import { toast } from "sonner"

import { generateSchema } from "@/lib/actions/generate-schema"
import { useGenerationStore } from "@/lib/stores/generation-store"

export function useGenerateSchema() {
  const prompt = useGenerationStore((store) => store.prompt)
  const setPrompt = useGenerationStore((store) => store.setPrompt)
  const generationState = useGenerationStore((store) => store.state)
  const startGenerating = useGenerationStore((store) => store.startGenerating)
  const succeed = useGenerationStore((store) => store.succeed)
  const fail = useGenerationStore((store) => store.fail)
  const [, startTransition] = useTransition()

  function generate(projectId: string | null) {
    if (!projectId) return

    startGenerating()
    startTransition(async () => {
      const outcome = await generateSchema(prompt, projectId)
      if (outcome.status === "SUCCESS" || outcome.status === "GENERATED_NOT_SAVED") {
        succeed(outcome.data)
        if (outcome.status === "GENERATED_NOT_SAVED") {
          toast.error(`Generated, but couldn't save it to the project: ${outcome.error}`)
        }
      } else {
        fail(outcome.error)
        toast.error(outcome.error)
      }
    })
  }

  return { prompt, setPrompt, state: generationState, generate }
}
