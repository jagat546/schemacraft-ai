// Placeholder content -- a product/copy decision this task does not make
// (Sprint-04-Implementation-Roadmap.md §S4-011 Definition of Done), same as
// S4-007's Pricing/FAQ copy. Confirm final copy before production release.
// Data only, no logic -- consumed by prompt-suggestions.tsx.
export const PROMPT_SUGGESTIONS = [
  {
    label: "E-commerce store",
    prompt:
      "An e-commerce store with users, products organized into categories, orders with line items, and customer reviews.",
  },
  {
    label: "Blog with comments",
    prompt:
      "A blog with authors, posts, tags, and threaded comments on each post.",
  },
  {
    label: "SaaS billing system",
    prompt:
      "A multi-tenant SaaS billing system with organizations, members, subscription plans, and invoices.",
  },
  {
    label: "Task tracker",
    prompt:
      "A task tracker with projects, tasks assigned to users, statuses, and due dates.",
  },
] as const
