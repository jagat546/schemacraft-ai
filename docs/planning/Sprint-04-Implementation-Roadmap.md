# Sprint 4 — Product Experience Implementation Roadmap

**Task ID:** S4-000
**Status:** Planning deliverable. No application code, no refactoring, no specification rewrites in this document beyond one flagged, resolved ambiguity (see §1, Streaming Generation).
**Author role:** Senior Staff Engineer / Tech Lead, implementation planning.
**Source of truth:** `Design-System-2.0.md` + the 10 Sprint 3 specifications (Sprint 3A-validated, see `Sprint-03-Summary.md`). Cross-referenced against `UX-2.0-Engineering-Specification.md`, `TECH_DEBT.md`, `SCHEMACRAFT_AI_MASTER_CONTEXT.md`, and `docs/planning/v0.7.1-roadmap.md`. Every task below was checked against the live repository (routes, components, stores, repositories, Server Actions, `package.json`) before being sized — not derived from the specs alone.

---

## 1. Executive Summary

Sprint 4 turns 11 specification documents into 17 implementation-sized tasks across 8 milestones, ordered so that foundational work (design tokens, shared Empty/Error components) lands before any screen consumes it, and so that the two genuinely high-risk items (Workbench Monaco integration, Generator streaming) are isolated into their own tasks rather than bundled into larger ones.

**One architectural ambiguity was found and resolved during this planning pass, per the "resolve, don't halt on discretionary judgment calls" instruction:**

`Generator-Experience-Specification.md` §Streaming Generation describes artifacts appearing one at a time as the backend produces them (SQL, then Drizzle, then JSON, ...). Reading `lib/services/generation.service.ts` directly: the pipeline makes exactly **one** Gemini call (`geminiProvider.generateAST`), then runs `registry.compileAll()` — all five compilers, synchronously, in-process, against the same already-complete AST, with no network calls and no meaningful per-artifact latency. **There is no natural point in the current architecture where "SQL is ready but Drizzle isn't."** All five artifacts become available at the same instant, right after the single AI call resolves.

Implementing the spec's literal per-artifact streaming would require either (a) fabricating artificial delays between reveals — which Design System 2.0's "AI should never surprise users negatively" / "never a fake progress indicator" principle rules out, since it would misrepresent system state — or (b) re-architecting the AI call itself to stream AST tokens and incrementally validate/compile partial JSON, which is a substantial, independently-risky change to `lib/ai/providers/gemini.ts` and `lib/ast/validator.ts` that doesn't belong in a UX-implementation sprint.

**Resolution, scoped into S4-012 below:** Sprint 4 ships a **staged reveal** of the already-complete result — the five tabs populate in a fixed, brief sequence (SQL → Drizzle → JSON → Docs → ERD) once the single Server Action resolves, each reveal genuinely representing already-computed data, not a claim about work still in progress. This satisfies the spec's user-facing intent (progressive, reassuring feedback instead of one flat wait) honestly. True AI-token-level streaming is explicitly out of scope for Sprint 4 and flagged in §6 as a future item requiring its own Phase A architecture review. **`Generator-Experience-Specification.md` §Streaming Generation should be updated to describe this shipped behavior once S4-012 lands** — tracked as that task's own Definition of Done, not done here (this document does not rewrite specs).

No other blocking contradictions were found. Sprint 4 is executable one task at a time as planned below.

---

## 2. Sprint 4 Roadmap

| Milestone | Tasks | Theme |
|---|---|---|
| **M1 — Foundation** | S4-001, S4-002, S4-003, S4-004 | Design tokens, semantic color wiring, shared Empty/Error components. Nothing downstream should start before this lands. |
| **M2 — Navigation & Auth** | S4-005, S4-006 | Sidebar/breadcrumbs/mobile nav, password reset, session expiration. |
| **M3 — Landing** | S4-007 | New marketing sections (Visual Pipeline, Interactive Demo, Social Proof, Pricing, FAQ). |
| **M4 — Dashboard & Settings** | S4-008, S4-009, S4-010 | Quick Actions/Search/Filters/Metrics, recency ordering, new Account Settings screen. |
| **M5 — Generator** | S4-011, S4-012, S4-013 | Prompt Suggestions/Templates, staged-reveal generation, Export/Undo polish. |
| **M6 — Workbench** | S4-014, S4-015 | Monaco integration, fullscreen/command-palette/prev-next-nav/state persistence. |
| **M7 — Cross-Cutting Polish** | S4-016, S4-017 | Micro-interaction/accessibility audit, final regression + doc sync + Sprint 4 closure. |

---

## 3. Task Breakdown

### S4-001 — Design Token Implementation

