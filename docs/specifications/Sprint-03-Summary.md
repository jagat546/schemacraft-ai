# Sprint 3 Summary — Product Experience Specification

**Status:** closes Sprint 3. Specification only — nothing in this sprint touched code.

**Sprint goal, restated:** answer "if we rebuilt SchemaCraft AI tomorrow, exactly how should every screen behave and what should the user experience?" with zero remaining design ambiguity before implementation begins.

**Naming note:** `docs/planning/v0.7.1-roadmap.md` uses "Sprint 3," "Sprint 4," and "Sprint 5" to label historical v0.7.0 development milestones (Authentication foundation, Project/generation persistence, Canonical AST & compiler pipeline — all shipped before Sprint 0 of the current documentation-sprint sequence). That numbering is unrelated to "Sprint 3" as used throughout this document and its companion specifications, which refers to this documentation sprint (Product Experience Specification), following Sprint 0 (Project Recovery), Sprint 1 (UX Audit), and Sprint 2 (Design System 2.0). Anyone cross-referencing the roadmap should read "Sprint 3" there as the older, unrelated milestone.

---

## What Was Produced

| Document | Covers |
|---|---|
| `Landing-Experience-Specification.md` | Hero, primary/secondary CTA, live playground, feature highlights, interactive demo, visual pipeline, social proof, testimonials, pricing, FAQ, footer, responsive/scroll/animation behavior. |
| `Dashboard-Experience-Specification.md` | Nav hierarchy, sidebar, top nav, quick actions, recent projects, search, filters, metrics, empty states, onboarding, responsive layout — **plus Settings** (project-scoped and account-level). |
| `Generator-Experience-Specification.md` | The full generation experience end to end: prompt editor, suggestions, templates, streaming, progress, split view, all five artifact previews, history, copy/export/download, failure recovery, success states, onboarding, undo/retry, loading, animation sequence. |
| `Workbench-Experience-Specification.md` | IDE-grade review surface: layout, panels, Monaco integration, fullscreen, command palette, search/replace, minimap, keyboard shortcuts, theme, diagram rendering, navigation, state persistence, performance. |
| `Navigation-Experience-Specification.md` | Global nav, sidebar, breadcrumbs, quick actions, back navigation, keyboard/search/mobile navigation — **plus Authentication** (sign in/up, password reset, session expiration, protected routes). |
| `User-Journey-Maps.md` | Seven end-to-end journeys (first-time visitor, first generation, returning user, power user, failed generation, export workflow, project management), each with goals, pain points, emotional state, system response, expected outcome. |
| `Micro-Interactions.md` | Every interaction state (hover/focus/active/success/error/loading/disabled), transitions, skeletons, notifications, confetti policy, progress indicators — **plus Accessibility Experience** (keyboard, screen readers, focus management, reduced motion, contrast, touch targets, ARIA, WCAG AA). |
| `Empty-States.md` | Eight empty-state patterns (no projects, no history, no search results, offline, no generations, permission denied, rate limit exceeded, server unavailable), each designed to educate. |
| `Error-Experience.md` | Validation errors, API failures, timeouts, authentication failures, unexpected errors, network failures, a shared recovery-action vocabulary, messaging structure, and escalation. |

Nine specification documents plus this summary — ten files, matching the Required Output Structure in the sprint brief.

---

## Why Three Deliverables Don't Have Their Own File

The sprint brief's Primary Deliverables list (§5, §6, §12) names **Settings**, **Authentication Experience**, and **Accessibility Experience** as things to define, but the Required Output Structure lists only ten filenames and none of them is `Settings-*`, `Authentication-*`, or `Accessibility-*`. Rather than silently drop the content or invent an eleventh file the brief didn't ask for, each was folded into the existing document it's most structurally native to, with an explicit scope note at the top of that document recording the decision:

- **Settings** → `Dashboard-Experience-Specification.md` §Settings. Reasoning: Settings is dashboard-shell content — reached from the same shell, sharing the same layout system, and already existing today in project-scoped form reached from a `ProjectCard` on the Dashboard.
- **Authentication Experience** → `Navigation-Experience-Specification.md` §Authentication Experience. Reasoning: sign-in, sign-up, session expiration, and protected routes are fundamentally about where a user is and isn't allowed to go, and where they're redirected — a navigation/routing concern by nature.
- **Accessibility Experience** → `Micro-Interactions.md` §Accessibility Experience. Reasoning: accessibility is inseparable from interaction state design — a hover state with no focus equivalent is the same bug described two ways. Consolidating them in one place also prevents the alternative failure mode of restating slightly different accessibility rules in nine separate documents and having them drift apart.

