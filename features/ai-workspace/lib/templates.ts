// Placeholder content -- a product/copy decision this task does not make,
// same as suggestions.ts. Templates are more structurally complete starting
// points than suggestions (Generator-Experience-Specification.md
// §Templates) -- longer prompts implying patterns (tenant isolation, role
// membership) that are hard to phrase from scratch.
export const PROMPT_TEMPLATES = [
  {
    name: "Multi-tenant SaaS",
    description: "Organizations, membership roles, and per-tenant data isolation.",
    prompt:
      "A multi-tenant SaaS application. Organizations have many members, each with a role (owner, admin, or member). Every other table (projects, documents, etc.) belongs to exactly one organization, so data never crosses tenant boundaries. Include an invitations table for pending member invites.",
  },
  {
    name: "Marketplace",
    description: "Buyers, sellers, listings, and orders between them.",
    prompt:
      "A two-sided marketplace. Users can be buyers or sellers (or both). Sellers create listings with a price and inventory count. Buyers place orders against listings, and each order has a status (pending, paid, shipped, completed). Include a reviews table for buyers reviewing completed orders.",
  },
  {
    name: "Content management system",
    description: "Articles, authors, categories, and revision history.",
    prompt:
      "A content management system. Authors write articles, each in one category and tagged with multiple tags. Every edit to an article creates a new revision so past versions are never lost. Articles have a status (draft, in review, published).",
  },
] as const
