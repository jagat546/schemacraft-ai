# Changelog

## Unreleased — Private Beta Readiness Hardening (2026-07-28)

Found and fixed during a live private-beta release-readiness pass (real browser verification against a real dev/staging Supabase project, not simulated) — see `docs/planning/Private-Beta-Release-Checklist.md`. Covers Sprints 6/7's own accumulated work reaching a live database for the first time, plus three real bugs only a live pass could surface.

### Fixed
- **Critical:** `check_authenticated_rate_limit()` and `delete_own_account()` (S6-003/S6-004) had never been applied to any live database, and `user_preferences`/`generation_rate_limit_events` had no table-creation migration at all — applying `supabase/rls.sql` failed outright. Since the rate limiter fails closed on any RPC error, this meant every authenticated generation request would have failed from a beta's first user onward. Generated the missing Drizzle migration for both tables and re-applied `rls.sql`; both functions are now live and confirmed callable.
- Icon-only `outline`/`ghost` buttons (e.g. "Sign out," "Back to Dashboard") rendered light-mode text color even in a genuinely active dark-mode session — measured contrast ratio 1.12:1 against the dark surface, a severe, near-invisible WCAG failure. Both variants now declare an explicit rest-state text color instead of relying on inheritance.
- The Account Settings page (`/dashboard/settings`) showed "Project Settings" in the top bar/breadcrumb instead of "Account Settings," because the per-project route title table matched by URL suffix alone and `/dashboard/settings` happens to share the `/settings` suffix with the per-project route it was built for.

### Changed
- `generation_rate_limit_events`'s table creation now lives in a proper Drizzle migration, matching how `sandbox_generations` was already done, rather than an inline `CREATE TABLE IF NOT EXISTS` inside `rls.sql`.
- `check_authenticated_rate_limit()` now returns `jsonb` (`{ allowed, retry_after_seconds }`) instead of a plain boolean, so a rate-limited rejection can tell the user approximately when to retry.

## Sprint 7 — Private Beta Readiness (2026-07-27)

Retroactively added: this entry and the three below were missing from the changelog entirely until the release-candidate prep found the gap. See `docs/planning/Sprint-07-Closure.md` for the full record.

### Added
- Route-level loading (`app/(dashboard)/loading.tsx`), error (`app/error.tsx`, `app/global-error.tsx`), and not-found (`app/not-found.tsx`) states for every authenticated route, replacing Next.js's default blank/crash/404 screens with this product's own loading skeleton and `ErrorState` pattern
- Edit & Regenerate: an action on each past generation in History that carries its original prompt (and the correct project) into the Generator for editing and resubmission
- Rate-limit rejections now include an approximate retry-time estimate ("try again in about 45 seconds") instead of a bare "try again later"

## Sprint 6 — Product Hardening & First-Run Experience (2026-07-27)

### Added
- Generator Retry: a real Retry action on a failed generation, resubmitting the preserved prompt through the existing submission path
- Authenticated-user generation rate limiting (60/hour, burst 10/minute), reusing the public sandbox's proven `pg_advisory_xact_lock` pattern
- Business-rule `CHECK` constraints (non-negative price/quantity/age-like columns) and realistic `VARCHAR` sizing in generated SQL/Drizzle output, via shared AI prompt guidance
- Delete-account: `delete_own_account()` (`SECURITY DEFINER`, scoped to `auth.uid()`), a high-friction confirmation dialog in Account Settings, per AD-005
- A dismissible, cookie-backed first-run onboarding card on the Dashboard

### Fixed
- Icon-only buttons now meet a 44×44px effective hit-target via a shared hit-slop pseudo-element on the `Button` component

### Documented
- AD-006: Vercel confirmed as the production platform; audited (not fixed, DevOps-owned) that CI has no automatic trigger and the legacy EC2/PM2 CD workflow is non-functional

## Sprint 5 — AI Provider Architecture (2026-07-27)

### Added
- A provider-agnostic AI architecture (`AIProviderAdapter`, a shared error hierarchy, retry strategy, provider registry) — Gemini refactored onto it with no behavior change
- Anthropic and OpenAI providers alongside Gemini, each with their own structured-output mechanism, sharing 100% of the prompt/validation/compiler pipeline
- Centralized provider selection (`resolveAIProvider()`: explicit choice → `DEFAULT_AI_PROVIDER` env var → Gemini fallback)

### Fixed
- OpenAI's SDK constructor threw immediately without an API key, which would have crashed every generation (including Gemini-only ones) in any environment without `OPENAI_API_KEY` set — fixed by making every provider's client lazily constructed and cached

### Documented
- AD-005: delete-account mechanism decision (hard delete via a `SECURITY DEFINER` function, leaning on the existing FK cascade chain) — implemented in Sprint 6

## Sprint 4 — UX 2.0 Implementation (2026-07-27)

