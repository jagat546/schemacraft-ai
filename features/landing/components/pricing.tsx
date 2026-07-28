import Link from "next/link"
import { CheckIcon } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { FadeInSection } from "@/features/landing/components/fade-in-section"
import { getPrimaryCtaHref } from "@/features/landing/lib/session-cta"

// Placeholder tier names, prices, and feature lists -- a product/copy
// decision this task does not make (Sprint-04-Implementation-Roadmap.md
// §S4-007 Risks). Requires explicit Product sign-off before this section
// ships to production; the pattern (3 tiers, one recommended) is what
// Landing-Experience-Specification.md §Pricing actually specifies.
const PLACEHOLDER_PRICING_TIERS = [
  {
    name: "Free",
    price: "$0",
    period: "/month",
    description: "Try it out, no account required.",
    features: ["5 sandbox generations per hour", "All 5 output formats", "No saved project history"],
    recommended: false,
  },
  {
    name: "Pro",
    price: "$19",
    period: "/month",
    description: "For individual developers building real projects.",
    features: ["Unlimited generations", "Unlimited projects and history", "Priority support"],
    recommended: true,
  },
  {
    name: "Team",
    price: "Contact us",
    period: "",
    description: "For teams sharing schemas across projects.",
    features: ["Everything in Pro", "Shared team projects", "Single sign-on"],
    recommended: false,
  },
] as const

export function Pricing({ isAuthenticated }: { isAuthenticated: boolean }) {
  const primaryHref = getPrimaryCtaHref(isAuthenticated)

  return (
    <section className="border-t border-border-subtle py-20">
      <FadeInSection className="mx-auto w-full max-w-6xl px-4 md:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-h2 font-semibold text-text-primary">Pricing</h2>
          <p className="mt-2 text-body text-text-secondary">
            Start free. Upgrade when you outgrow the sandbox.
          </p>
        </div>
        <div className="mt-10 grid gap-6 sm:grid-cols-3">
          {PLACEHOLDER_PRICING_TIERS.map((tier) => (
            <div
              key={tier.name}
              className={
                tier.recommended
                  ? "flex flex-col gap-4 rounded-lg border-2 border-accent-violet bg-surface-2 p-6 shadow-sm"
                  : "flex flex-col gap-4 rounded-lg border border-border-subtle bg-surface-2 p-6 shadow-sm"
              }
            >
              {tier.recommended ? (
                <Badge variant="outline" className="w-fit border-accent-violet text-accent-violet">
                  Recommended
                </Badge>
              ) : null}
              <div>
                <h3 className="text-h3 font-semibold text-text-primary">{tier.name}</h3>
                <p className="mt-1 text-body-sm text-text-secondary">{tier.description}</p>
              </div>
              <p className="text-h2 font-semibold text-text-primary">
                {tier.price}
                <span className="text-body-sm font-normal text-text-muted">{tier.period}</span>
              </p>
              <ul className="flex flex-col gap-2">
                {tier.features.map((feature) => (
                  <li key={feature} className="flex items-center gap-2 text-body-sm text-text-secondary">
                    <CheckIcon aria-hidden="true" className="size-4 shrink-0 text-text-secondary" />
                    {feature}
                  </li>
                ))}
              </ul>
              <Button
                variant={tier.recommended ? "default" : "outline"}
                nativeButton={false}
                render={<Link href={primaryHref} />}
                className="mt-auto"
              >
                {isAuthenticated ? "Go to Dashboard" : "Get started"}
              </Button>
            </div>
          ))}
        </div>
      </FadeInSection>
    </section>
  )
}
