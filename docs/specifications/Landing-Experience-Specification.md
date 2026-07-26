# Landing Experience Specification

**Status:** Sprint 3 deliverable. Specification only — no implementation, no code, no new visual tokens.

**Governing documents:** `Design-System-2.0.md` (color, type, spacing, elevation, radius, motion, component standards). Every visual decision below cites a token or component standard from that document by name. Where this spec describes something beyond what's currently built (pricing, FAQ, social proof, testimonials), it is explicitly marked **(new)** — this is a forward specification for the rebuild, not a description of the current marketing page.

**Current baseline this extends:** `app/page.tsx` today ships a hero with a session-adaptive CTA, an inline unauthenticated sandbox (`HeroSandbox`, rate-limited 5 requests/60 min per IP), a five-artifact `FeatureShowcase` grid, and a session-adaptive nav/footer (`docs/specifications/UX-2.0-Engineering-Specification.md` §3). This spec keeps every one of those and adds what's missing for the product to read as a complete, premium landing page.

---

## Information Hierarchy

The page tells one story, top to bottom, with no detours:

1. **What this is** (hero headline + one-line description)
2. **Prove it** (live playground — let the visitor generate something themselves before asking for anything)
3. **What it produces** (visual pipeline + feature highlights — the five artifact types)
4. **See it in more depth** (interactive demo, if distinct from the playground — see below)
5. **Who else trusts it (new)**
6. **What it costs (new)**
7. **Answer remaining doubt (new — FAQ)**
8. **Go** (final CTA + footer)

Rule: a first-time visitor must be able to state what the product does within 5 seconds of the hero rendering, per the UX Review Checklist. If a section doesn't serve one of the eight steps above, it doesn't belong on the page.

---

## Hero Section

- **Purpose:** state the product's value proposition in one sentence and let the visitor act on it immediately — either by trying it or by signing up.
- **User goal:** "Do I understand what this does, in the next five seconds?"
- **Visual emphasis:** headline in `--text-display-lg` (the *only* place on the product this token is used, per Design System 2.0 §3), `--text-primary`; supporting sub-headline in `--text-body`, `--text-secondary`. Generous vertical spacing (`space-16` top, per §4) — whitespace here is doing the work of confidence, not decoration.
- **Expected interaction:** no interaction required to understand the hero; the primary CTA and the live playground (below the fold-line, not literally below the fold on desktop) are the two available next actions.
- **Success criteria:** a visitor who reads only the headline and sub-headline can correctly describe the product to someone else.

## Primary CTA

- **Purpose:** move an already-convinced visitor to the point of value as fast as possible.
- **User goal:** "I want to start" — with the least possible friction.
- **Visual emphasis:** `--accent-violet` filled button (Buttons — primary variant, Design System 2.0 §10), the only primary-weight button visible above the fold.
- **Expected interaction:** session-adaptive, exactly as implemented today — unauthenticated visitors see "Sign up free" (routes to `/signup`); authenticated visitors see "Go to Dashboard" (routes to `/dashboard`). Never both.
- **Success criteria:** the primary CTA is the single most visually dominant interactive element in the hero — nothing competes with it for attention (Design System 2.0 §12: no competing accent colors).

## Secondary CTA

- **Purpose:** offer a lower-commitment path for a visitor not ready to sign up.
- **User goal:** "Let me see it work before I commit to anything."
- **Visual emphasis:** outline/ghost button (Buttons — secondary variant), positioned beside or below the primary CTA, never equal in visual weight.
- **Expected interaction:** for unauthenticated visitors, this scrolls to or focuses the live playground rather than navigating away — the visitor should never leave the page to "see a demo." Label: "Try it now" / "See it in action."
- **Success criteria:** clicking it lands the visitor's attention directly in the playground's prompt field, focused and ready to type, in under `duration-slow` (320ms).

## Live Playground

This is the existing `HeroSandbox` — the single highest-leverage section on the page, since it lets the product prove itself before asking for anything.

