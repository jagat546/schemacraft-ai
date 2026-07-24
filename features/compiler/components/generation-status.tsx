"use client"

// Compiler Experience module: renders the generation pipeline's current
// state (idle / generating / error). Reads generation-store directly —
// there's no local UI state to own here, and no per-stage progress to
// show, because the pipeline (lib/services/generation.service.ts) returns
// one final result, not intermediate stage events. See
// docs/architecture/frontend-modularization.md, Day 4 entry.
import { OutputSkeleton } from "@/components/dashboard/output-skeleton"
import { useGenerationStore } from "@/lib/stores/generation-store"

export function GenerationStatus() {
  const state = useGenerationStore((store) => store.state)

  if (state.status === "generating") {
    return (
      <div aria-busy="true">
        <span className="sr-only" role="status" aria-live="polite">
          Generating schema…
        </span>
        <OutputSkeleton />
      </div>
    )
  }

  if (state.status === "idle") {
    return (
      <p className="text-sm text-muted-foreground">
        Describe a schema above and click Generate to see the SQL, Drizzle model, and sample JSON.
      </p>
    )
  }

  if (state.status === "error") {
    return <p className="text-sm text-destructive">{state.message}</p>
  }

  return null
}
