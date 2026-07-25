"use client"

import { useState } from "react"
import Link from "next/link"
import { Loader2, Sparkles } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { OutputTabs } from "@/features/workbench/components/output-tabs"
import { generatePublicSchemaAction } from "@/lib/actions/generate-schema-public"
import type { GeneratedSchema } from "@/types/schema"

type SandboxState =
  | { status: "idle" }
  | { status: "generating" }
  | { status: "success"; data: GeneratedSchema }
  | { status: "error"; message: string }

// Matches the sandbox action's own zod cap
// (lib/actions/generate-schema-public.ts) — TD-013.
const SANDBOX_PROMPT_MAX_LENGTH = 500

export function HeroSandbox() {
  const [prompt, setPrompt] = useState("")
  const [state, setState] = useState<SandboxState>({ status: "idle" })

  async function handleGenerate() {
    setState({ status: "generating" })
    const result = await generatePublicSchemaAction({ prompt })

    if (result.status === "SUCCESS") {
      setState({ status: "success", data: result.data })
    } else {
      setState({ status: "error", message: result.error })
    }
  }

  const isGenerating = state.status === "generating"

  return (
    <div className="mx-auto w-full max-w-3xl text-left">
      <div className="flex flex-col gap-3 rounded-xl border bg-card p-4">
        <Textarea
          value={prompt}
          onChange={(event) => setPrompt(event.target.value)}
          placeholder="e.g. 'a blog with posts and authors'"
          disabled={isGenerating}
          maxLength={SANDBOX_PROMPT_MAX_LENGTH}
          className="min-h-20"
          aria-label="Describe the data you want"
        />
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-col gap-0.5">
            <p className="text-xs text-muted-foreground">
              Free, no account needed — limited to 5 tries per visitor per hour.
            </p>
            <span className="text-xs text-muted-foreground">
              {prompt.length} / {SANDBOX_PROMPT_MAX_LENGTH}
            </span>
          </div>
          <Button onClick={handleGenerate} disabled={isGenerating || prompt.trim().length === 0}>
            {isGenerating ? <Loader2 className="animate-spin" /> : <Sparkles />}
            Generate
          </Button>
        </div>
      </div>

      {state.status === "error" && (
        <div className="mt-4 flex flex-col items-start gap-2 rounded-xl border bg-card p-4 text-sm">
          <p className="text-destructive">{state.message}</p>
          <Button size="sm" nativeButton={false} render={<Link href="/signup" />}>
            Sign up for full access
          </Button>
        </div>
      )}

      {state.status === "success" && (
        <div className="mt-6">
          <OutputTabs result={state.data} />
        </div>
      )}
    </div>
  )
}
