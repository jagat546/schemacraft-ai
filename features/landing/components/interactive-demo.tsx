"use client"

import { useState } from "react"

import { FadeInSection } from "@/features/landing/components/fade-in-section"
import { INTERACTIVE_DEMO_SCHEMA } from "@/features/landing/lib/interactive-demo-fixture"
import { OutputTabs } from "@/features/workbench/components/output-tabs"
import type { OutputVariant } from "@/types/ui"

// Landing-Experience-Specification.md §Interactive Demo: a static, curated,
// non-trivial example (distinct from the Live Playground, which generates
// on demand) so a visitor can see real complexity without waiting on a
// generation. Reuses OutputTabs -- the same component the authenticated app
// uses -- rather than a bespoke preview. tabState is instance-scoped
// (not the shared ui-store) since this section can render on the same page
// as the sandbox's own OutputTabs, which must not have its tab selection
// silently tied to this one.
export function InteractiveDemo() {
  const [activeTab, setActiveTab] = useState<OutputVariant>("sql")

  return (
    <section className="border-t border-border-subtle bg-surface-1/50 py-20">
      <FadeInSection className="mx-auto w-full max-w-6xl px-4 md:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-h2 font-semibold text-text-primary">
            See it handle real complexity
          </h2>
          <p className="mt-2 text-body text-text-secondary">
            A curated example — nine related tables, generated from one prompt.
          </p>
        </div>
        <div className="mt-8 rounded-lg border border-border-subtle bg-surface-2 shadow-sm">
          <OutputTabs
            result={INTERACTIVE_DEMO_SCHEMA}
            tabState={{ value: activeTab, onValueChange: setActiveTab }}
          />
        </div>
      </FadeInSection>
    </section>
  )
}