Every one of these three topics is fully specified — nothing was cut for scope, only relocated for cohesion.

---

## What's New vs. What's Ratified

This sprint is a forward specification for a rebuild, not an audit of the current build (that was Sprint 1's job). Every spec is grounded in the actual current implementation — routes, components, and behaviors documented in `docs/specifications/UX-2.0-Engineering-Specification.md` and `TECH_DEBT.md` — but several sections specify capability beyond what exists today. Flagging these explicitly, so an implementation engineer never mistakes "specified" for "already built":

- **New screens/flows:** Password reset (none exists today), Account/global Settings (only project-scoped settings exists today), Pricing, FAQ, Social Proof, Testimonials on the landing page, Dashboard Search/Filters/Metrics/Quick Actions.
- **New product capability:** Streaming (per-artifact) generation, replacing today's single request/response; Monaco-based read-only code review in the Workbench, replacing today's Prism-based `CodeViewer`; bundled "Export all" download; Prompt Suggestions and Templates on the Generator.
- **Ratified as-is (no change needed):** the existing sidebar/top-bar shell, `ProjectCard` interactivity, the `OutputTabs`/`OutputActions`/`OutputViewerFrame` pattern, the Mermaid pan/zoom ERD viewer, the sign-up email-confirmation success-message fix (TD-019), the "coming soon, genuinely disabled" pattern for backend-gated controls, and the `KeyboardShortcutProvider` registry.
- **Known gaps this sprint's specs require closing on implementation** (already flagged in Sprint 1/2, now load-bearing requirements in these specs): sidebar items must render distinct icons per destination (`Navigation-Experience-Specification.md`), and `emerald`/`amber` accent tokens must be wired to Success/Warning states wherever this sprint specifies a success or warning surface (nearly every document here).

---

## Traceability

The sprint's final-deliverable condition is: *if any design or interaction decision cannot be justified by either `Design-System-2.0.md` or one of the Sprint 3 specifications, the specification is incomplete.* Checking that condition:

- **Visual decisions** (color, type, spacing, elevation, radius, motion, iconography) — every one made across all nine documents cites a named token from `Design-System-2.0.md`. No document in this sprint introduced a new color, font size, spacing value, radius step, or duration. The only net-new visual element across the whole sprint is the reuse of already-approved tokens in new contexts (e.g., `--accent-amber` on a rate-limit warning) — not new tokens.
- **Component decisions** — every component referenced (buttons, cards, dialogs, toasts, tabs, tables, badges, skeletons, etc.) traces to its Design System 2.0 §10 standard; where a document specifies a new *use* of a component (e.g., Monaco's find widget), it explicitly derives its visual treatment from the existing standard (Workbench §Theme Behavior re-themes Monaco from Design System 2.0 tokens rather than inventing an editor-specific palette).
- **Interaction/motion decisions** — every hover, focus, transition, and animation across all documents resolves to `Micro-Interactions.md`'s single state table and `Design-System-2.0.md` §8's duration/easing tokens; no document defined a bespoke animation outside that vocabulary.
- **Copy/messaging decisions** — `Error-Experience.md` and `Empty-States.md` establish the shared vocabulary (three-part error structure, recovery-action list, "educate, don't just state absence") that every other document's error/empty states defer to rather than inventing their own tone or structure.
- **Cross-document consistency** — where two documents cover overlapping ground (e.g., Generator's Failure Recovery and Error Experience's API Failures; Dashboard's Empty States and the full Empty State Library), the more general document is the source of truth and the more specific document explicitly says so, rather than both independently defining the same behavior and risking drift.

On this basis, the sprint's zero-ambiguity condition is met for everything specified. The one honest caveat: three topics (Settings, Authentication, Accessibility) live inside other files rather than their own, per the relocation decision above — an implementation engineer looking for a file literally named `Settings-Experience-Specification.md` won't find one, and should be pointed to this summary first if that happens.
