# SchemaCraft AI — Master Context

**Status:** Authoritative project reference. Describes the repository as it exists today.
**Last verified:** 2026-07-27, at Sprint 6 closure (S6-008), branch `feature/sprint-6-application`.
**Maintenance rule:** Update this document whenever architecture, features, or repository structure change. If this document and the repository disagree, the repository is correct — file a doc-sync task rather than trusting this file blindly.

---

## 1. Executive Summary

- **Project name:** SchemaCraft AI
- **Product vision:** Turn a plain-English description of a data model into a complete, internally-consistent set of database artifacts — SQL DDL, a Drizzle ORM model, sample JSON, Markdown documentation, and a Mermaid ER diagram — generated from one deterministic pipeline so every artifact stays consistent with every other.
- **Current status:** Functioning product with a working end-to-end generation pipeline, authentication (including password reset and session-expiration recovery), project/generation persistence, generation history/navigation with undoable delete, a full Account Settings screen (now including a working delete-account flow), a Monaco-powered Workbench (fullscreen mode, route-scoped command palette commands, prev/next generation nav, session-persisted layout state), a public marketing site with an unauthenticated demo sandbox and a richer set of landing sections, an extensible multi-provider AI architecture (Gemini/Anthropic/OpenAI all implemented and registered, provider selection centralized and routed by an explicit-choice → `DEFAULT_AI_PROVIDER` env var → Gemini fallback policy, though Gemini alone serves real traffic today), and — new this sprint — a Generator Retry action, authenticated-user generation rate limiting (60/hour, burst 10/minute), business-rule `CHECK` constraints and realistic `VARCHAR` sizing in generated output, a 44×44px hit-slop on every icon-only button, and a dismissible first-run onboarding card on the Dashboard. Every generated schema still includes FK-column indexes and a join-table uniqueness warning where applicable. Repository builds, typechecks, lints, and tests clean as of the last verification (Sprint 6, task S6-008).
- **Current milestone:** Sprint 6 — Product Hardening & First-Run Experience, complete (S6-001 through S6-008: Generator Retry, a deployment-strategy audit (AD-006, DevOps-owned, not implemented by this sprint), business-rule schema output quality, authenticated rate limiting, delete-account implementation, an icon-button touch-target fix, first-run onboarding, and this closure task). Sprint 5 (AI Provider Architecture, S5-001 through S5-005) completed prior; Sprint 4 (UX 2.0 Implementation, S4-001 through S4-017) before that; Sprint 3A (spec QA) and Sprint 1 (S1-001 through S1-005) before that; Sprint 0 (Project Recovery) first. Version `0.7.1` per `package.json`.

---

## 2. Product Overview

- **Problem being solved:** Designing a database schema from scratch (tables, columns, types, keys, indexes, relationships) is repetitive and error-prone, and keeping the SQL, the ORM model, sample data, and documentation all in sync with each other by hand is tedious and a common source of drift.
- **Target users:** Developers who need a fast, correct starting point for a Postgres-backed application's data layer — described in the repository as a "developer tool," not a no-code/end-user product.
- **Core value proposition:** The AI model never generates SQL, a Drizzle model, sample JSON, or documentation directly. It generates exactly one artifact — a **Canonical Schema AST** — and every output format is deterministically compiled from that same AST in the same run. This guarantees the SQL and the Drizzle model can never disagree with each other, because both come from one source of truth.
- **Long-term vision:** Not separately documented in the repository beyond what's stated above. `docs/planning/v0.7.1-roadmap.md` and `TECH_DEBT.md` describe near-term quality and feature gaps (see §9, §10) but no long-range product vision document exists in-repo.

---

## 3. Technology Stack

Only technologies with confirmed, current implementation usage are listed.