- **Purpose:** let an unauthenticated visitor generate a real schema, in the browser, with zero setup.
- **User goal:** "Does this actually work, on my idea, right now?"
- **Visual emphasis:** framed as a distinct, elevated surface (elevation level 2, `--surface-2`) inside the hero region so it reads as "the product itself," not marketing copy about the product.
- **Expected interaction:** a prompt textarea (character counter, existing 500-char sandbox cap, `--text-caption` per Design System 2.0), a Generate button, and — on success — the same `OutputTabs` result view used in the authenticated app (SQL/Drizzle/JSON/Docs/ERD), so the demo *is* the product, not a mockup of it. On rate-limit (5/60min) or error, the existing pattern holds: a clear message plus a "Sign up for full access" link — this is the moment the funnel converts, so the message must feel like an invitation, not a rejection.
- **Success criteria:** a visitor can go from landing on the page to seeing a real generated SQL schema without navigating away, creating an account, or reading documentation.

## Feature Highlights

- **Purpose:** enumerate the five artifact types the product produces, so a visitor scanning quickly understands full scope (not just "SQL").
- **User goal:** "What exactly do I get?"
- **Visual emphasis:** a five-card grid (existing `FeatureShowcase` pattern), each card: icon (20px, Lucide, per §9) + `--text-h3` label + one-line `--text-body-sm` description. Equal visual weight across all five — no card implies one artifact matters more than another.
- **Expected interaction:** cards are non-interactive display elements (static, per Design System 2.0 §10 Cards) — this section is for scanning, not clicking; the playground above is where action happens.
- **Success criteria:** a visitor can list the five output types after a single scroll past this section.

## Interactive Demo

Distinct from the Live Playground: where the playground lets a visitor *generate*, the interactive demo lets a visitor *explore a finished result* without waiting on generation — useful for a visitor who wants to see the depth of a complex, multi-table example before typing their own prompt.

- **Purpose:** show what a non-trivial, realistic output looks like (a schema with 8–12 tables, relationships, an ERD), since a visitor's own first prompt in the playground is likely to be simple.
- **User goal:** "Can this handle something as complex as my real project?"
- **Visual emphasis:** the same `OutputTabs` component as every other output surface in the product — reused, not reinvented, per Design System 2.0 §13.3. Framed at elevation level 2, `content-lg` width.
- **Expected interaction:** tab-switchable between SQL/Drizzle/JSON/Docs/ERD, exactly like the authenticated Workbench; the ERD tab is pre-selected by default since it's the most immediately legible artifact to a first-time viewer. No generation happens here — this is a static, curated example.
- **Success criteria:** a visitor scanning only this section (skipping the playground) still understands the product handles real, non-trivial complexity.

## Visual Pipeline

- **Purpose:** communicate the core mechanic — one prompt in, five structured artifacts out — as a single glanceable diagram, for visitors who won't read prose.
- **User goal:** "What's the shape of this product?"
- **Visual emphasis:** a horizontal (desktop) / vertical (mobile) flow: a prompt/text icon → an arrow → a branching set of five icons (matching the Feature Highlights icons exactly, for consistency of meaning per §9). No gradients, no decorative motion — the diagram itself is the content, not a backdrop for effects (Design System 2.0 §12).
- **Expected interaction:** static; each of the five endpoint icons may link (anchor scroll) to its corresponding card in Feature Highlights, but this is optional polish, not required interaction.
- **Success criteria:** the diagram alone, without reading any surrounding text, communicates "one input, five outputs."

## Social Proof **(new)**

- **Purpose:** reduce a skeptical visitor's risk perception — "other engineers use and trust this."
- **User goal:** "Is this a toy project or a real tool people rely on?"
- **Visual emphasis:** a quiet, low-contrast row (`--text-muted` labels, `--surface-1` background) — logos, a usage stat, or a GitHub star count, whichever is truthfully available at launch. Never fabricated numbers or logos without permission; an honestly small proof section (e.g., "Built in the open" + a link to the repo) is preferable to an inflated one.
- **Expected interaction:** static, or a single link out (e.g., to a public GitHub repo) if applicable.
- **Success criteria:** the section reads as credible, not defensive — if there isn't yet real social proof, this section is omitted entirely rather than filled with placeholder trust signals, per the "AI should never surprise users negatively" principle extended to marketing honesty.

## Testimonials (placeholder) **(new)**

- **Purpose:** reserve the layout position for future real testimonials without fabricating quotes.
- **User goal:** N/A until populated — this section exists for structural completeness.
- **Visual emphasis:** if included pre-launch, rendered as a clearly-labeled "What early users are saying" section with a fixed 2–3 card grid layout (elevation level 2 cards, `--text-body` quote + `--text-caption` attribution). Until real testimonials exist, **this section is omitted from the live page** — a placeholder with lorem-ipsum-style fake quotes is explicitly disallowed; it is a bigger trust cost than an absent section.
- **Expected interaction:** static.
- **Success criteria:** the section either contains real, attributed quotes or does not render at all — no intermediate state.

