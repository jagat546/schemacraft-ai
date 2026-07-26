"use client"

import { useState } from "react"

import { FadeInSection } from "@/features/landing/components/fade-in-section"
import { INTERACTIVE_DEMO_SCHEMA } from "@/features/landing/lib/interactive-demo-fixture"
import { OutputTabs } from "@/features/workbench/components/output-tabs"
import { useInView } from "@/hooks/use-in-view"
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
  // OutputTabs -> CodeViewer dynamic-imports Monaco (Sprint-04-Implementation-
  // Roadmap.md §S4-014's own bundle-size risk callout). FadeInSection alone
  // only toggles opacity/transform -- its children mount immediately on page
  // load regardless of scroll position, which would otherwise make every
  // landing-page visit kick off Monaco's chunk load (and its CDN fetch) even
  // for visitors who never scroll this far. A second, independent
  // useInView() gates the actual OutputTabs mount so that cost is paid only
  // once this section is actually reached.
  const [demoRef, demoInView] = useInView<HTMLDivElement>()

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
        <div
          ref={demoRef}
          className="mt-8 h-[32rem] rounded-lg border border-border-subtle bg-surface-2 shadow-sm"
        >
          {demoInView && (
            <OutputTabs
              result={INTERACTIVE_DEMO_SCHEMA}
              tabState={{ value: activeTab, onValueChange: setActiveTab }}
            />
          )}
        </div>
      </FadeInSection>
    </section>
  )
}
