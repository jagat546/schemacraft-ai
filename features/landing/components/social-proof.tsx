import Link from "next/link"
import { ExternalLinkIcon } from "lucide-react"

import { FadeInSection } from "@/features/landing/components/fade-in-section"

// Landing-Experience-Specification.md §Social Proof: no fabricated numbers
// or logos -- an honestly small, truthful proof section beats an inflated
// one. The repo URL below is this project's own, already-public
// package.json "repository" field, not invented for this section.
//
// lucide-react ships no brand/logo icons (confirmed: no GitHub icon exists
// in the installed v1.25.0) -- ExternalLinkIcon as a trailing icon is
// Design System 2.0 §9's own documented choice for "a link that leaves
// the app," not a substitute brand mark.
export function SocialProof() {
  return (
    <section className="border-t border-border-subtle bg-surface-1 py-10">
      <FadeInSection className="mx-auto flex w-full max-w-6xl flex-col items-center gap-2 px-4 text-center md:px-6">
        <p className="text-body-sm text-text-muted">Built in the open.</p>
        <Link
          href="https://github.com/jagat546/schemacraft-ai"
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1.5 text-body-sm text-text-secondary hover:text-text-primary hover:underline"
        >
          View the source on GitHub
          <ExternalLinkIcon aria-hidden="true" className="size-4" />
        </Link>
      </FadeInSection>
    </section>
  )
}