### Added
- Design System 2.0 tokens and semantic color wiring; sidebar breadcrumbs and a mobile nav drawer
- Password reset flow, sign-out-all-sessions, and a non-redirecting session-expiration recovery path (AD-004) so the Generator can recover in place instead of navigating the user away mid-action
- Landing page: visual pipeline diagram, interactive demo, social proof, pricing tiers, FAQ
- Dashboard quick actions, search, filters, a metrics row, and recency-based project ordering
- A full Account Settings screen: appearance, a live keyboard-shortcuts reference, accessibility overrides (reduced-motion/high-contrast, cookie-backed), account management, and honestly-disabled billing/preferences/developer placeholders
- Prompt suggestion chips and a Templates picker; a staged artifact reveal on generation
- Bundled "Export all" zip download and undoable generation deletion
- Monaco Editor replacing the previous Prism-based code viewer
- Workbench Fullscreen Mode, a route-scoped command palette, prev/next generation navigation, and session-persisted layout state
- `jest-axe` accessibility testing infrastructure

### Fixed
- A nested-interactive accessibility violation (a focusable button inside another focusable element) and a missing product-wide `prefers-reduced-motion` media query

## v0.7.1 — Milestones 2b, 2c & 3: Generation Quality + History (2026-07-26)

### Added
- Foreign-key column indexing in generated SQL (`CREATE INDEX`) and Drizzle (`index()`) output, closing a standard Postgres performance gap present in every previously-generated schema
- Semantic-analyzer warning for many-to-many join tables missing a composite uniqueness guarantee on their FK pair (informational only — never blocks generation)
- Generation History UI (`/dashboard/projects/[id]/history`): browse every past generation for a project, open one into the existing Developer Workbench, delete one with confirmation — the first UI surface for the `getProjectGenerations`/`getGeneration`/`deleteGeneration` repository functions built during Sprint 4
- Live character counters on both prompt inputs (authenticated Generator and the public sandbox)

### Fixed
- Top-bar page title no longer falls back to the generic app name on per-project routes (Workbench, Project Settings, History)
- Signup no longer silently redirects to the login page with no explanation when email confirmation is required — the form now states this explicitly

### Changed
- Removed the unused `react-hook-form` dependency; relocated `shadcn` (a CLI-only scaffolding tool) from runtime `dependencies` to `devDependencies`

## v0.7.1 — Milestone 1: Test Infrastructure & CI (2026-07-23)

### Added
- Vitest test runner with 149 automated tests across 9 files: AST validator (21), semantic analyzer (24), all 5 compilers — SQL, Drizzle, JSON, Markdown, Mermaid (138 total), and generation-service integration tests (11)
- GitHub Actions CI (`.github/workflows/ci.yml`): lint → typecheck → test → build on every push/PR to `main`
- Full production end-to-end validation: all core generation flows, database persistence, duplicate-submission handling, and negative-input testing (empty/whitespace/oversized/emoji/injection-style prompts) verified live against production

### Changed
- Formal architecture review of the v0.7.1 roadmap before implementation began

## v0.7.0 — Canonical Schema AST & Compiler Pipeline (2026-07-22)

### Added
- Canonical Schema AST (`lib/ast/`) as the single AI output contract, replacing direct multi-artifact generation
- Two-phase validation: structural (Zod) shape validation, then semantic analysis (duplicate names, dangling foreign keys, unsafe expressions, and more)
- A deterministic compiler registry with 5 independent compilers (SQL, Drizzle, JSON, Markdown, Mermaid), each a pure function producing byte-identical output for the same input

### Fixed
- Production stability: migrated to the `gemini-flash-latest` model alias and removed an incompatible `thinkingConfig` parameter after diagnosing intermittent production failures

### Removed
- Legacy direct-generation code path (`lib/ai/generate.ts`, `parse-response.ts`, `prompts.ts`)

## v0.6.0 — Project & Generation Persistence (2026-07-22)

### Added
- Full project and generation persistence via Supabase-backed repositories

## v0.5.0 — Repository Layer (2026-07-21)

### Added
- Project and generation repositories with Row Level Security-scoped CRUD

## v0.4.1 (2026-07-21)

### Added
- Drizzle Kit package scripts (migrate, generate, push, studio)

## v0.4.0 — Authentication & Database Foundation (2026-07-21)

### Added
- Supabase Auth integration (sign up / log in / log out, session handling)
- Supabase and Drizzle ORM foundation
- Documentation and Mermaid diagram output viewers
- Sprint 1 developer-experience improvements

## v0.2.0 — Initial AI Generation (2026-07-18)

### Added
- Gemini AI integration
- Server Actions
- Structured schema generation
- SQL generation
- Drizzle ORM generation
- JSON sample data generation
- Prompt builder
- Response parser
- AI configuration module

### Changed
- Replaced mock generator with Gemini-backed generation
