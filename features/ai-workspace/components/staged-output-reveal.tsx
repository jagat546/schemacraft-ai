"use client"

import { useEffect, useState } from "react"

import { ExportAllButton } from "@/features/ai-workspace/components/export-all-button"
import { OutputTabs } from "@/features/workbench/components/output-tabs"
import { cn } from "@/lib/utils"
import type { GeneratedSchema } from "@/types/schema"

const REVEAL_ORDER: Array<{ key: keyof GeneratedSchema; label: string }> = [
  { key: "sql", label: "SQL" },
  { key: "drizzle", label: "Drizzle" },
  { key: "json", label: "JSON" },
  { key: "documentation", label: "Documentation" },
  { key: "mermaidDiagram", label: "ER Diagram" },
]

// Stagger between each dot turning "ready" -- duration-fast (150ms) per
// Design System 2.0 §8, applied as a JS timer since this paces a *sequence*
// of state changes, not a single CSS transition.
const STAGGER_MS = 150

// Generator-Experience-Specification.md §Streaming Generation, resolved
// interpretation (Sprint-04-Implementation-Roadmap.md §1): all five
// artifacts are already fully present in `result` the instant this mounts
// -- lib/services/generation.service.ts makes one AI call, then compiles
// every artifact synchronously from the same AST, with no per-artifact
// latency to genuinely stream. This stages the *reveal* of the completion
// indicators only; OutputTabs itself is never gated -- a user can click
// ahead to content whose dot hasn't turned green yet, because the data
// backing it already fully arrived. Never a claim that something is
// "still generating" once this component exists at all.
//
// Deliberately a wrapper around OutputTabs, not a change to OutputTabs
// itself: that component is shared by the Workbench, the sandbox, and the
// landing page's Interactive Demo (S4-007), none of which should ever
// stage a reveal -- Workbench/sandbox show a past or just-computed result
// with no "just succeeded" moment to pace, and the Interactive Demo is a
// static, pre-existing example.
// The caller (schema-generator.tsx) passes key={result.sql}, so React
// remounts this component fresh for each new generation -- the idiomatic
// fix for "reset derived state when a prop changes" is a key-driven
// remount, not an effect that calls setState on every result change.
export function StagedOutputReveal({ result }: { result: GeneratedSchema }) {
  const presentArtifacts = REVEAL_ORDER.filter((entry) => result[entry.key] !== undefined)
  const [revealedCount, setRevealedCount] = useState(() => (presentArtifacts.length > 0 ? 1 : 0))

  useEffect(() => {
    if (revealedCount === 0 || revealedCount >= presentArtifacts.length) {
      return
    }
    const timer = setTimeout(() => setRevealedCount((count) => count + 1), STAGGER_MS)
    return () => clearTimeout(timer)
  }, [revealedCount, presentArtifacts.length])

  const justRevealed = presentArtifacts[revealedCount - 1]

  return (
    <div className="flex flex-col gap-2">
      <span className="sr-only" role="status" aria-live="polite">
        {justRevealed ? `${justRevealed.label} ready` : null}
      </span>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3" aria-hidden="true">
          {presentArtifacts.map((entry, index) => (
            <span key={entry.key} className="flex items-center gap-1.5 text-caption text-text-muted">
              <span
                className={cn(
                  "size-1.5 rounded-full transition-colors duration-150",
                  index < revealedCount ? "bg-accent-emerald" : "bg-border-strong"
                )}
              />
              {entry.label}
            </span>
          ))}
        </div>
        <ExportAllButton result={result} />
      </div>
      <OutputTabs result={result} />
    </div>
  )
}
