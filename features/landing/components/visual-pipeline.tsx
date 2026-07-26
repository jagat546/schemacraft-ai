import { ArrowRightIcon, MessageSquareIcon } from "lucide-react"

import { FadeInSection } from "@/features/landing/components/fade-in-section"
import { OUTPUTS } from "@/features/landing/components/feature-showcase"

// Landing-Experience-Specification.md §Visual Pipeline: one glanceable
// diagram -- prompt in, five outputs out. Reuses Feature Highlights' exact
// icon set (imported, not redeclared) so the same output always means the
// same icon everywhere on the page. Static: no gradients, no decorative
// motion beyond the one-time section entrance every new section gets.
export function VisualPipeline() {
  return (
    <section className="border-t border-border-subtle py-16">
      <FadeInSection className="mx-auto flex w-full max-w-6xl flex-col items-center gap-6 px-4 md:px-6">
        <div className="flex flex-col items-center gap-4 md:flex-row md:gap-8">
          <div className="flex flex-col items-center gap-2">
            <MessageSquareIcon aria-hidden="true" className="size-6 text-text-muted" />
            <span className="text-body-sm text-text-secondary">Your prompt</span>
          </div>
          <ArrowRightIcon
            aria-hidden="true"
            className="size-5 shrink-0 rotate-90 text-text-muted md:rotate-0"
          />
          <div className="flex flex-wrap items-center justify-center gap-6">
            {OUTPUTS.map(({ icon: Icon, title }) => (
              <div key={title} className="flex flex-col items-center gap-2">
                <Icon aria-hidden="true" className="size-6 text-text-muted" />
                <span className="text-body-sm text-text-secondary">{title}</span>
              </div>
            ))}
          </div>
        </div>
      </FadeInSection>
    </section>
  )
}