- **Purpose:** Implement the token gaps `Design-System-2.0.md` defines but the repository doesn't yet have: the `space-*` scale, elevation/shadow tokens, `--text-h3`/`--text-caption`, extended motion tokens (`duration-instant`, `duration-slow`, `ease-exit`), and `--accent-sky`. Every subsequent UI task depends on these existing.
- **Repository areas affected:** `app/globals.css` (`@theme inline` block, `:root`/`.dark`).
- **Dependencies:** None — first task in the sprint.
- **Estimated complexity:** L (touches the single most shared file in the codebase; low logic risk, high blast-radius-if-wrong).
- **Acceptance criteria:** All new CSS custom properties exist in both light and dark blocks; `--accent-sky` passes WCAG AA contrast against `--surface-0`/`--surface-2` in both themes; no existing token renamed or removed (additive only); `npm run build` and `npm run lint` pass with zero changes to any component file.
- **Definition of Done:** Tokens present, documented inline with a comment linking to `Design-System-2.0.md` §2–§8 (matching the existing `/* Design tokens — SchemaCraft AI UX 2.0 */` comment convention already in the file); visually verified in a throwaway test page or Storybook-less manual check (light + dark) before merge.
- **Risks:** Low technical risk; the main risk is scope creep (resist the temptation to also start consuming the tokens in this task — that's every task after it).
- **Suggested commit message:** `feat(design-system): add spacing, elevation, and extended typography/motion tokens`
- **Suggested branch strategy:** `feature/s4-001-design-tokens`, cut from `refactor/frontend-modularization-review`, single small PR.
- **Expected files:** `app/globals.css` only.
- **Testing strategy:** No unit tests apply (pure CSS). Manual visual check in both themes; a follow-on task (S4-016) audits actual token *consumption*, not this task.

---

### S4-002 — Semantic Color Wiring & Sidebar Icon Fix

- **Purpose:** Close two known, previously-disclosed gaps: `--accent-emerald`/`--accent-amber` exist in `globals.css` today but map to nothing (`UX-2.0-Engineering-Specification.md` §8), and `AppSidebar` renders the same `Sparkles` icon for every nav item regardless of destination.
- **Repository areas affected:** `app/globals.css` (add `--color-success`/`--color-warning` semantic vars mirroring the existing `--destructive: var(--accent-rose)` pattern), `features/shell/components/app-sidebar.tsx`, `features/shell/lib/nav-items.ts`.
- **Dependencies:** None (existing color tokens already present; doesn't need S4-001's new tokens). Can run in parallel with S4-001.
- **Estimated complexity:** S.
- **Acceptance criteria:** A new `--color-success`/`--color-warning` semantic mapping exists and is documented as the canonical way any future component signals success/warning (per Design System 2.0 §2); `nav-items.ts` gains a per-item icon field; `AppSidebar` renders it instead of a hardcoded icon; Dashboard and Generator are visually distinguishable in the sidebar in both expanded and collapsed states.
- **Definition of Done:** No component yet *consumes* `--color-success`/`--color-warning` (that's S4-003/S4-013's job) — this task only makes the tokens available and fixes the icon bug, which is independently shippable and independently valuable.
- **Risks:** Icon choice is a minor, low-stakes design decision within already-approved Design System 2.0 §9 rules (Lucide, 20px, 2px stroke) — no new judgment call needed beyond picking which existing Lucide icon reads as "Dashboard" vs. "Generator."
- **Suggested commit message:** `fix(shell): give sidebar nav items distinct icons; wire success/warning color tokens`
- **Suggested branch strategy:** `feature/s4-002-semantic-colors-sidebar-icons`, parallel to S4-001.
- **Expected files:** `app/globals.css`, `features/shell/components/app-sidebar.tsx`, `features/shell/lib/nav-items.ts`.
- **Testing strategy:** Existing `AppSidebar`-adjacent tests (if any) updated for the new icon field; manual check that collapsed/expanded states both render correctly; no new test infra needed.

---

### S4-003 — Shared Empty State Component

- **Purpose:** Build one reusable `EmptyState` component implementing `Empty-States.md`'s shared layout pattern (icon/glyph, one-sentence explanation, at most one primary action) so all 8 empty-state instances (No Projects, No History, No Search Results, Offline, No Generations, Permission Denied, Rate Limit Exceeded, Server Unavailable) are configurations of one component, not 8 hand-rolled ones.
- **Repository areas affected:** New shared component — given it's generic and reused across `features/projects`, `features/history`, `features/ai-workspace`, `features/landing`, it belongs outside the feature-module system per this repo's own convention (`components/ui/*` / a new `components/patterns/empty-state.tsx`, consistent with how `components/ui` and `components/providers` are already kept feature-agnostic).
- **Dependencies:** S4-001 (tokens: spacing, `--text-secondary`, icon sizing).
- **Estimated complexity:** M.
- **Acceptance criteria:** Component accepts icon, message, and an optional primary action (label + handler); renders identically across all 8 documented use cases when configured per `Empty-States.md`; centered layout, `--text-secondary` body copy, at most one button — enforced by the component's own prop shape (no way to pass two primary actions).
- **Definition of Done:** Component built and unit-tested in isolation; **not yet wired into any real screen** (that happens as each consuming task — Dashboard, History, Generator, Landing — lands and swaps its existing ad hoc empty-state markup for this component).
- **Risks:** Low. The risk is under-scoping the prop API and having to widen it later — mitigated by designing against all 8 documented cases up front, not just the first one needed.
- **Suggested commit message:** `feat(ui): add shared EmptyState component`
- **Suggested branch strategy:** `feature/s4-003-empty-state-component`, parallel to S4-002.
- **Expected files:** `components/patterns/empty-state.tsx` (new), `components/patterns/empty-state.test.tsx` (new).
- **Testing strategy:** Component-level tests (Vitest + Testing Library, if not already configured — check before assuming; `MASTER_CONTEXT` confirms Vitest exists but doesn't confirm a DOM-testing setup, so this task may need to add `@testing-library/react` and `jsdom`/`happy-dom` as a first-time addition, flagged for review) covering: renders with/without a primary action, respects the "at most one action" constraint at the type level.

---

### S4-004 — Shared Error Experience Components

- **Purpose:** Build the shared primitives `Error-Experience.md` implies but doesn't yet have code for: an inline field-level validation error, a contextual (non-toast) error block for API/timeout/unexpected failures with the three-part message structure (what/whose-fault/next-step) and the standard Recovery Action vocabulary (Retry, Edit and resubmit, Undo, Back to Dashboard, Sign in again, Report issue), plus an offline-detection banner (`Empty-States.md` §Offline).
- **Repository areas affected:** New shared components (same placement rationale as S4-003 — generic, cross-feature). Likely `components/patterns/inline-error.tsx`, `components/patterns/error-state.tsx`, `components/patterns/offline-banner.tsx`; a small `useOnlineStatus` hook alongside the existing `hooks/use-mobile.ts`, `hooks/use-copy-to-clipboard.ts`.
- **Dependencies:** S4-001, S4-002 (needs `--accent-rose`/`--accent-amber` semantic wiring from S4-002).
- **Estimated complexity:** M.
- **Acceptance criteria:** `ErrorState` accepts a message and a typed `recoveryAction` (from the fixed vocabulary, not free-form) so every consumer is structurally forced into the standard pattern; `useOnlineStatus` correctly reflects `navigator.onLine` plus `online`/`offline` events; `OfflineBanner` is a `--surface-1`/`--accent-amber` persistent banner per spec, auto-hides on reconnect.
- **Definition of Done:** Built and tested in isolation, not yet wired into `GenerationStatus`, sign-in/sign-up forms, or any other real error surface — those are updated by their respective owning tasks (S4-006, S4-012).
- **Risks:** Deciding the exact `recoveryAction` union type is a real design-adjacent decision (not covered token-by-token in the spec) — mitigate by deriving it directly from `Error-Experience.md`'s own "Recovery Actions" table (Retry / Edit and resubmit / Undo / Back to Dashboard / Sign in again / Report issue), not inventing new ones.
- **Suggested commit message:** `feat(ui): add shared ErrorState, InlineError, and OfflineBanner components`
- **Suggested branch strategy:** `feature/s4-004-error-components`, can run parallel to S4-003 (touches different files).
- **Expected files:** `components/patterns/error-state.tsx`, `components/patterns/inline-error.tsx`, `components/patterns/offline-banner.tsx`, `hooks/use-online-status.ts`, associated `*.test.ts(x)`.
- **Testing strategy:** Unit tests per component; a dedicated test asserting the recovery-action vocabulary is a closed type (compile-time, via a `tsc --noEmit` check in CI rather than a runtime test).

---

### S4-005 — Sidebar Third Item, Breadcrumbs & Mobile Nav Drawer

- **Purpose:** Implement `Navigation-Experience-Specification.md`'s non-auth portion: add the "Account Settings" sidebar entry (stub route target, since S4-010 builds the actual screen), build the `Breadcrumbs` component for project-scoped routes, and add the collapsed-below-`md` mobile drawer.
- **Repository areas affected:** `features/shell/lib/nav-items.ts`, `features/shell/components/app-sidebar.tsx`, new `features/shell/components/breadcrumbs.tsx`, `features/shell/components/page-title.tsx` (extended, not replaced, to render breadcrumbs on project-scoped routes per its existing suffix-matching pattern from TD-018's fix), `features/shell/components/top-nav.tsx` (mobile drawer toggle).
- **Dependencies:** S4-001, S4-002.
- **Estimated complexity:** M.
- **Acceptance criteria:** Sidebar shows 3 items with distinct icons (builds on S4-002); Workbench/History/Project-Settings routes show `Dashboard / [Project Name] / [Screen]` breadcrumbs instead of a flat title, each non-final segment a real link; sidebar becomes a toggle-revealed drawer below `md` per spec.
- **Definition of Done:** Breadcrumbs correctly resolve project title via existing `project-store`/`getProjectById` pattern (no new data-fetching abstraction); mobile drawer keyboard-accessible (focus trap while open, per Design System 2.0 §11).
- **Risks:** `PageTitle`'s existing suffix-matching logic (TD-018's fix) needs to be extended, not duplicated — reuse the existing route-resolution helper rather than writing a second one, to avoid the exact "two sources of truth" bug class this repo has already hit once.
- **Suggested commit message:** `feat(shell): add breadcrumbs, mobile nav drawer, and Account Settings nav entry`
- **Suggested branch strategy:** `feature/s4-005-nav-breadcrumbs-mobile`, depends on S4-002 merging first (icon field).
- **Expected files:** `features/shell/components/{app-sidebar,breadcrumbs,page-title,top-nav}.tsx`, `features/shell/lib/nav-items.ts`.
- **Testing strategy:** Unit tests for breadcrumb segment resolution (project route → correct 3-segment trail); manual keyboard-nav verification of the mobile drawer.

---

### S4-006 — Authentication Enhancements

- **Purpose:** Implement `Navigation-Experience-Specification.md` §Authentication Experience's net-new scope: password reset (Step 1 request + Step 2 confirm), session-expiration handling mid-action, and protected-route redirect preservation (`?next=`).
- **Repository areas affected:** `lib/actions/auth.ts` (add `requestPasswordReset`/`confirmPasswordReset`, both thin wrappers over Supabase Auth's native `resetPasswordForEmail`/`updateUser` — no new backend infrastructure needed), new `app/(auth)/reset-password/page.tsx` + `app/(auth)/reset-password/confirm/page.tsx`, `components/auth/` (new `reset-password-form.tsx`, `reset-password-confirm-form.tsx`), `lib/supabase/middleware.ts` (`?next=` capture/redirect), `app/(auth)/login/page.tsx` ("Forgot password?" link).
- **Dependencies:** S4-001, S4-004 (uses `InlineError` for field errors, `ErrorState` for expired-link handling).
- **Estimated complexity:** M — no new infrastructure (Supabase Auth already supports password reset natively), but touches the security-sensitive auth surface, so review bar is higher than the LOC count suggests.
- **Acceptance criteria:** Request-step response message is identical whether or not the email matches an account (per spec, security-deliberate); confirm-step signs the user in and redirects to `/dashboard` with a success toast, not back to `/login`; an unauthenticated request to any `/dashboard/*` route preserves the original destination through login and returns there on success; a session-expiration mid-action shows the specific "Your session has expired" message (via S4-004's `ErrorState`) with preserved in-flight input where applicable (e.g., an unsent prompt).
- **Definition of Done:** Both new routes build and pass typecheck; existing `signUp()`'s already-correct email-confirmation pattern (TD-019) is untouched — this task only adds reset, it doesn't touch sign-up.
- **Risks:** **Security-sensitive surface** — the "identical response regardless of account existence" requirement is easy to accidentally violate (e.g., a try/catch that leaks a different error for "user not found" vs. "email send failed"); flag for extra reviewer attention. `?next=` redirect must be validated as a same-origin relative path only, to avoid an open-redirect vulnerability — this is a new requirement this task introduces and must self-police, since nothing in the spec calls it out explicitly (the spec describes the UX, not the security constraint) — this is exactly the kind of implementation-level security discipline `CLAUDE.md`'s "avoid OWASP top 10" instruction requires even though the spec itself doesn't spell it out.
- **Suggested commit message:** `feat(auth): add password reset flow, session-expiration handling, and post-login redirect preservation`
- **Suggested branch strategy:** `feature/s4-006-auth-enhancements`, parallel to S4-005 (disjoint files).
- **Expected files:** `lib/actions/auth.ts`, `lib/supabase/middleware.ts`, `app/(auth)/reset-password/**`, `components/auth/reset-password*.tsx`.
- **Testing strategy:** Unit tests for the `?next=` open-redirect guard (reject absolute/external URLs) — this is the single highest-value test in this task; manual end-to-end verification of both reset steps against a real Supabase project (this class of flow is hard to meaningfully unit-test past the guard logic).

---

### S4-007 — Landing Page New Sections

- **Purpose:** Implement `Landing-Experience-Specification.md`'s net-new sections: Visual Pipeline, Interactive Demo, Social Proof, Pricing, FAQ. (Hero, Live Playground/`HeroSandbox`, Feature Highlights, Footer are retained as-is per the spec's "current baseline this extends.")
- **Repository areas affected:** `features/landing/components/` (new: `visual-pipeline.tsx`, `interactive-demo.tsx`, `social-proof.tsx`, `pricing.tsx`, `faq.tsx`), `app/page.tsx` (composition only).
- **Dependencies:** S4-001, S4-002.
- **Estimated complexity:** M.
- **Acceptance criteria:** Each new section matches its spec's Purpose/Visual Emphasis/Interaction/Success Criteria; Testimonials is explicitly **not** built this sprint (spec: omit entirely rather than fabricate placeholder quotes — nothing to implement until real testimonials exist, so it's correctly out of scope, not a missed task); Pricing tier CTAs reuse the existing session-adaptive logic already proven in the Hero's primary CTA, not a new implementation of the same decision.
- **Definition of Done:** Section-entrance animations (once-per-element, no re-trigger on scroll-back) implemented per Design System 2.0 §8 tokens only; `prefers-reduced-motion` verified to disable them.
- **Risks:** Pricing content (actual tier names/prices) and FAQ content (actual questions) are **product/copy decisions this task does not make** — implement the pattern with realistic placeholder copy clearly marked for Product sign-off before this ships to production, since shipping fabricated pricing or FAQ content live would be a real product risk, not just a documentation one.
- **Suggested commit message:** `feat(landing): add visual pipeline, interactive demo, social proof, pricing, and FAQ sections`
- **Suggested branch strategy:** `feature/s4-007-landing-sections`, parallel to M2 tasks (disjoint files).
- **Expected files:** `features/landing/components/{visual-pipeline,interactive-demo,social-proof,pricing,faq}.tsx`, `app/page.tsx`.
- **Testing strategy:** No new business logic to unit-test (presentational + reused session-adaptive CTA logic); manual responsive/animation/reduced-motion verification per the spec's own Responsive/Scroll/Animation Behavior sections.

---

### S4-008 — Dashboard Quick Actions, Search, Filters, Metrics

- **Purpose:** Implement `Dashboard-Experience-Specification.md`'s net-new Dashboard-page scope (excluding Settings and recency ordering, split into S4-009/S4-010).
- **Repository areas affected:** `features/projects/components/projects-panel.tsx` (composition), new `features/projects/components/{quick-actions,project-search,project-filters,dashboard-metrics}.tsx`, `components/dashboard/dashboard-overview.tsx` (page-composition wiring).
- **Dependencies:** S4-001, S4-002, S4-003 (No Search Results / empty-grid states use the shared `EmptyState`).
- **Estimated complexity:** M.
- **Acceptance criteria:** Quick Actions row (max 3: New Project, New Generation, Resume Last Generation) resolves each action to a real route; Search filters the grid client-side by title; Filters (pill chips) compose with Search via AND logic; Metrics row shows real counts (total projects, total generations — the latter requires a lightweight count query, see Risks) with no fabricated trend visuals.
- **Definition of Done:** "No search results" state uses S4-003's `EmptyState`, not ad hoc markup; "Clear search"/"Clear filters" actions verified to actually reset state, not just hide the message.
- **Risks:** The Metrics row's "total generations" count requires either a new repository query (`count(*) from generations where project in (user's projects)`) or client-side aggregation across already-fetched data — the former is more correct at scale and should be preferred; flag as a small, additive repository function, not a schema change.
- **Suggested commit message:** `feat(dashboard): add quick actions, project search, filters, and metrics row`
- **Suggested branch strategy:** `feature/s4-008-dashboard-search-metrics`, depends on S4-003 merging first.
- **Expected files:** `features/projects/components/*`, `lib/repositories/generation.repository.ts` (new count query, additive).
- **Testing strategy:** Unit tests for the search+filter AND-composition logic (pure function, easy to test in isolation); repository test for the new count query following this repo's existing repository-test conventions.

---

### S4-009 — Dashboard Recency Ordering

- **Purpose:** Implement the spec's "most-recently-active first" project ordering. Split from S4-008 because it's a data/query-shape decision, not a UI change, and carries different risk.
- **Repository areas affected:** `lib/repositories/project.repository.ts` (`getProjectsForUser`).
- **Dependencies:** None beyond S4-001 conceptually; can run any time, independent of other M4 tasks.
- **Estimated complexity:** M — **larger than it looks.** Verified against the live repository: `getProjectsForUser()` currently orders by `created_at DESC`. `updateProject()` bumps `updated_at` only on title/description edits — **creating a new generation does not touch the parent project's `updated_at`** (no trigger does this today, confirmed via `supabase/triggers.sql`'s scope being limited to the signup trigger). Simply switching the sort column to `updated_at` would not achieve "most recently generated-for," only "most recently renamed."
- **Acceptance criteria:** One of two real implementation paths, decided before coding starts (this is this task's own Phase-A-equivalent decision, matching this project's documented practice of flagging DB-touching decisions explicitly): **(a)** add a Postgres trigger (`supabase/triggers.sql`) that bumps `projects.updated_at` whenever a row is inserted into `generations` for that project, then sort by `updated_at` — matches the existing trigger-based pattern already in this repo; or **(b)** compute "last generation timestamp per project" via a join/subquery in `getProjectsForUser()` and sort by that, leaving `projects.updated_at` semantically unchanged. **Recommendation: (a)** — it's consistent with the existing trigger pattern, cheaper at read time, and doesn't complicate the repository query — but this must be confirmed, not assumed, before implementation, since it's a schema-adjacent change.
- **Definition of Done:** Chosen approach documented in the PR description with the same explicitness `TECH_DEBT.md` TD-001 uses for its own DB-behavior tradeoff; `getProjectsForUser()`'s return order verified against a real multi-project, multi-generation fixture (create project A, generate, create project B, generate again for A — A must sort first).
- **Risks:** **Database migration required** (new trigger) — this is the one task in Sprint 4 that touches Supabase schema/trigger state, not just application code. Should follow this project's existing "flag before doing DB changes" discipline (same spirit as TD-001, TD-005) and get explicit confirmation before applying the migration to any shared environment.
- **Suggested commit message:** `feat(projects): order dashboard projects by last generation activity`
- **Suggested branch strategy:** `feature/s4-009-project-recency-ordering`, independent branch given its distinct risk profile — do not bundle with S4-008.
- **Expected files:** `lib/repositories/project.repository.ts`, `supabase/triggers.sql` (if approach (a)), a new `drizzle/migrations/*` entry for the trigger.
- **Testing strategy:** Repository-level test with a fixture asserting order-by-last-activity, not just order-by-creation; this is exactly the kind of behavior change that needs a regression test given it silently changes existing query semantics.

---

### S4-010 — Account Settings Screen

- **Purpose:** Build the entirely new global Account Settings screen: Preferences, Appearance, Accessibility, Account, Billing (placeholder), Keyboard Shortcuts (reference), Developer, and per-category Reset — the single largest net-new UI surface in Sprint 4.
- **Repository areas affected:** New `features/account-settings/` module (following this repo's established `components/hooks/types/actions/lib` feature-module shape), new `app/(dashboard)/dashboard/settings/page.tsx` route, `features/shell/lib/nav-items.ts` (already stubbed by S4-005), `lib/actions/` (new account-preference actions), likely a new `user_preferences`-shaped table or a JSON column on the existing profile row (schema decision, see Risks).
- **Dependencies:** S4-001, S4-002, S4-003, S4-004, S4-005 (nav entry must exist first).
- **Estimated complexity:** L — largest single task in the sprint by surface area, though individually low-risk (mostly forms).
- **Acceptance criteria:** All 8 categories present and navigable via in-page category list (collapsing to a dropdown/tab strip below `sm`, per spec); Appearance wraps the existing `next-themes` `ThemeToggle` state (does not duplicate it — same source of truth, per spec's explicit rule); Accessibility section's reduced-motion override and high-contrast toggle actually take effect product-wide (requires a small CSS/context mechanism — see Risks); Billing shows a genuinely-disabled "Manage billing" control (same DOM-level-disabled pattern as the existing Project Settings dialect/naming controls — TD-verified pattern, not reinvented); Keyboard Shortcuts section is read-only, sourced from `KeyboardShortcutProvider`'s actual registry (not a hand-maintained duplicate list, to avoid it drifting out of sync); each category's Reset is scoped to that category only, never global.
- **Definition of Done:** Preferences (default dialect/naming-convention for new projects, default post-login landing screen) persist per-user; Account section (email, password change, sign-out-all-sessions, delete-account) wired to real Supabase Auth calls, delete-account behind the destructive-confirmation dialog pattern from Design System 2.0 §10.
- **Risks:** **New persistence surface required** — where do "default dialect," "reduced-motion override," etc. live? This needs an explicit decision before coding: a new `user_preferences` table (RLS-scoped like every other table, per this repo's sole-authorization-via-RLS principle) is the cleanest fit, consistent with the existing `projects`/`generations` pattern — flagged as a schema-adjacent decision requiring the same explicit confirmation as S4-009's trigger. The reduced-motion/high-contrast overrides need a mechanism to apply *before* first paint (to avoid a flash of un-overridden motion/contrast) — likely a cookie read in the root layout, mirroring how theme is already handled by `next-themes`.
- **Suggested commit message:** `feat(settings): add global Account Settings screen (preferences, appearance, accessibility, account, billing, shortcuts, developer)`
- **Suggested branch strategy:** `feature/s4-010-account-settings`, largest task — consider landing in 2 sequential PRs on the same branch (read-only categories first: Appearance, Keyboard Shortcuts, Billing placeholder; then mutation-bearing categories: Preferences, Accessibility, Account, Developer, Reset) rather than one giant PR, to honor "avoid large PRs" even within a single task.
- **Expected files:** `features/account-settings/**`, `app/(dashboard)/dashboard/settings/page.tsx`, `lib/actions/account-preferences.actions.ts`, `lib/repositories/user-preferences.repository.ts`, new migration.
- **Testing strategy:** Repository/action-level tests for preference CRUD; a dedicated test that the Keyboard Shortcuts list is generated from the real registry, not hand-duplicated (regression guard against future drift); manual verification of the pre-paint reduced-motion/high-contrast application.

---

### S4-011 — Generator: Prompt Suggestions & Templates

- **Purpose:** Implement `Generator-Experience-Specification.md`'s two lowest-risk net-new features: Prompt Suggestion chips and the Templates picker.
- **Repository areas affected:** `features/ai-workspace/components/prompt-editor.tsx` (add suggestion chips, shown only when empty), new `features/ai-workspace/components/{prompt-suggestions,template-picker}.tsx`, a static `features/ai-workspace/lib/{suggestions,templates}.ts` data module (content, not logic).
- **Dependencies:** S4-001, S4-002.
- **Estimated complexity:** S.
- **Acceptance criteria:** Suggestion chips populate the textarea on click without auto-submitting (per spec); Template picker (dropdown or dialog, elevation level 3) inserts a longer structured prompt for user review, also without auto-submitting; both are purely client-side, no new Server Action or backend change.
- **Definition of Done:** Content (which suggestions/templates ship) is a product/copy decision flagged the same way as S4-007's Pricing/FAQ copy — implement the mechanism with realistic placeholder content, confirm final copy before production release.
- **Risks:** Low — smallest, most contained task in the Generator milestone; good candidate to land first within M5 to de-risk the module before S4-012's larger change.
- **Suggested commit message:** `feat(generator): add prompt suggestion chips and template picker`
- **Suggested branch strategy:** `feature/s4-011-prompt-suggestions-templates`.
- **Expected files:** `features/ai-workspace/components/{prompt-editor,prompt-suggestions,template-picker}.tsx`, `features/ai-workspace/lib/{suggestions,templates}.ts`.
- **Testing strategy:** Component tests: clicking a suggestion/template fills the textarea and does not trigger generation.

---

### S4-012 — Generator: Staged Reveal & Progress Indicators

- **Purpose:** Ship the resolved interpretation of `Generator-Experience-Specification.md` §Streaming Generation / §Progress Indicators from §1 above — a staged, honest reveal of the already-complete five-artifact result, plus a qualitative (never fake-percentage) progress indicator during the actual wait.
- **Repository areas affected:** `lib/stores/generation-store.ts` (extend the `GenerationState` union with a `revealedTabs`/staging concept, or handle staging as purely a client-side animation sequence over the existing `success` state — **prefer the latter**, since it requires no store-shape change and keeps `generation.service.ts` completely untouched), `features/compiler/components/generation-status.tsx`, `features/workbench/components/output-tabs.tsx` (staged mount/reveal animation), `features/ai-workspace/components/schema-generator.tsx`.
- **Dependencies:** S4-001, S4-004 (uses `ErrorState` for the timeout/failure path), S4-011 (shares the Generator screen, sequence PRs to avoid conflicts).
- **Estimated complexity:** L — not because the mechanism is complex (it's a client-side animation sequence over already-fetched data), but because getting the honesty framing right (per §1's resolution) needs care in implementation and copy, and this is the task responsible for updating `Generator-Experience-Specification.md` §Streaming Generation to describe the shipped behavior.
- **Acceptance criteria:** On generation success, the five tabs' completion indicators populate in a fixed order (SQL → Drizzle → JSON → Docs → ERD) with a brief, consistent stagger (using `duration-fast`/`ease-standard` per Design System 2.0 §8), all backed by data that has already fully arrived — never a claim that something is "still generating" once the Server Action has resolved; the qualitative "Generating…" state during the actual wait uses no fabricated percentage; `aria-live` announcements fire per the existing `GenerationStatus` pattern, extended to also announce each staged reveal.
- **Definition of Done:** `Generator-Experience-Specification.md` §Streaming Generation updated to describe the shipped staged-reveal behavior and explicitly note true AI-token streaming as a deferred future item (the one specification edit this roadmap requires, executed as part of this task, not this planning document).
- **Risks:** The main risk is under-communicating to a future reader why this isn't "real" streaming — mitigated by the spec update in Definition of Done and by this document's §1 explanation being the canonical record of the decision.
- **Suggested commit message:** `feat(generator): add staged artifact reveal and honest progress indicator`
- **Suggested branch strategy:** `feature/s4-012-staged-reveal`, depends on S4-011 merging first (same screen).
- **Expected files:** `features/compiler/components/generation-status.tsx`, `features/workbench/components/output-tabs.tsx`, `features/ai-workspace/components/schema-generator.tsx`, `docs/specifications/Generator-Experience-Specification.md` (spec sync).
- **Testing strategy:** Component test asserting the reveal sequence fires in the fixed order and only after the underlying data is present (not before); no new backend/integration tests needed since `generation.service.ts` is unchanged.

---

### S4-013 — Generator Polish: Export UX & Undo/Retry

- **Purpose:** Implement the remaining net-new Generator scope: bundled "Export all" download, and the undoable-delete pattern for Generation History.
- **Repository areas affected:** `features/workbench/components/output-actions.tsx` (add "Export all"), `features/workbench/lib/output-config.ts` (extend for bundling), `features/history/components/` (undo-delete toast flow), `hooks/` (possible new `use-undoable-action.ts` generic hook, since "delay the real action, offer undo, then commit or cancel" is a reusable pattern, not History-specific).
- **Dependencies:** S4-001, S4-004 (toast/notification pattern).
- **Estimated complexity:** M.
- **Acceptance criteria:** "Export all" produces a single zip containing correctly-named/typed SQL, Drizzle, JSON, Markdown files plus the ERD as both `.mmd` and rendered `.svg`, via one click, one download — requires a new client-side zip dependency (none exists in `package.json` today; a lightweight, well-maintained option like `fflate` or `jszip` should be evaluated and confirmed before adding); Generation deletion shows an "Generation deleted — Undo" toast with a time-limited undo window; clicking Undo cancels the pending `deleteGenerationAction` call entirely (no backend soft-delete/restore needed — the delete call is simply delayed client-side until the undo window closes, which is simpler and lower-risk than a real soft-delete mechanism).
- **Definition of Done:** New dependency choice documented and justified (bundle size, maintenance status) in the PR, per this repo's evident care around dependency additions (`TECH_DEBT.md`'s dependency-hygiene entries).
- **Risks:** Client-side zip generation of potentially large artifacts (a very large schema's SQL/Drizzle/ERD) — verify performance on a realistic large-schema fixture before merging, not just a toy example.
- **Suggested commit message:** `feat(generator): add bundled export download and undoable generation deletion`
- **Suggested branch strategy:** `feature/s4-013-export-undo`, depends on S4-012 merging first (same screen family).
- **Expected files:** `features/workbench/components/output-actions.tsx`, `features/workbench/lib/output-config.ts`, `features/history/components/*`, `hooks/use-undoable-action.ts`, `package.json` (new dependency).
- **Testing strategy:** Unit test for the undo-window logic (cancel prevents the real action from firing); manual verification of zip contents against a real multi-artifact generation.

---

### S4-014 — Workbench: Monaco Integration

- **Purpose:** Replace `CodeViewer`'s Prism-based read-only display with Monaco Editor in read-only mode for SQL/Drizzle/JSON, per `Workbench-Experience-Specification.md` §Monaco Integration.
- **Repository areas affected:** `features/workbench/components/code-viewer.tsx` (rewritten, not extended — this is a genuine replacement, not an addition), theming glue mapping Design System 2.0 tokens onto a custom Monaco theme, `package.json` (new dependency: `@monaco-editor/react` is the standard choice for React/Next.js integration over raw `monaco-editor`, given it handles the worker-loading complexity Next.js's bundler otherwise fights with).
- **Dependencies:** S4-001 (tokens for theming).
- **Estimated complexity:** L — the single highest-risk *dependency-integration* task in the sprint (though not as architecturally risky as S4-012 was before its scope was resolved).
- **Acceptance criteria:** Monaco lazy-loaded (dynamic import, matching the existing lazy-load pattern already used for `mermaid` — same technique, not a new one); `readOnly: true`; correct language mode per artifact (`sql`, `typescript` for Drizzle, `json`); custom theme derived from `--surface-2`/`--text-primary`/`--accent-violet` tokens, both light and dark; minimap auto-suppressed under ~40 lines, user-toggleable above that; find widget (`Cmd/Ctrl+F`) works; replace UI renders but is inert (Monaco's own built-in read-only behavior — no custom code needed for this specific behavior, confirm rather than build).
- **Definition of Done:** Bundle-size impact measured (`next build` output) and reported in the PR — Monaco is a genuinely large dependency; the existing lazy-load discipline in this codebase (Mermaid) sets the bar this must also meet, i.e., it must not appear in the initial bundle for any route that doesn't render the Workbench.
- **Risks:** **Bundle size** is the primary risk — mitigate via dynamic `import()` verified against the actual build output, not assumed. **Next.js/webpack worker-loading friction** is a well-known Monaco integration pain point — budget explicit time for this, don't estimate it as "just swap the component." Documentation viewer (`MarkdownViewer`) is explicitly **not** touched by this task (spec: Documentation stays Markdown-rendered, not editor-rendered).
- **Suggested commit message:** `feat(workbench): replace Prism code viewer with read-only Monaco Editor`
- **Suggested branch strategy:** `feature/s4-014-monaco-integration`, isolated branch given its risk profile — land and verify in a Vercel Preview deployment before merging, per this project's own established Milestone-2/3 verification practice (`v0.7.1-roadmap.md` §Testing strategy).
- **Expected files:** `features/workbench/components/code-viewer.tsx`, new `features/workbench/lib/monaco-theme.ts`, `package.json`.
- **Testing strategy:** Component test verifying correct language mode per artifact type and `readOnly` is always `true`; manual verification of find widget, minimap threshold behavior, and both themes; bundle-size check as part of PR review, not an automated gate (no existing bundle-size CI check to hook into — flagged as a manual step, not invented tooling).

---

### S4-015 — Workbench: Fullscreen, Command Palette, Prev/Next Nav, State Persistence

- **Purpose:** Implement the remaining `Workbench-Experience-Specification.md` scope: Fullscreen Mode, Workbench-scoped command palette commands, prev/next generation navigation, and session-level state persistence (active tab, split position, panel collapse, minimap toggle).
- **Repository areas affected:** `features/workbench/components/split-pane-canvas.tsx` (panel collapse controls), new `features/workbench/components/fullscreen-toggle.tsx`, `features/shell/components/command-palette.tsx` (route-scoped command registration — needs a small extension to support commands that only register while a given route is active, which doesn't exist yet), `components/dashboard/workbench-view.tsx` (prev/next nav), `lib/stores/ui-store.ts` (extended with Workbench session state, following its existing "cross-cutting UI chrome state" scope).
- **Dependencies:** S4-005 (breadcrumbs/nav shell), S4-014 (Monaco should land first — fullscreen and the command palette's search/minimap-toggle commands wrap around it).
- **Estimated complexity:** L — four distinct sub-features bundled into one task because they're all small individually and all touch the same Workbench chrome; if review feedback suggests otherwise, this is the one task in the roadmap most amenable to being split further without much rework.
- **Acceptance criteria:** Fullscreen hides sidebar/top bar only, workspace content still respects `content-lg` (per the QA-corrected Workbench spec); `Escape` exits fullscreen or closes the find widget, whichever is active; command palette gains "Jump to generation…," "Toggle ERD panel," "Toggle fullscreen," "Copy [tab] to clipboard" only while a Workbench route is focused, and these do not leak into the palette on other routes; prev/next steps through a project's generation history without a full History-list round-trip; active tab / split position / panel collapse / minimap toggle persist for the session (not indefinitely) per project.
- **Definition of Done:** Command palette's route-scoping mechanism is generic enough to be reused by a future feature needing the same pattern (not hardcoded to "if pathname includes workbench") — a small, real architectural improvement to `CommandPalette` that this task's scope requires anyway.
- **Risks:** The command palette route-scoping extension is the one piece of genuinely new shared infrastructure in this task — review it as carefully as a shared-component change, not as Workbench-local polish.
- **Suggested commit message:** `feat(workbench): add fullscreen mode, scoped command palette commands, generation nav, and session state persistence`
- **Suggested branch strategy:** `feature/s4-015-workbench-chrome`, depends on S4-014 merging first.
- **Expected files:** `features/workbench/components/{split-pane-canvas,fullscreen-toggle}.tsx`, `features/shell/components/command-palette.tsx`, `components/dashboard/workbench-view.tsx`, `lib/stores/ui-store.ts`.
- **Testing strategy:** Unit test for the command palette's route-scoping (commands appear/disappear correctly as the active route changes); manual verification of persistence behavior across a session and its correct *non*-persistence of fullscreen (per spec, fullscreen is explicitly transient).

---

### S4-016 — Micro-Interaction & Accessibility Audit Pass

- **Purpose:** Sweep every component touched by S4-001 through S4-015 (and, opportunistically, pre-existing components) against `Micro-Interactions.md`'s full interaction-state table and Accessibility Experience section — this is the task that closes the gap between "tokens exist" (S4-001) and "every component actually uses them consistently."
- **Repository areas affected:** Broad, shallow touch across `components/ui/*`, every `features/*/components/*` modified in Sprint 4, `app/globals.css` (any missed focus-ring/reduced-motion edge case).
- **Dependencies:** S4-001 through S4-015 (this is deliberately the second-to-last task — auditing before everything else lands would mean auditing against a moving target).
- **Estimated complexity:** L — not individually complex per fix, but broad in surface area and easy to underestimate.
- **Acceptance criteria:** Every interactive element added or touched this sprint has all applicable states from `Micro-Interactions.md`'s table (rest/hover/focus/active/disabled, plus success/error/loading where relevant); every hover-only affordance has a confirmed focus equivalent; touch targets verified at 44×44px minimum via actual DOM inspection, not just class-name inspection; contrast-checked (automated tool, e.g. axe or a Lighthouse accessibility pass) against Design System 2.0 §11's 4.5:1/3:1 minimums in both themes; `prefers-reduced-motion` verified to actually suppress every entrance/transition animation shipped this sprint, not just the ones from S4-007.
- **Definition of Done:** A short audit log (which components were checked, what was fixed) attached to the PR — this repo's established pattern for disclosing verification scope honestly (matching `TECH_DEBT.md`'s and the UX audits' own style of stating what was and wasn't checked) rather than claiming a blanket "accessibility verified" with no specifics.
- **Risks:** The biggest risk is scope underestimation — treat this as a full sprint-worth task, not a half-day cleanup, given the number of new components shipped in M2–M6.
- **Suggested commit message:** `fix(a11y): audit and align Sprint 4 components to Micro-Interactions.md state and accessibility requirements`
- **Suggested branch strategy:** `feature/s4-016-a11y-audit`, single branch but expect several small follow-up commits as issues are found — do not force this into one clean diff if the findings warrant otherwise.
- **Expected files:** Broad; exact list only known once the audit runs.
- **Testing strategy:** Automated accessibility scanning (axe-core via Vitest/Testing Library, or a manual Lighthouse pass per screen if axe isn't already integrated — this repo has no accessibility-testing tooling today, confirmed via `package.json`, so adding a minimal one is in scope for this task) plus manual keyboard-only navigation of every screen touched this sprint.

---

### S4-017 — Cross-Screen Regression, Doc Sync & Sprint 4 Closure

- **Purpose:** Final integration pass across all of Sprint 4's changes together (not just per-task), plus the documentation-synchronization step this project consistently does at the end of every sprint (Sprint 0, Sprint 1, and Sprint 3A all closed this way).
- **Repository areas affected:** None structurally — this task verifies, and updates documentation, it doesn't add features.
- **Dependencies:** All of S4-001 through S4-016.
- **Estimated complexity:** M.
- **Acceptance criteria:** `npm run build`, `npm run typecheck`, `npm run lint`, `npm test` all pass on the fully-merged state (mirroring this repo's existing CI gate, `.github/workflows/ci.yml`); every user journey in `User-Journey-Maps.md` walked end-to-end manually at least once against the real, merged product; `TECH_DEBT.md` updated to close any items Sprint 4 resolved (e.g., the sidebar-icon and emerald/amber gaps from S4-002) and to log any new debt knowingly incurred (e.g., if S4-016's audit finds issues deferred rather than fixed).
- **Definition of Done:** `SCHEMACRAFT_AI_MASTER_CONTEXT.md` updated to reflect Sprint 4's shipped state (new routes, new feature modules, new dependencies), matching its own "update whenever architecture/features/structure change" maintenance rule; `Generator-Experience-Specification.md`'s streaming-section update from S4-012 double-checked as actually landed; a short Sprint 4 closure note added analogous to `Sprint-00-Recovery.md`/Sprint 1's closure pattern.
- **Risks:** The main risk is this task being squeezed at the end of the sprint under time pressure — it should be scheduled with real time, not treated as a rubber stamp, given it's the only task that verifies the *sum* of Sprint 4's changes rather than any one part.
- **Suggested commit message:** `docs: close sprint 4 — sync tech debt, master context, and generator spec`
- **Suggested branch strategy:** `docs/sprint-4-closure`, cut after every other Sprint 4 branch has merged to `refactor/frontend-modularization-review`.
- **Expected files:** `TECH_DEBT.md`, `SCHEMACRAFT_AI_MASTER_CONTEXT.md`, `docs/specifications/Generator-Experience-Specification.md` (verification only, already edited by S4-012), a new `Sprint-04-Closure.md`.
- **Testing strategy:** Full CI suite plus the manual end-to-end journey walkthrough described above — this is the sprint's regression gate, not a new-feature test.

---

## 4. Dependency Graph

```
S4-001 (Design Tokens) ──┬──────────────────────────────────────────────────┐
S4-002 (Semantic Colors  │                                                  │
        + Sidebar Icons) ┘                                                  │
        │                                                                   │
        ├──▶ S4-003 (EmptyState) ──┐                                        │
        ├──▶ S4-004 (ErrorState) ──┤                                        │
        │                          │                                        │
        ├──▶ S4-005 (Nav/Breadcrumbs/Mobile) ──▶ S4-010 (Account Settings) ◀┤
        │         │                                       ▲                │
        │         └──▶ S4-006 (Auth Enhancements) ─────────┘  (uses S4-004) │
        │                                                                   │
        ├──▶ S4-007 (Landing Sections)                                      │
        │                                                                   │
        ├──▶ S4-008 (Dashboard Search/Metrics) ◀── S4-003                   │
        ├──▶ S4-009 (Recency Ordering)  [independent, DB-touching]          │
        │                                                                   │
        ├──▶ S4-011 (Prompt Suggestions/Templates)                         │
        │         └──▶ S4-012 (Staged Reveal) ◀── S4-004                    │
        │                   └──▶ S4-013 (Export/Undo) ◀── S4-004            │
        │                                                                   │
        └──▶ S4-014 (Monaco) ──▶ S4-015 (Fullscreen/Palette/Nav/State) ◀── S4-005

S4-001 … S4-015 (all) ──▶ S4-016 (Micro-Interaction & A11y Audit) ──▶ S4-017 (Regression + Doc Sync + Closure)
```

**Parallelizable lanes** (distinct engineers/branches can work simultaneously once S4-001/S4-002 land): Navigation+Auth (S4-005→006), Landing (S4-007), Dashboard (S4-008, S4-009), Generator (S4-011→012→013), Workbench (S4-014→015). Only S4-010 has a genuine cross-lane dependency (needs S4-005's nav entry). S4-016 and S4-017 are hard convergence points — nothing in them can start meaningfully early.

---

## 5. Repository Impact Analysis

| Area | Impact |
|---|---|
| `app/globals.css` | Extended twice (S4-001 tokens, S4-002 semantic mapping) — highest-shared-blast-radius file touched, but both changes are additive. |
| `features/shell/*` | Moderate-to-heavy — icon fix, breadcrumbs, mobile drawer, route-scoped command palette. |
| `features/ai-workspace/*` | Moderate — suggestions/templates, staged reveal, no changes to the actual generation call. |
| `features/workbench/*` | Heaviest single-module impact — Monaco replaces an existing component outright, plus 4 new chrome features. |
| `features/projects/*` | Moderate — new Dashboard sub-components. |
| `features/landing/*` | Moderate — 5 new sections, additive only. |
| `features/history/*` | Light — undo-delete flow only. |
| New module: `features/account-settings/*` | New — entire module, largest net-new surface area. |
| New shared layer: `components/patterns/*` | New — `EmptyState`, `ErrorState`, `InlineError`, `OfflineBanner`, consumed widely. |
| `lib/repositories/*` | Light but real — one new count query (S4-008), one ordering change + trigger (S4-009), one new `user-preferences` repository (S4-010). |
| `lib/actions/*` | Light — password reset actions (S4-006), account-preference actions (S4-010). |
| `lib/stores/*` | Light — `ui-store` extended for Workbench session state (S4-015); `generation-store` deliberately **not** reshaped (S4-012 keeps staging client-local). |
| `supabase/` (RLS, triggers, migrations) | **Two DB-touching tasks** (S4-009 trigger, S4-010 new table) — the only places Sprint 4 crosses from "application code" into "schema," both explicitly flagged for sign-off. |
| `package.json` | Two new dependencies expected: a Monaco React wrapper (S4-014) and a zip library (S4-013) — both should be confirmed, not assumed, per this repo's dependency-hygiene discipline. |

---

## 6. Risk Assessment

**High-risk implementation areas:**
1. **S4-014 (Monaco integration)** — large dependency, known Next.js/webpack worker-loading friction, real bundle-size risk. Isolated into its own task and branch for exactly this reason.
2. **S4-012 (Generation reveal)** — not high-risk technically (see resolution in §1), but high-risk *conceptually* if the honesty framing is lost in implementation; mitigated by the explicit Definition of Done requiring the spec update.
3. **S4-009 / S4-010 (DB-touching tasks)** — the only two tasks that leave pure application code. Both explicitly flagged for sign-off before migration, consistent with this project's existing TD-001/TD-005 discipline around database and infrastructure changes.
4. **S4-006 (Auth)** — small in LOC, high in consequence if the open-redirect guard or the account-existence-neutral messaging is implemented sloppily.

**Potential merge conflicts:**
- `app/globals.css` (S4-001, S4-002) — sequence these two first and merge before any other branch touches the file.
- `features/shell/lib/nav-items.ts` (S4-002 adds icon field, S4-005 adds the Account Settings entry) — sequence S4-002 before S4-005, not parallel, despite both being otherwise low-risk.
- `features/workbench/components/output-tabs.tsx` (touched by S4-012 for staged reveal and indirectly relevant to S4-014/S4-015) — sequence Generator (M5) and Workbench (M6) lanes to not land in the same week if avoidable, even though they're technically parallelizable.
- `lib/stores/ui-store.ts` (S4-015 only) — low conflict risk, single task owns it.

**Components likely to require refactoring beyond their own task's scope:**
- `CommandPalette` (S4-015's route-scoping extension is real new infrastructure, not a bolt-on — budget for it as a small architecture change, not a Workbench-local tweak).
- `PageTitle` (S4-005 extends its existing suffix-matching logic — risk of the extension becoming a second parallel mechanism instead of a true extension if not reviewed carefully against the existing TD-018 fix).

**Areas already covered by tests (lower regression risk):** the compiler pipeline, the AST analyzer, and `buildGeneratedArtifacts` (192 existing tests per `SCHEMACRAFT_AI_MASTER_CONTEXT.md` §8) — **none of Sprint 4 touches any of these**, which is a deliberate, favorable property of this plan: the entire Sprint 4 scope is UI/UX and additive backend surface, not the tested compiler core.

**Areas lacking tests (higher regression risk, new coverage needed):** there is currently no component/DOM-testing setup in this repo (`package.json` shows Vitest but no `@testing-library/react`/`jsdom` — confirmed absent) and no accessibility-testing tooling — both gaps are called out explicitly in S4-003 and S4-016 respectively as needing to be added, not assumed to already exist.

---

## 7. Testing Strategy

- **Unit/component level:** each task's own testing strategy above; this sprint is the first to need real component/DOM testing (no prior UI test infrastructure existed) — S4-003 is responsible for confirming/adding `@testing-library/react` + a DOM environment, flagged once so it isn't silently re-decided per task.
- **Repository/integration level:** new repository functions (S4-008's count query, S4-009's reordering, S4-010's preferences CRUD) follow this repo's existing repository-test conventions (hand-written expected-output assertions, per this project's own documented anti-snapshot-testing stance in `v0.7.1-roadmap.md` §Testing strategy).
- **Accessibility:** automated scanning introduced in S4-016 (axe-core or equivalent), plus manual keyboard-only passes — this repo has no accessibility CI gate today; whether to add one is a decision for Sprint 4 closure (S4-017), not assumed here.
- **Manual/exploratory:** every DB-touching change (S4-009, S4-010) verified against a real Supabase Preview environment before merge, mirroring this project's own established practice (`v0.7.1-roadmap.md` §Testing strategy: "Vercel Preview deployments... become the standard verification step"). Monaco (S4-014) verified in a Preview deployment specifically for bundle-size/loading behavior, which can't be fully judged from local dev alone.
- **CI:** no changes to `.github/workflows/ci.yml`'s existing gate (lint + typecheck + test + build) are required by this plan — every task is expected to pass the existing gate as-is; if S4-016 adds accessibility scanning to CI, that's an explicit, separate decision at that task's own review, not a silent addition.

---

## 8. Recommended Implementation Order

1. **S4-001, S4-002** (sequential — same file) — everything else waits on these.
2. **S4-003, S4-004** (parallel to each other, after S4-001/002) — shared components before their consumers.
3. **Parallel lanes begin:** S4-005→006 (Nav/Auth), S4-007 (Landing), S4-008/S4-009 (Dashboard), S4-011→012→013 (Generator), S4-014→015 (Workbench) — different engineers/branches, sequenced internally as shown in §4's dependency graph.
4. **S4-010** (Account Settings) once S4-005 lands.
5. **S4-016** (Audit) once all of the above have merged.
6. **S4-017** (Regression + closure) last, unconditionally.

This order front-loads the two riskiest items (S4-009's DB trigger decision, S4-014's Monaco integration) into the middle of the sprint rather than the end, so any architectural surprises they produce still have runway to be absorbed before S4-016/S4-017.

---

## 9. Exit Criteria

Sprint 4 is complete when:

- All 17 tasks (S4-001–S4-017) are merged to `refactor/frontend-modularization-review`.
- `npm run build`, `npm run typecheck`, `npm run lint`, `npm test` pass on the fully-merged branch.
- Every journey in `User-Journey-Maps.md` has been manually walked end-to-end against the real, merged product (S4-017's own acceptance criterion).
- `Generator-Experience-Specification.md` §Streaming Generation reflects the shipped staged-reveal behavior (S4-012's Definition of Done).
- `TECH_DEBT.md` and `SCHEMACRAFT_AI_MASTER_CONTEXT.md` are synchronized to the post-Sprint-4 state (S4-017).
- Both DB-touching changes (S4-009, S4-010) have been explicitly signed off before their migrations were applied to any shared environment.
- No task shipped fabricated placeholder content (pricing, FAQ, testimonials, suggestions) to production without a flagged, separate Product copy-approval step.

## 10. Recommendation

**Proceed.** The specification suite (Design System 2.0 + Sprint 3, QA-validated per `Sprint-03-Summary.md`) is detailed enough that this 17-task breakdown required no invented UX and only one genuine architectural ambiguity, which has a clear, honest, low-risk resolution (§1). The plan isolates its two real risk concentrations (Monaco, the DB-touching tasks) into their own tasks with explicit sign-off gates, and touches zero already-tested compiler/AST code, which keeps Sprint 4's regression surface confined to new and UI-layer code. Recommend beginning with S4-001/S4-002 immediately; all other milestones can be staffed in parallel once those land.