## Pricing **(new)**

- **Purpose:** answer "what does this cost me" before the visitor has to ask, and set expectations for the free/paid boundary already implied by the rate-limited sandbox vs. full authenticated access.
- **User goal:** "Can I use this for free, and what do I get if I pay?"
- **Visual emphasis:** a simple tiered card layout (2–3 tiers max), each an elevation-2 card of equal size except the recommended tier, which gets a `--accent-violet` border/badge to indicate recommendation — the *only* sanctioned deviation in emphasis, since highlighting one tier is a standard, well-understood pattern, not decoration.
- **Expected interaction:** each tier's CTA button follows the same session-adaptive logic as the hero primary CTA; tier feature lists use a simple check-icon + `--text-body-sm` list, no comparison-matrix complexity for v1.
- **Success criteria:** a visitor can determine, without leaving the page, whether the free tier meets their need or they need to sign up for more.

## FAQ **(new)**

- **Purpose:** resolve the specific objections that stop a convinced-but-hesitant visitor from converting (data privacy, accuracy of AI-generated schemas, supported dialects, pricing edge cases).
- **User goal:** "I have one specific doubt — answer it without making me email support."
- **Visual emphasis:** an accordion list (collapsed by default, `--text-h3` question + `--text-body` answer on expand), single column, `content-sm` width for readability.
- **Expected interaction:** click/Enter to expand a question; only one open at a time is a reasonable default but not required; expand/collapse transitions at `duration-fast` per §8.
- **Success criteria:** the FAQ list is written from real objections observed in user feedback or support contact, not generic invented questions — content curation is a product responsibility, not this spec's, but the *pattern* (collapsed accordion, real questions only) is fixed here.

## Footer

- **Purpose:** provide the standard wayfinding a visitor expects at the bottom of any credible product page — links, legal, contact.
- **User goal:** "Where do I go if I want something not on this page?"
- **Visual emphasis:** `--surface-1` background (distinguishing it from the page body), `--text-secondary`/`--text-muted` link text, `content-lg` width, `space-8` vertical padding.
- **Expected interaction:** session-adaptive (existing pattern) — links to product sections, legal (terms/privacy, even if placeholder pages initially), and a repeat of the primary CTA at reduced visual weight.
- **Success criteria:** every link a visitor might reasonably look for (privacy policy, contact, sign in) is present and functional, not a dead `#` anchor.

---

## Responsive Behavior

- Single-column stacking below `md` for every section (Feature Highlights grid, Pricing tiers, Visual Pipeline) per Design System 2.0 §5.
- The Live Playground's output view (`OutputTabs`) behaves identically to its authenticated counterpart: split-pane on desktop, stacked on mobile.
- Hero headline uses `--text-display-lg` down to `md`; below `md` it steps down to `--text-h1` to avoid wrapping awkwardly on narrow viewports — this is the one place font-size responsively changes tokens rather than just reflowing, and it's justified because `display-lg` was sized for wide layouts specifically.

## Scroll Behavior

- No scroll-jacking, no forced scroll snapping — the page scrolls exactly as a native document scrolls. Per Core Experience Principle #2 ("speed feels better than animation"), nothing about scrolling itself is ever slowed down or intercepted for effect.
- The "Try it now" secondary CTA performs a single smooth scroll (native `scroll-behavior: smooth` is acceptable; this is a browser default, not a custom animation) to the playground, respecting `prefers-reduced-motion` (jumps instantly if set).
- No sticky/parallax hero — the nav bar may remain sticky (already implemented, blurred backdrop) since that's a navigation aid, not decoration; nothing else pins to the viewport during scroll.

## Animation Behavior

Governed entirely by Design System 2.0 §8 — nothing here introduces a new motion token.

- Section content may fade/slide in on first viewport entry, using `duration-base` and `ease-standard`, **once per element, never re-triggering on scroll-back** — a page that re-animates every time you scroll past a section reads as gimmicky, not premium.
- The Visual Pipeline's arrow/flow may animate its connecting line once on entry to reinforce the "in → out" direction, but the five endpoint icons themselves do not bounce, pulse, or loop — static after the one-time entrance.
- No auto-playing carousels, no looping background animation, anywhere on the page.
- `prefers-reduced-motion` disables all entrance animations; content renders in its final state immediately.