| Layer | Technology | Confirmed usage |
|---|---|---|
| Framework | Next.js 16.2.10 (App Router) | `app/` directory, route groups, Server Components |
| UI runtime | React 19.2.4 / React DOM 19.2.4 | throughout `app/`, `components/`, `features/` |
| Language | TypeScript (strict mode) | project-wide; `strict: true` in `tsconfig.json`, zero `any` usage found in the codebase |
| Styling | Tailwind CSS 4 + `tw-animate-css` | `app/globals.css`, utility classes throughout |
| Component library | shadcn/ui (on top of `@base-ui/react`) | `components/ui/*` primitives (button, card, dialog, select, sheet, sidebar, tabs, etc.) |
| Icons | `lucide-react` | 40 files across the codebase |
| AI providers | Google Gemini (`@google/genai`, model alias `gemini-flash-latest`), Anthropic (`@anthropic-ai/sdk`, `claude-sonnet-5`, S5-002), OpenAI (`openai`, `gpt-4.1`, S5-003) | `lib/ai/client.ts` (all three raw SDK clients, lazily constructed — see §5), `lib/ai/providers/{gemini,anthropic,openai}.ts`. Selection centralized in `lib/ai/provider-resolver.ts` (S5-004): explicit choice → `DEFAULT_AI_PROVIDER` env var → Gemini. Only Gemini serves real traffic today; Anthropic/OpenAI are implemented and registered but not yet the default. |
| Database / Auth | Supabase (PostgreSQL + Row Level Security, `@supabase/ssr`, `@supabase/supabase-js`) | `lib/supabase/{client,server,middleware}.ts`, `lib/repositories/*`, `supabase/rls.sql`, `supabase/triggers.sql` |
| ORM (local tooling only) | Drizzle ORM / Drizzle Kit | `lib/db/{schema,relations,index}.ts`, `drizzle/migrations/*`, `drizzle.config.ts` — schema/migrations only, **not** used on the runtime request path (Supabase Server Client is used at runtime so Row Level Security policies see `auth.uid()`) |
| Diagrams | Mermaid | `lib/compiler/mermaid/*`, `features/workbench/components/mermaid-viewer.tsx`, `features/workbench/components/mermaid-canvas.tsx` (pan/zoom via `react-zoom-pan-pinch`) |
| State management | Zustand | `lib/stores/{ui,generation,project,workbench}-store.ts` — `workbench-store.ts` (S4-015) is the first to use the `persist` middleware (sessionStorage, per-project keyed) |
| Forms/validation | Zod | AST schema (`lib/ast/schema.ts`), Server Action input validation |
| Notifications | `sonner` (toast) | wired via `components/providers/toast-provider.tsx`; undo-style toasts (generation delete) added Sprint 4 |
| Code display | Monaco Editor (`@monaco-editor/react`, S4-014) | `features/workbench/components/code-viewer.tsx`, `features/workbench/lib/monaco-theme.ts` — read-only, dynamic-imported (`next/dynamic`, `ssr:false`), CDN-loaded core (no self-hosted `monaco-editor` + webpack plugin, since Next.js 16 defaults to Turbopack for both dev and build). Replaced `prism-react-renderer` (removed entirely, no remaining usage). |
| Zip bundling | `fflate` (S4-013) | `features/ai-workspace/lib/export-bundle.ts` — client-side "Export all" zip of all five artifacts |
| Markdown rendering | `react-markdown` + `remark-gfm` | `features/workbench/components/markdown-viewer.tsx` |
| Command palette | `cmdk` | `features/shell/components/command-palette.tsx`; gained a generic, route-scoped command registry (`command-registry-provider.tsx`, S4-015) on top of the existing static command list |
| Testing | Vitest | `test/`, `**/*.test.ts`/`**/*.test.tsx` (347 tests, 45 files, two-project config: `node` + `jsdom`-backed `dom`) |
| Accessibility testing | `jest-axe` (axe-core, S4-016) | `vitest.setup.dom.ts` (matcher registration), `test/a11y.test.tsx` — structural/ARIA checks only; color-contrast is not evaluated in jsdom (no compiled stylesheet loaded into these unit tests) |
| CI/CD | GitHub Actions | `.github/workflows/project_ci.yml` / `project_cd.yml` — unchanged by Sprint 6 (CI/CD is DevOps-owned, out of this sprint's application-developer scope; see AD-006/TD-024). `project_ci.yml` still triggers only on `workflow_dispatch` (no automatic push/PR verification), and `project_cd.yml` is non-functional as written (targets a stale `develop/chirag` branch filter) and conflicts with Vercel as the confirmed production platform. Audited and documented, not fixed, this sprint. |
| Hosting | Vercel | `.vercel/project.json`; confirmed as the approved production platform (S6-002/AD-006). Deploys currently manual (`vercel --prod`) — no Git↔Vercel auto-deploy integration is configured (TD-005, still open, DevOps-owned) |

---

## 4. Repository Structure

```
app/                    Next.js App Router routes
  (auth)/                 login/signup/reset-password routes + shared auth layout
  (dashboard)/             authenticated app routes (see §5 for the route list)
  page.tsx, layout.tsx     root shell + public marketing landing page
  globals.css              Tailwind + design-token definitions; product-wide
                           prefers-reduced-motion media query + manual
                           reduced-motion/high-contrast class overrides (S4-010B/016)

components/             Non-feature-owned UI
  auth/                    login/signup form components (client)
  dashboard/               thin page-composition components consumed by app/ routes
                           (dashboard-overview, generator-view, workbench-view,
                           project-settings-view, generation-history-view,
                           account-settings-view) plus the Workbench's
                           cross-cutting glue components — workbench-client-shell,
                           workbench-command-registration, workbench-fullscreen-toggle,
                           workbench-generation-nav, workbench-jump-to-generation-dialog
                           (S4-015; live here, not in features/workbench, because
                           they depend on features/shell's command/keyboard
                           infrastructure — see §5 module boundaries) — each
                           fetches server data and composes the real UI from features/
  providers/               theme provider, toast provider
  ui/                      shadcn/ui primitives (button, card, dialog, select,
                           resizable, ...) — resizable.tsx's collapse chevrons
                           removed a nested-interactive a11y bug found in S4-016

features/               Feature modules — the primary unit of UI ownership
  shell/                   AppSidebar, TopNav, ThemeToggle, CommandPalette,
                           keyboard shortcut registry, nav-item config,
                           breadcrumbs; plus (S4-015) a generic, route-scoped
                           CommandRegistryProvider and a DashboardChrome wrapper
                           that conditionally hides the sidebar/top bar for
                           Workbench Fullscreen Mode
  ai-workspace/            PromptEditor, SchemaGenerator, generation-triggering
                           hook, prompt suggestions/templates (S4-011),
                           StagedOutputReveal + ExportAllButton (S4-012/013)
  compiler/                Generation status display (idle/generating/error/
                           session-expired, S4-006B/AD-004; error branch now
                           renders a Retry action, S6-001, wired to the same
                           submission path the Generate button uses)
  workbench/               OutputTabs, CodeViewer (Monaco, S4-014), MarkdownViewer,
                           MermaidViewer, OutputActions, OutputSkeleton, split-pane
                           canvas (panel-collapse + controlled split sizes, S4-015).
                           A strict leaf module — no dependencies on any other
                           feature module (ESLint-enforced); this is why its own
                           Fullscreen/command-registry/prev-nav glue lives in
                           components/dashboard instead.
  projects/                ProjectsPanel, ProjectCard, CreateProjectDialog,
                           quick actions/search/filters/metrics (S4-008)
  account-settings/        Account Settings screen (S4-010/010B): appearance,
                           keyboard shortcuts reference, accessibility
                           (reduced-motion/high-contrast, cookie-backed),
                           account (email/password/sign-out-all-sessions,
                           plus a working delete-account flow with a
                           high-friction confirmation dialog, S6-003/AD-005),
                           billing/preferences/developer (genuinely disabled
                           placeholders, no backend yet)
  onboarding/              (S6-007) OnboardingCard -- a dismissible,
                           first-run empty-state card on the Dashboard
                           (example prompts, a templates entry point, a
                           "Generate your first schema" CTA, a docs link);
                           auto-hides permanently after a first successful
                           generation, not just on explicit dismiss
  landing/                 Public marketing page components — hero, sandbox,
                           feature showcase, nav, footer, plus (S4-007) visual
                           pipeline, interactive demo, social proof, pricing, FAQ
  settings/                Project Settings shell components (dialect/naming
                           selectors, currently backend-gated/disabled)
  history/                 Generation History list/item + delete confirmation,
                           now undoable (S4-013, useUndoableAction) rather than
                           an immediate Server Action call

  Each module follows the same internal shape where populated:
  components/, hooks/, types/, actions/ (client callers of Server Actions),
  lib/ (feature-local pure helpers). Cross-feature imports are enforced by an
  ESLint `import/no-restricted-paths` rule in eslint.config.mjs, not just
  convention — `workbench`, `projects`, `settings`, and `history` are strict
  leaf modules with zero outbound feature dependencies; `shell` likewise has
  none; `compiler`/`ai-workspace`/`landing` may only depend on `workbench`
  (and `ai-workspace` on `compiler` too).

hooks/                  Shared, generic hooks not owned by any one feature
                         (use-copy-to-clipboard, use-mobile, use-in-view,
                         use-undoable-action)

lib/                    Backend logic and shared non-UI code
  actions/                 Server Action boundary ("use server") — auth
                           (now including deleteAccountAction, S6-003),
                           project/generation CRUD, schema generation
                           (now rate-limited and onboarding-dismissing,
                           S6-004/S6-007), account preferences (S4-010B),
                           onboarding dismissal (S6-007)
  services/                generation.service.ts — pipeline orchestrator;
                           resolves its AI provider via lib/ai/provider-resolver.ts
                           (S5-004) rather than importing one directly
  ai/                       Multi-provider AI architecture (Sprint 5): client.ts
                           (lazily-constructed Gemini/Anthropic/OpenAI SDK
                           clients — see §5 for why), config.ts (per-provider
                           model/token/timeout config), errors.ts
                           (AIProviderError hierarchy), types.ts (provider-
                           agnostic request/response contract), retry-strategy.ts,
                           provider-registry.ts (name -> instance lookup),
                           provider-resolver.ts (S5-004's centralized selection
                           policy), ast-prompt-instructions.ts (shared
                           database-design prompt content), providers/
                           (interface.ts + one prompt-builder/response-parser/
                           provider-factory trio per provider: gemini*,
                           anthropic*, openai*)
  ast/                      Canonical Schema AST: Zod schema, types, structural
                           validator, semantic analyzer. ColumnNode gained an
                           optional maxLength field (S6-005, only meaningful
                           for type: "string"; unset falls back to each
                           compiler's existing 255 default)
  compiler/                 5 independent compilers (SQL, Drizzle, JSON,
                           Markdown, Mermaid) + shared helpers + registry
  repositories/             RLS-backed Supabase data access (projects,
                           generations, rate-limit.repository.ts S6-004 --
                           wraps the check_authenticated_rate_limit RPC,
                           extracts resolveRateLimitOutcome as pure,
                           independently testable logic)
  onboarding/               (S6-007) dismissed-cookie.ts -- cookie-backed
                           onboarding-card dismissal, same guaranteed-
                           no-DB-dependency pattern as the existing
                           accessibility-preferences cookie
  stores/                   Zustand client-side state (ui, generation, project,
                           workbench — the last one persist-backed, S4-015)
  supabase/                 browser / server / middleware Supabase clients
  auth/                     auth helper functions (current-user, require-user,
                           get-session-result — AD-004/S4-006B's non-redirecting
                           session check)
  db/                       Drizzle schema/relations — local migration tooling
                           only; includes a prepared-but-not-applied
                           userPreferences table (S4-010B)
  config.ts, download.ts, utils.ts   misc shared config/helpers

types/                  Shared TypeScript types
  schema.ts                GeneratedSchema — the persistence/API contract
  ui.ts                    UI-only shared types

public/                 Static assets — currently the default create-next-app
                         placeholder SVGs (file, globe, next, vercel, window);
                         no product-specific static assets yet

supabase/               Row Level Security policies (rls.sql -- now also
                         including check_authenticated_rate_limit(),
                         S6-004, and delete_own_account(), S6-003/AD-005,
                         both prepared but NOT YET APPLIED to any live
                         database) and the handle_new_user signup trigger
                         (triggers.sql)

drizzle/                Generated SQL migrations + Drizzle Kit metadata

test/                   Top-level test files — the original smoke test
                         (Vitest harness / @/* alias / react-server condition)
                         plus a11y.test.tsx (S4-016, jest-axe/axe-core sweep of
                         Sprint 4's new interactive components); most tests are
                         colocated *.test.ts(x) files next to their source

vitest.mocks/           Test-only module doubles aliased in via vitest.config.ts
                         (S4-014: a lightweight @monaco-editor/react stand-in,
                         since the real package needs a CDN fetch and
                         worker/canvas support jsdom doesn't have)

docs/                   architecture/ (frontend-modularization log, AD-004
                         session-expiration, AD-005 delete-account, AD-006
                         deployment-strategy audit, Sprint 5 AST design doc),
                         planning/ (roadmaps + closure records + release
                         log), specifications/ (Sprint 3 UX 2.0 spec suite),
                         screenshots/

scripts/                apply-supabase-sql.mjs — applies raw SQL to Supabase

Configuration files (repo root):
  package.json            scripts, dependencies
  tsconfig.json            strict TypeScript config, @/* path alias
  eslint.config.mjs        ESLint + feature-module boundary enforcement
  next.config.ts           Next.js config (default scaffold, no custom options)
  components.json          shadcn/ui CLI configuration
  drizzle.config.ts        Drizzle Kit config (local migrations, reads DATABASE_URL)
  vitest.config.ts         Vitest configuration (two projects: node, dom —
                           the dom project aliases @monaco-editor/react to
                           vitest.mocks/ and loads vitest.setup.dom.ts)
  postcss.config.mjs       Tailwind/PostCSS pipeline
  proxy.ts                 Next.js 16 root proxy — auth route protection
  .env.example             documents all environment variables (4 required:
                           DATABASE_URL, the two Supabase vars, GEMINI_API_KEY;
                           the rest optional with safe defaults/fallbacks —
                           ANTHROPIC_API_KEY/OPENAI_API_KEY, S5-002/003, and
                           DEFAULT_AI_PROVIDER, S5-004, among them)
```

---

## 5. Architecture Overview

**Routing.** App Router with two route groups: `app/(auth)/` (`login/page.tsx`, `signup/page.tsx`, `reset-password/page.tsx`, `reset-password/confirm/page.tsx` — S4-006, shared layout) and `app/(dashboard)/` (`dashboard/page.tsx`, `dashboard/generator/page.tsx`, `dashboard/settings/page.tsx` — Account Settings, S4-010, `dashboard/projects/[id]/workbench/page.tsx`, `dashboard/projects/[id]/settings/page.tsx`, `dashboard/projects/[id]/history/page.tsx`, shared layout). `app/page.tsx` is the public marketing landing page (not a redirect). Confirmed current build output includes 12 routes total: `/`, `/_not-found`, `/dashboard`, `/dashboard/generator`, `/dashboard/settings`, `/dashboard/projects/[id]/history`, `/dashboard/projects/[id]/settings`, `/dashboard/projects/[id]/workbench`, `/login`, `/reset-password`, `/reset-password/confirm`, `/signup`.

**Layouts.** `app/layout.tsx` is the root shell. `app/(dashboard)/layout.tsx` calls `requireUser()` (an auth gate) and composes `AppSidebar` + `TopNav` + `CommandPalette` + `KeyboardShortcutProvider` around a scrollable main content area. `app/(auth)/layout.tsx` wraps the login/signup pages.

**Component hierarchy.** App routes are thin — each `page.tsx` renders one `components/dashboard/*-view.tsx` composition component, which fetches server data (via a Server Action) and passes it into the relevant `features/*` module's components. Generic, non-business UI (`components/ui/*` shadcn primitives, `components/providers/*`) sits outside the feature-module system since it isn't tied to one feature.

**Client/server boundaries.** Page-composition components (`components/dashboard/*`) and layouts are async Server Components that fetch data directly. Interactive components (forms, the schema generator, output viewers) are explicitly marked `"use client"`. Server Actions (`lib/actions/*.ts`, `"use server"`) are the sole boundary between client interaction and backend logic — feature-local `hooks/`/`actions/` folders hold client-side orchestration (calling a Server Action, then pushing the result into a Zustand store), never business logic itself.

**Server Actions.** `lib/actions/auth.ts` (signUp/signIn/signOut, plus `deleteAccountAction` — S6-003/AD-005 — calling the `delete_own_account()` RPC then signing out globally), `lib/actions/project.actions.ts` (project CRUD), `lib/actions/generation.actions.ts` (fetch a generation/project's generations, plus `deleteGenerationAction` added Sprint 1), `lib/actions/generate-schema.ts` (authenticated schema generation — auth check, Zod validation, an authenticated-rate-limit check via `check_authenticated_rate_limit` — S6-004, 60/hour + 10/minute burst, fails closed — delegates to `lib/services/generation.service.ts`, then dismisses the onboarding cookie on any real generation result — S6-007), `lib/actions/generate-schema-public.ts` (unauthenticated sandbox generation — rate-limited via a `check_sandbox_rate_limit` Supabase RPC, never persists data), `lib/actions/onboarding.actions.ts` (S6-007, explicit onboarding-card dismissal).

**The generation pipeline** (`lib/services/generation.service.ts`):
```
Prompt → Server Action (auth + Zod validation)
       → AI Provider, resolved via lib/ai/provider-resolver.ts (S5-004) —
         Gemini today; generates a Canonical Schema AST only
       → Structural validation (lib/ast/validator.ts, Zod)
       → Semantic analysis (lib/ast/analyzer.ts — duplicate names, dangling
         FKs, unsafe expressions as errors; missing PK, reserved keywords,
         circular FKs as warnings)
       → Compiler Registry (lib/compiler) — 5 independent, pure compilers run
         against the same AST: SQL, Drizzle, JSON, Markdown, Mermaid
       → Persistence (lib/repositories/generation.repository.ts, Supabase insert)
       → UI renders all 5 output tabs
```

**AI provider architecture (Sprint 5).** What was one hard-coded Gemini call through Sprint 4 is now a provider-agnostic architecture: `AIProviderAdapter` (`lib/ai/providers/interface.ts`) is the contract every provider implements (`generateAST(request): Promise<AIGenerationResponse>`), backed by per-provider `PromptBuilder`/`ResponseParser` pairs (each provider's request/response shape and output-forcing mechanism genuinely differ — Gemini's `responseJsonSchema`, Anthropic's forced tool call, OpenAI's `response_format: json_schema` — S5-001/002/003), a shared `AIProviderError` class hierarchy (`lib/ai/errors.ts`, each subclass carrying a fixed `retryable` flag), and an `ExponentialBackoffRetryStrategy` each provider's own `generateAST` uses internally. `AIProviderRegistry` (`lib/ai/provider-registry.ts`) is a pure name → instance lookup table; `resolveAIProvider()` (`lib/ai/provider-resolver.ts`, S5-004) is the one place actual selection policy lives — explicit caller choice → `DEFAULT_AI_PROVIDER` env var → Gemini fallback, deliberately with no automatic failover, provider chaining, cross-provider retry, load balancing, or cost-based routing (a separate, not-yet-made decision if ever wanted). Every provider's raw SDK client is constructed lazily and cached (`lib/ai/client.ts`) rather than eagerly at module load — found necessary, not stylistic: OpenAI's SDK constructor throws immediately without an API key, unlike Gemini's/Anthropic's, and the registry constructs every registered provider on every generation regardless of which one is actually selected. `generation.service.ts`'s public API is unchanged by any of this — existing Server Action callers pass neither a provider instance nor a provider name and get exactly the same behavior as before.

**Authentication.** Supabase Auth via `@supabase/ssr`. Session-cookie handling is split across `lib/supabase/{client,server,middleware}.ts`. Route protection is enforced twice (defense in depth): the Next.js 16 root proxy (`proxy.ts` → `lib/supabase/middleware.ts::updateSession`) redirects unauthenticated requests to `/dashboard*` to `/login`, and redirects authenticated requests to `/login`/`/signup` to `/dashboard`; independently, `app/(dashboard)/layout.tsx` calls `requireUser()` as a second gate. Password reset (`/reset-password`, `/reset-password/confirm`) and sign-out-all-sessions (Account Settings) added Sprint 4 (S4-006). `requireUser()` itself is now implemented on top of a new, non-redirecting `getSessionResult()` helper (`lib/auth/session-result.ts`, AD-004/S4-006B) — `requireUser()`'s own external behavior (redirect to `/login` on an expired/missing session) is unchanged; `getSessionResult()` exists so a Server Action (`generate-schema.ts`) can instead surface a `{status:"SESSION_EXPIRED"}` result the UI recovers from in place, without navigating the user away mid-generation.

**Authorization.** Row Level Security (RLS) in Supabase is the sole authorization mechanism — every table has explicit SELECT/INSERT/UPDATE/DELETE policies keyed on `auth.uid()`, with no application-layer ownership filtering. Runtime data access always goes through the authenticated Supabase Server Client, never raw Drizzle queries, specifically so RLS policies see the real authenticated user.

**Shared utilities.** `lib/utils.ts`, `lib/download.ts` (generic, output-agnostic — used by the Workbench but deliberately kept in the shared `lib` layer, not feature-owned), `hooks/use-copy-to-clipboard.ts`, `hooks/use-mobile.ts`, `types/ui.ts` (shared UI types consumed by `lib/stores/ui-store.ts` across features).

**State management.** Four Zustand stores (`lib/stores/`): `ui-store.ts` (cross-cutting UI chrome state, e.g. active output tab), `generation-store.ts` (prompt draft + generation status union, including the `session-expired` variant), `project-store.ts` (project list + current selection, shared between the AI Workspace and Projects modules), and `workbench-store.ts` (S4-015 — Workbench fullscreen flag plus per-project active tab/panel-collapse/split-size/minimap-override state, the first store to use `zustand/middleware`'s `persist`, backed by `sessionStorage` and keyed per project id so it matches "for the session," not indefinitely). Rule enforced by convention (verified by inspection, not tooling): a store never calls a Server Action, Supabase, or an AI provider directly — only pure state and state transitions.

---

## 6. Current Features

Features confirmed implemented and reachable in the current codebase:

- **Natural-language schema generation** — authenticated users describe a data model in plain English and receive SQL DDL, a Drizzle ORM model, sample JSON, Markdown documentation, and a Mermaid ER diagram from one generation. Prompt Suggestions chips and a Templates picker (S4-011) help a user with a blank field get started; a staged reveal (S4-012) paces the five completion indicators honestly (the data is already fully present the instant it mounts — see `Generator-Experience-Specification.md` §Streaming Generation's implementation note). A failed generation now shows a **Retry** action (S6-001) that resubmits the exact preserved prompt through the same submission path the Generate button uses. Generated SQL/Drizzle output now includes business-rule `CHECK` constraints for obvious non-negative numeric columns (price/quantity/age) and realistic `VARCHAR` sizing instead of a single blanket 255 width (S6-005).
- **Authenticated-user generation rate limiting** (S6-004, not user-facing until a limit is actually hit) — 60 generations/hour, burst 10/minute, enforced via a `pg_advisory_xact_lock`-based Postgres function mirroring the public sandbox's own proven rate-limit pattern. Fails closed (denies the generation) if the limiter itself is unreachable.
- **Delete account** (S6-003, executes AD-005's decision) — Account Settings' destructive section now has a real, working delete flow: a high-friction confirmation dialog (type the account's email or the word "delete") calling a `delete_own_account()` `SECURITY DEFINER` Postgres function scoped to `auth.uid()`, which cascades every one of the user's projects/generations/preferences away in one transaction, then signs the user out globally.
- **First-run onboarding** (S6-007) — a dismissible card on the Dashboard for a first-time user: example prompts (reusing the Generator's own `PromptSuggestions`), a templates entry point, a "Generate your first schema" CTA, and a documentation link — not a guided tour or coach-marks overlay. Hides permanently on explicit dismiss or automatically after the user's first successful generation, whichever comes first.
- **Multi-provider AI architecture (Sprint 5, not user-facing yet)** — the generation pipeline's AI call now runs through a provider-agnostic architecture supporting Gemini, Anthropic, and OpenAI, with centralized selection (explicit choice → `DEFAULT_AI_PROVIDER` env var → Gemini). No UI or account-level control exists yet to actually choose a provider — that's a deliberately separate, not-yet-made decision (see §9) — so every real generation still uses Gemini today.
- **Public, unauthenticated demo sandbox** — a landing-page "try it now" flow (`features/landing/components/hero-sandbox.tsx`) that runs the same generation pipeline without persistence, rate-limited to 5 requests/hour per visitor (IP-hash-based, fails closed if the rate limiter is unreachable).
- **Project-based organization** — users create named projects; generations are saved under a project. The dashboard grid gained quick actions, search, filters, and a metrics row (S4-008), and now orders by most recent generation activity rather than creation date (S4-009).
- **Generation persistence and retrieval** — generations are saved to Supabase; a per-project Developer Workbench route displays a project's latest generation by default, or a specific past generation via `?generation=<id>`, with prev/next controls to step through history without leaving the route (S4-015).
- **Generation History** — a per-project route (`/dashboard/projects/[id]/history`, added Sprint 1) lists every past generation (newest first), opens any of them into the Workbench, and deletes one behind a confirmation dialog — deletion is now undoable for a few seconds (S4-013, `useUndoableAction`) rather than an immediate, irreversible Server Action call.
- **Developer Workbench** — resizable split-pane view of generation output, with a pan/zoom-capable Mermaid ER diagram viewer, a **Monaco Editor** code viewer (S4-014, read-only, replacing the previous Prism-based syntax highlighter), per-artifact copy/download actions, a one-click "Export all" zip bundle (S4-013, `fflate`), collapsible panels with a persisted split position, a Fullscreen Mode that hides the app chrome, and Workbench-scoped command palette commands ("Jump to generation…," "Toggle ERD panel," "Toggle fullscreen," "Copy [tab] to clipboard" — S4-015).
- **Authentication** — sign up, log in, log out via Supabase Auth; session-cookie based, protected routes enforced at both the middleware and layout level. Password reset flow and sign-out-all-sessions added (S4-006); a non-redirecting session check (`getSessionResult()`, AD-004/S4-006B) lets the Generator recover from an expired session in place instead of navigating the user away mid-action.
- **Dashboard** — authenticated home showing a user's projects as selectable, keyboard-accessible cards.
- **Dedicated Generator route** — a standalone `/dashboard/generator` page for the schema-generation workflow, separate from the dashboard's project list.
- **Account Settings** — a new `/dashboard/settings` route (S4-010/010B): appearance (theme), a read-only keyboard shortcuts reference (sourced live from the real shortcut registry, never hand-maintained), accessibility (reduced-motion/high-contrast overrides, cookie-backed, effective immediately regardless of OS setting), account (email, password change, sign-out-all-sessions), and billing/preferences/developer sections that are genuinely disabled placeholders pending backend support.
- **Project Settings shell** — a `/dashboard/projects/[id]/settings` route exposing SQL-dialect and naming-convention controls; both are genuinely disabled at the DOM level (not just visually), since the compiler layer currently only supports Postgres and snake_case output — the controls are shown to communicate future direction honestly, not hidden.
- **Command palette and keyboard shortcuts** — a `cmdk`-based command palette with a keyboard shortcut registry, available throughout the authenticated app. Gained a generic, route-scoped command registry (S4-015) so a route like the Workbench can register its own commands only while it's active, without any pathname-matching special-casing.
- **Marketing landing page** — a real public page at `/` (hero, feature showcase, footer) rather than a redirect to the dashboard; adapts its call-to-action based on session state. Gained a visual pipeline diagram, a static curated Interactive Demo (reusing `OutputTabs`, lazily mounted only once scrolled into view), a "Built in the open" social-proof section, pricing tiers, and an FAQ accordion (S4-007).
- **Dark / light / system theme** — via `next-themes`, with a theme toggle in the app shell.
- **Toast notifications** — `sonner`-based feedback for async operations (generation status, project creation, errors, undoable generation deletion).

---

## 7. Development Principles

Principles observed as consistently applied throughout the codebase, and/or explicitly stated in `CLAUDE.md` and the project's own architecture documentation:

- **Strict type safety.** TypeScript strict mode; zero `any` usage found anywhere in the codebase.
- **Modular, boundary-enforced architecture.** UI is organized into `features/*` modules with a consistent internal shape (`components/hooks/types/actions/lib`); cross-module dependencies are restricted by an ESLint rule (`import/no-restricted-paths`), not left to convention alone.
- **Server Actions as the sole backend boundary.** All backend logic — auth, data mutation, AI generation — runs behind `"use server"` Server Actions; client code never calls Supabase or an AI provider directly. Client-side stores never call a Server Action, Supabase, or an AI provider directly either — that orchestration lives in a feature's `hooks/`/`actions/` layer.
- **Determinism where correctness matters.** Every schema compiler (`lib/compiler/*`) is a pure function with no network calls, no filesystem access, and no non-deterministic input — the same AST always produces byte-identical output, verified by dedicated determinism tests.
- **Prefer React Server Components.** Data-fetching page-composition components are async Server Components by default; `"use client"` is applied only where interactivity requires it.
- **Reusable, generic UI stays generic.** shadcn/ui primitives (`components/ui/*`) and cross-cutting providers are deliberately kept outside the feature-module system rather than owned by any one feature.
- **Minimal abstractions, scope discipline.** Documented refactors (e.g. the frontend modularization effort) explicitly deferred building anything without a current, real consumer — e.g., a considered "pipeline stepper" UI was rejected because no backend stage-event source exists to honestly drive it.
- **Accessibility as a first-class requirement.** Interactive elements built during feature work carry explicit `role`, `tabIndex`, keyboard handlers, and `aria-*` attributes (e.g. project cards: `role="button"`, `aria-pressed`, Enter/Space handling) rather than being click-only.
- **RLS as the sole authorization layer.** No application-layer ownership filtering is layered on top of Supabase Row Level Security — access control lives in one place.
- **Sprint-driven, incrementally verified development.** Work is scoped into small, independently-reviewable units (days/milestones), each gated on lint + typecheck + test + build passing before the next unit begins, per the project's own documented process (`docs/architecture/frontend-modularization.md`, `docs/planning/v0.7.1-roadmap.md`).
- **Explain frontend concepts via backend analogies** for the lead developer, per `CLAUDE.md` — a documented collaboration convention for this specific project, not a code-level principle.

---

## 8. Current Repository Status

As verified at Sprint 6 closure (task S6-008):

| Check | Status |
|---|---|
| Repository health | Healthy — Sprints 0/1/3A/4/5 established a clean, verified baseline; Sprint 6 added seven application-layer tasks (Retry, output quality, rate limiting, delete-account, touch targets, onboarding, closure) plus a DevOps-audit-only task (S6-002) on top of it, with no regressions, verified after every single task |
| Build (`npm run build`) | ✅ Passing — compiles successfully (Turbopack), all 12 routes generated, static/dynamic split unchanged from before Sprint 6 |
| TypeScript (`npm run typecheck`) | ✅ Passing — zero errors |
| Lint (`npm run lint`) | ✅ Passing — zero errors, zero warnings |
| Tests (`npm test`) | ✅ Passing — 347/347 tests across 45 files |
| Git working tree | Clean relative to `HEAD` — no unintended tracked-file changes |
| Sprint 0 | ✅ Complete — see `Sprint-00-Recovery.md` |
| Sprint 1 | ✅ Complete — S1-001 through S1-005 |
| Sprint 3A | ✅ Complete — spec QA pass over the Sprint 2/3 documentation suite |
| Sprint 4 | ✅ Complete — S4-001 through S4-017; see `Sprint-04-Closure.md` |
| Sprint 5 | ✅ Complete — S5-001 through S5-005; see `Sprint-05-Closure.md` |
| Sprint 6 | ✅ Complete — S6-001 through S6-008; see `Sprint-06-Closure.md` |

---

## 9. Known Risks

Updated at Sprint 6 closure to reflect what was resolved. Remaining items are inputs for future planning, not re-assessed or expanded here:

- ~~Unaddressed self-rated Critical tech debt (TD-003, TD-004)~~ — **Resolved, Sprint 1.**
- ~~TD-006 (history/navigation)~~ — **Resolved, Sprint 1.**
- **Documentation/continuity gap around "UX 2.0" — resolved by adoption.** Sprint 4 *is* the UX 2.0 implementation; the gap noted at Sprint 1 closure no longer applies now that the specs have a concrete, shipped implementation to point to.
- **CI does not run automatically, and the EC2/PM2 CD pipeline is non-functional** (new finding, S6-002 audit; TD-024). `project_ci.yml` is `workflow_dispatch`-only (no automatic push/PR verification); `project_cd.yml` targets a stale `develop/chirag` branch filter and deploys to EC2/PM2, which conflicts with Vercel as the now-confirmed production platform (AD-006). This is DevOps-owned infrastructure work, out of Sprint 6's application-developer scope — audited and documented (`docs/architecture/AD-006-deployment-strategy.md`), not fixed.
- **No Git↔Vercel auto-deploy integration** (TD-005) — still open, human-gated by design; now reaffirmed as the correct direction under AD-006's confirmed Vercel decision, not yet implemented.
- **Placeholder/test data visible in the production Supabase account** (TD-015) — still open, requires explicit sign-off before deletion.
- **Three prepared-but-not-applied database changes await human sign-off**: a Postgres trigger (S4-009), a `user_preferences` table (S4-010B), and — new this sprint — `check_authenticated_rate_limit()`/`generation_rate_limit_events` (S6-004) and `delete_own_account()` (S6-003/AD-005) — all written as reviewed, version-controlled SQL, deliberately never applied to any live database in this environment (no live Supabase credentials available).
- ~~Delete-account decision resolved (AD-005), implementation still pending~~ — **Implemented, Sprint 6 (S6-003).** `delete_own_account()`, `deleteAccountAction`, and the Account Settings confirmation dialog all now exist exactly per AD-005's recommendation. The SQL function itself still needs a live, non-production Supabase smoke test before being considered fully verified (AD-005's own disclosed gap; unchanged by this sprint, since no live credentials exist here either).
- **Multi-provider AI architecture exists, but only Gemini is usable today.** Anthropic and OpenAI are fully implemented and registered (S5-002/S5-003), and provider selection is centralized (S5-004: explicit choice → `DEFAULT_AI_PROVIDER` env var → Gemini) — but no `ANTHROPIC_API_KEY`/`OPENAI_API_KEY` has been provisioned in any environment, and no UI or account-level setting exists yet to let a user or operator actually choose a non-default provider.
- ~~Generator Failure Recovery is partially unimplemented (TD-022)~~ — **Resolved, Sprint 6 (S6-001).** A Retry action now exists on a failed generation, resubmitting the preserved prompt via the same path the Generate button uses. The spec's former "partial-streaming failure" bullet was removed rather than built, since it was already established as architecturally impossible given the one-atomic-call pipeline.
- **Two Workbench keyboard shortcuts from its own spec table were scoped out of S4-015** (TD-023, Sprint 4) — `Cmd/Ctrl+1..5` tab-jump and `Cmd/Ctrl+Shift+C` copy-current-tab; the underlying actions remain reachable via mouse/command palette.
- ~~Icon-only buttons don't meet the 44×44px touch-target minimum (TD-020)~~ — **Resolved, Sprint 6 (S6-006).** Every icon-only `Button` size variant now carries a 44px hit-slop pseudo-element; tightly-packed clusters (Output actions, Workbench generation nav, split-pane collapse chevrons, Mermaid zoom controls) had their gaps widened one step to reduce hit-slop overlap between neighbors. No live browser/pixel measurement was performed in this environment, disclosed rather than assumed.
- **Workbench Fullscreen Mode hides chrome instantly rather than with the spec's animated transition** (TD-021, Sprint 4) — found and deliberately not rushed during S4-016's accessibility audit; unchanged by Sprint 6.
- ~~No business-rule CHECK constraints beyond enum values (TD-010); blanket VARCHAR(255) for every string column (TD-009)~~ — **Resolved, Sprint 6 (S6-005).** Shared AI prompt guidance now asks for a non-negative CHECK constraint on obvious price/quantity/age-like columns and a realistic `maxLength` per string column; both compilers already supported CHECK constraints structurally, and `maxLength` is a new, optional, backwards-compatible AST field defaulting to 255 when unset.
- **Contrast (Design System 2.0 §11) was not verified with a real rendering/Lighthouse pass** — the automated accessibility suite added in S4-016 (jest-axe/axe-core) runs in jsdom, which never loads this app's actual compiled stylesheet. No authenticated Supabase session was available in this environment for a live browser pass either.
- **Live browser/interactive verification of S4-015's Workbench chrome was not performed** — same root cause (no authenticated session available in this environment).

The full, unabridged risk and issue inventory lives in `TECH_DEBT.md`; this section is a summary, not a replacement for it.

---

## 10. Current Sprint Summary

**Sprint 0 — Project Recovery: ✅ Complete.** Full detail in `Sprint-00-Recovery.md`.

**Sprint 1 — Product Development: ✅ Complete.** S1-001 (FK indexing) through S1-005 (closure). Full detail in this document's prior revisions and `TECH_DEBT.md`.

**Sprint 3A — Spec QA:** ✅ Complete. Validation pass over the Sprint 2 (Design System 2.0) and Sprint 3 (Product Experience Specifications) documentation suite, fixing objectively-correctable issues before implementation began.

**Sprint 4 — UX 2.0 Implementation: ✅ Complete.** Full detail in `Sprint-04-Closure.md`. Summary:
- **S4-001–S4-004** — Design System 2.0 tokens, semantic color wiring, sidebar icon updates, shared empty-state/error-state pattern components.
- **S4-005** — Sidebar breadcrumbs and a mobile nav drawer.
- **S4-006 / S4-006B** — Password reset flow, post-login redirect preservation, sign-out-all-sessions; and (deferred to just before S4-012, per **AD-004**) a non-redirecting `getSessionResult()` session-check helper, with `requireUser()` reimplemented on top of it with unchanged external behavior.
- **S4-007** — Landing page: visual pipeline, static Interactive Demo, social proof, pricing, FAQ.
- **S4-008 / S4-009** — Dashboard quick actions/search/filters/metrics; recency-based project ordering (plus a prepared-not-applied Postgres trigger).
- **S4-010 / S4-010B** — Full Account Settings screen: appearance, keyboard shortcuts reference, accessibility overrides, account management, and disabled billing/preferences/developer placeholders.
- **S4-011** — Prompt suggestion chips and a Templates picker.
- **S4-012** — Staged artifact reveal (an honest re-interpretation of "streaming," since the pipeline has no per-artifact latency to actually stream) and the `session-expired` recovery UI (AD-004's first real consumer).
- **S4-013** — Bundled "Export all" zip download (`fflate`) and undoable generation deletion (`useUndoableAction`).
- **S4-014** — Monaco Editor replaces the Prism-based code viewer, dynamic-imported, CDN-loaded core (Turbopack has no self-hosted-worker equivalent to the webpack plugin this would otherwise need).
- **S4-015** — Workbench Fullscreen Mode, a new generic route-scoped command-registry (`CommandRegistryProvider`), prev/next generation navigation, and per-project session-persisted layout state (active tab, split position, panel collapse, minimap choice).
- **S4-016** — Micro-interaction/accessibility audit: added this repo's first accessibility-testing tooling (`jest-axe`), found and fixed a real nested-interactive bug and a real product-wide missing `prefers-reduced-motion` media query, and disclosed two remaining gaps (TD-020, TD-021) rather than claiming full coverage.
- **S4-017** — This closure task: full CI-mirrored validation on the merged state, a code-level walkthrough of every `User-Journey-Maps.md` journey (surfacing and disclosing TD-022 and TD-023), and this document's own sync.

**Known residual gaps from Sprint 4, disclosed not hidden:** see `TECH_DEBT.md` TD-020 through TD-023, plus the two prepared-but-unapplied database changes. None blocked Sprint 4's own acceptance criteria; all were scoped as explicit follow-up work — the delete-account item was resolved (as a decision) in Sprint 5, see below.

**Sprint 5 — AI Provider Architecture: ✅ Complete.** Full detail in `Sprint-05-Closure.md`. Summary:
- **S5-001** — AI Architecture Foundation: `AIProviderAdapter` interface, provider-agnostic request/response types, an `AIProviderError` class hierarchy, `PromptBuilder`/`ResponseParser` abstractions, a `RetryStrategy` interface with an `ExponentialBackoffRetryStrategy` implementation, and an `AIProviderRegistry` (mirroring `CompilerRegistry`'s own convention) — the existing Gemini integration refactored onto all of it, no new external SDK added yet.
- **S5-002** — Two things: **AD-005** (`docs/architecture/AD-005-delete-account.md`), resolving the delete-account mechanism decision left open at Sprint 4 closure (hard delete via a `SECURITY DEFINER` function, leaning on the existing FK cascade chain — not yet implemented, a deliberate follow-up); and the **Anthropic provider**, implemented on S5-001's abstractions (structured output via a forced tool call, since Anthropic has no Gemini-equivalent JSON-schema response mode) with zero duplicated logic.
- **S5-003** — The **OpenAI provider** (structured output via `response_format: json_schema`), plus a real bug found and fixed while implementing it: OpenAI's SDK constructor throws immediately without an API key, unlike Gemini's/Anthropic's — since the registry constructs every registered provider on every generation, this would have crashed every generation in any environment without `OPENAI_API_KEY` set (every environment today). Fixed by making every provider's client lazily-constructed-and-cached, resolved inside `generateAST()` rather than at registration time — an implementation-timing fix, not an architecture change.
- **S5-004** — Centralized provider selection: a new `resolveAIProvider()` (`lib/ai/provider-resolver.ts`) implementing the accepted routing policy (explicit caller choice → `DEFAULT_AI_PROVIDER` env var → Gemini fallback), with `AIProviderRegistry` simplified to a pure name→instance lookup table (its own prior "default provider" tracking removed, since that decision now lives in exactly one place). `generation.service.ts`'s public API stayed backwards compatible throughout.
- **S5-005** — This closure task: full validation on the merged state, `TECH_DEBT.md`/this document's own sync, and `Sprint-05-Closure.md`.

**Known residual gaps from Sprint 5, disclosed not hidden:** delete-account was a resolved *decision* (AD-005) with no implementation at the time — closed in Sprint 6, see below; Anthropic/OpenAI are registered but unusable without their API keys provisioned and remain non-default by design; see §9 for the full list. None blocked Sprint 5's own acceptance criteria.

**Sprint 6 — Product Hardening & First-Run Experience: ✅ Complete.** Full detail in `Sprint-06-Closure.md`. Summary:
- **S6-002** — Deployment-strategy audit. Per this sprint's ownership rules (`.github/workflows/*` and other infrastructure/CI-CD/production-deployment configuration belong to a DevOps owner, not this execution role), no workflow or infra files were changed. Instead: audited and documented two real findings — `project_ci.yml` has no automatic push/PR trigger (manual `workflow_dispatch` only), and `project_cd.yml` is non-functional (targets a stale `develop/chirag` branch filter) and conflicts with Vercel as the now-confirmed production platform. Recorded in `docs/architecture/AD-006-deployment-strategy.md` and `TECH_DEBT.md` TD-024, with concrete recommended DevOps actions.
- **S6-001** — Generator Retry: a real Retry action on a failed generation, wired to the exact same submission path the Generate button already uses (no new submission logic, no store changes). Corrected the Generator spec's "partial-streaming failure" bullet, already established as architecturally impossible, rather than leaving it aspirational (closes TD-022).
- **S6-005** — Schema output quality: an optional `maxLength` field on `ColumnNode` (backwards compatible, defaults to 255) for realistic `VARCHAR`/`varchar` sizing, plus shared AI prompt guidance asking for a non-negative `CHECK` constraint on obvious price/quantity/age-like columns — the AST/compilers already fully supported table-level CHECK constraints; the actual gap was prompt guidance, not architecture (closes TD-009/TD-010).
- **S6-004** — Authenticated-user generation rate limiting: 60/hour, burst 10/minute, via a new `check_authenticated_rate_limit()` `SECURITY DEFINER` function reusing the public sandbox's proven `pg_advisory_xact_lock` check-then-act pattern (keyed by `user_id` instead of `ip_hash`, enforcing both windows in one call). Fails closed if the limiter is unreachable. Prepared but not applied to any live database.
- **S6-003** — Delete-account implementation, executing AD-005's already-accepted recommendation exactly: `delete_own_account()` (`SECURITY DEFINER`, scoped to `auth.uid()`, cascades via the existing FK chain), `deleteAccountAction`, and a high-friction confirmation dialog (type the account's email or the word "delete") in Account Settings.
- **S6-006** — Icon-only button touch-target fix: a 44×44px `::before` hit-slop pseudo-element added to all four icon-only `Button` size variants in one shared place (reaching every consumer at once), plus a spacing bump in every tightly-packed icon-button cluster found during the audit, to reduce hit-slop overlap between neighbors (closes TD-020).
- **S6-007** — First-run onboarding: a dismissible Dashboard card (example prompts reusing the Generator's own `PromptSuggestions`, a templates entry point, a "Generate your first schema" CTA, a documentation link) — a single static card, not a guided tour, per the Generator spec's own "training wheels that never come off" principle. Cookie-backed dismissal, same guaranteed pattern as the existing accessibility-preferences cookie; auto-dismisses on a user's first successful generation as well as on explicit dismiss.
- **S6-008** — This closure task: full validation on the merged state, `TECH_DEBT.md`/this document's own sync, and `Sprint-06-Closure.md`.

**Known residual gaps from Sprint 6, disclosed not hidden:** the deployment-target ambiguity found in S6-002's audit is real and unresolved (DevOps-owned, out of this sprint's scope); the two new prepared-but-unapplied SQL functions (S6-003, S6-004) still need a live, non-production Supabase smoke test before being considered fully verified; no live browser/pixel verification of the S6-006 touch-target fix was performed. See §9 for the full list. None block Sprint 6's own acceptance criteria.

**Sprint 7 has not begun.** Per this Sprint 6 execution's own standing instructions, no Sprint 7 scope is started or implied by anything in this document.

**Remaining open work (not part of Sprint 1, not newly invented here):** `docs/planning/v0.7.1-roadmap.md` Milestone 4 (Git↔Vercel integration, production data cleanup — human-gated) and the rest of Milestone 5 (native `ENUM` reconsideration, composite FK physical constraints, CSP headers) — CHECK-constraint prompt guidance and VARCHAR sizing, also originally listed under Milestone 5, are now closed (S6-005).
