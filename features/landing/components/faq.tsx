import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { FadeInSection } from "@/features/landing/components/fade-in-section"

// Placeholder questions -- a product/copy decision this task does not make
// (Sprint-04-Implementation-Roadmap.md §S4-007 Risks). The spec's own
// requirement is that these come from real user feedback or support
// contact, not generic invented questions; these are realistic
// stand-ins for the objection categories the spec names (data privacy,
// AI-generated-schema accuracy, supported dialects, pricing) and require
// replacement with real, sourced questions before this ships to production.
const PLACEHOLDER_FAQ_ITEMS = [
  {
    question: "What happens to the data in my prompts?",
    answer:
      "Your prompt is sent to our AI provider to generate a schema and isn't used to train any model. Generated schemas are stored under your account only.",
  },
  {
    question: "How accurate is the generated schema?",
    answer:
      "Every generation is validated for structural and semantic correctness before you see it — duplicate names, dangling foreign keys, and missing primary keys are caught automatically. You should still review the result before running it against a real database.",
  },
  {
    question: "Which SQL dialects are supported?",
    answer:
      "PostgreSQL today. MySQL and SQLite support is planned — the dialect selector already exists in Project Settings and will activate as each dialect ships.",
  },
  {
    question: "What happens if I go over the free tier's limits?",
    answer:
      "You'll see a clear message when you hit a limit, with a direct link to upgrade — you'll never be silently blocked or lose a generation you've already started.",
  },
] as const

export function Faq() {
  return (
    <section className="border-t border-border-subtle py-20">
      <FadeInSection className="mx-auto w-full max-w-3xl px-4 md:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-h2 font-semibold text-text-primary">Frequently asked questions</h2>
        </div>
        <Accordion className="mt-8">
          {PLACEHOLDER_FAQ_ITEMS.map((item) => (
            <AccordionItem key={item.question} value={item.question}>
              <AccordionTrigger className="text-h3 text-text-primary hover:no-underline">
                {item.question}
              </AccordionTrigger>
              <AccordionContent className="text-body text-text-secondary">
                {item.answer}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </FadeInSection>
    </section>
  )
}
