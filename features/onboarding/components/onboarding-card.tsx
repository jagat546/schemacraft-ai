"use client"

import { useState, useTransition } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { LayoutTemplateIcon, SparklesIcon, XIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { PromptSuggestions } from "@/features/ai-workspace/components/prompt-suggestions"
import { dismissOnboardingAction } from "@/lib/actions/onboarding.actions"
import { useGenerationStore } from "@/lib/stores/generation-store"

// S6-007: a dismissible empty-state onboarding card, not a guided
// tour/coach-marks/walkthrough overlay (explicitly out of scope per the
// approved decision) -- Generator-Experience-Specification.md's own
// "training wheels that never come off" warning is why this stays a
// single static card rather than a multi-step flow. Reuses
// PromptSuggestions as-is (same component the Generator itself uses) and
// the Generator's own generation-store to carry a picked prompt across
// the navigation to /dashboard/generator, rather than inventing a new
// query-param or prop-drilling mechanism for the same data.
export function OnboardingCard() {
  const [dismissed, setDismissed] = useState(false)
  const [, startTransition] = useTransition()
  const router = useRouter()
  const setPrompt = useGenerationStore((store) => store.setPrompt)

  function dismiss() {
    setDismissed(true)
    startTransition(() => dismissOnboardingAction())
  }

  function goToGeneratorWith(prompt: string) {
    setPrompt(prompt)
    router.push("/dashboard/generator")
  }

  if (dismissed) {
    return null
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Generate your first schema</CardTitle>
        <CardDescription>
          Describe a database in plain language and SchemaCraft AI turns it into SQL, a Drizzle
          model, sample JSON, and documentation.
        </CardDescription>
        <CardAction>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Dismiss"
            onClick={dismiss}
          >
            <XIcon />
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <span className="text-body-sm font-medium text-text-secondary">Try an example</span>
          <PromptSuggestions onSelect={goToGeneratorWith} />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button nativeButton={false} render={<Link href="/dashboard/generator" />}>
            <SparklesIcon />
            Generate your first schema
          </Button>
          <Button
            variant="outline"
            nativeButton={false}
            render={<Link href="/dashboard/generator" />}
          >
            <LayoutTemplateIcon />
            Browse templates
          </Button>
          <Button variant="ghost" nativeButton={false} render={<Link href="/" />}>
            Documentation
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
