# SchemaCraft AI — Master Context

**Status:** Authoritative project reference. Describes the repository as it exists today.
**Last verified:** 2026-07-26, against commit `1b42ac1` on branch `refactor/frontend-modularization-review` (post Sprint 1, S1-004).
**Maintenance rule:** Update this document whenever architecture, features, or repository structure change. If this document and the repository disagree, the repository is correct — file a doc-sync task rather than trusting this file blindly.

---

## 1. Executive Summary

- **Project name:** SchemaCraft AI
- **Product vision:** Turn a plain-English description of a data model into a complete, internally-consistent set of database artifacts — SQL DDL, a Drizzle ORM model, sample JSON, Markdown documentation, and a Mermaid ER diagram — generated from one deterministic pipeline so every artifact stays consistent with every other.
- **Current status:** Functioning product with a working end-to-end generation pipeline, authentication, project/generation persistence, generation history/navigation, and a public marketing site with an unauthenticated demo sandbox. Every generated schema now includes FK-column indexes and a join-table uniqueness warning where applicable. Repository builds, typechecks, lints, and tests clean as of the last verification (Sprint 1, task S1-004).
- **Current milestone:** Sprint 1 — Product Development, complete (S1-001 through S1-004: FK-column indexing, join-table uniqueness warning, Generation History UI, UX polish/dependency hygiene). Sprint 0 (Project Recovery) completed prior to Sprint 1. Version `0.7.1` per `package.json`.

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
| Icons | `lucide-react` | 23 files across the codebase |
| AI provider | Google Gemini (`@google/genai`), model alias `gemini-flash-latest` | `lib/ai/client.ts`, `lib/ai/providers/gemini.ts` |
| Database / Auth | Supabase (PostgreSQL + Row Level Security, `@supabase/ssr`, `@supabase/supabase-js`) | `lib/supabase/{client,server,middleware}.ts`, `lib/repositories/*`, `supabase/rls.sql`, `supabase/triggers.sql` |
| ORM (local tooling only) | Drizzle ORM / Drizzle Kit | `lib/db/{schema,relations,index}.ts`, `drizzle/migrations/*`, `drizzle.config.ts` — schema/migrations only, **not** used on the runtime request path (Supabase Server Client is used at runtime so Row Level Security policies see `auth.uid()`) |
| Diagrams | Mermaid | `lib/compiler/mermaid/*`, `features/workbench/components/mermaid-viewer.tsx`, `features/workbench/components/mermaid-canvas.tsx` (pan/zoom via `react-zoom-pan-pinch`) |
| State management | Zustand | `lib/stores/{ui,generation,project}-store.ts` |
| Forms/validation | Zod | AST schema (`lib/ast/schema.ts`), Server Action input validation |
| Notifications | `sonner` (toast) | 6 files, wired via `components/providers/toast-provider.tsx` |
| Code display | `prism-react-renderer` | `features/workbench/components/code-viewer.tsx` |
| Markdown rendering | `react-markdown` + `remark-gfm` | `features/workbench/components/markdown-viewer.tsx` |
| Command palette | `cmdk` | `features/shell/components/command-palette.tsx` |
| Testing | Vitest | `test/`, `**/*.test.ts` (192 tests, 12 files) |
| CI | GitHub Actions | `.github/workflows/ci.yml` |
| Hosting | Vercel | `.vercel/project.json`; deploys currently manual (`vercel --prod`) — no Git↔Vercel auto-deploy integration is configured |

---

## 4. Repository Structure

```
app/                    Next.js App Router routes
  (auth)/                 login/signup routes + shared auth layout
  (dashboard)/             authenticated app routes (see §5 for the route list)
  page.tsx, layout.tsx     root shell + public marketing landing page
  globals.css              Tailwind + design-token definitions

components/             Non-feature-owned UI
  auth/                    login/signup form components (client)
  dashboard/               thin page-composition components consumed by app/ routes
                           (dashboard-overview, generator-view, workbench-view,
                           project-settings-view, generation-history-view) —
                           each fetches server data and composes the real UI
                           from features/
  providers/               theme provider, toast provider
  ui/                      shadcn/ui primitives (button, card, dialog, select, ...)

features/               Feature modules — the primary unit of UI ownership
  shell/                   AppSidebar, TopNav, ThemeToggle, CommandPalette,
                           keyboard shortcut registry, nav-item config
  ai-workspace/            PromptEditor, SchemaGenerator, generation-triggering hook
  compiler/                Generation status display (idle/generating/error)
  workbench/               OutputTabs, CodeViewer, MarkdownViewer, MermaidViewer,
                           OutputActions, OutputSkeleton, split-pane canvas
  projects/                ProjectsPanel, ProjectCard, CreateProjectDialog
  landing/                 Public marketing page components (hero, sandbox,
                           feature showcase, nav, footer)
  settings/                Project Settings shell components (dialect/naming
                           selectors, currently backend-gated/disabled)
  history/                 Generation History list/item + delete confirmation,
                           backed by useDeleteGeneration (added Sprint 1, S1-003)

  Each module follows the same internal shape where populated:
  components/, hooks/, types/, actions/ (client callers of Server Actions),
  lib/ (feature-local pure helpers). Cross-feature imports are enforced by an
  ESLint `import/no-restricted-paths` rule in eslint.config.mjs, not just
  convention.

hooks/                  Shared, generic hooks not owned by any one feature
                         (use-copy-to-clipboard, use-mobile)

lib/                    Backend logic and shared non-UI code
  actions/                 Server Action boundary ("use server") — auth,
                           project/generation CRUD, schema generation
  services/                generation.service.ts — pipeline orchestrator
  ai/                       Gemini client + provider adapter + prompt builder
  ast/                      Canonical Schema AST: Zod schema, types, structural
                           validator, semantic analyzer
  compiler/                 5 independent compilers (SQL, Drizzle, JSON,
                           Markdown, Mermaid) + shared helpers + registry
  repositories/             RLS-backed Supabase data access (projects, generations)
  stores/                   Zustand client-side state (ui, generation, project)
  supabase/                 browser / server / middleware Supabase clients
  auth/                     auth helper functions (current-user, require-user)
  db/                       Drizzle schema/relations — local migration tooling only
  config.ts, download.ts, utils.ts   misc shared config/helpers

types/                  Shared TypeScript types
  schema.ts                GeneratedSchema — the persistence/API contract
  ui.ts                    UI-only shared types

public/                 Static assets — currently the default create-next-app
                         placeholder SVGs (file, globe, next, vercel, window);
                         no product-specific static assets yet

supabase/               Row Level Security policies (rls.sql) and the
                         handle_new_user signup trigger (triggers.sql)

drizzle/                Generated SQL migrations + Drizzle Kit metadata

test/                   Top-level test files (smoke test proving the Vitest
                         harness resolves the @/* alias and react-server
                         condition); most tests are colocated *.test.ts
                         files next to their source

docs/                   architecture/ (frontend-modularization log, Sprint 5
                         AST design doc), planning/ (v0.7.1 roadmap + release
                         log), screenshots/

scripts/                apply-supabase-sql.mjs — applies raw SQL to Supabase

Configuration files (repo root):
  package.json            scripts, dependencies
  tsconfig.json            strict TypeScript config, @/* path alias
  eslint.config.mjs        ESLint + feature-module boundary enforcement
  next.config.ts           Next.js config (default scaffold, no custom options)
  components.json          shadcn/ui CLI configuration
  drizzle.config.ts        Drizzle Kit config (local migrations, reads DATABASE_URL)
  vitest.config.ts         Vitest configuration
  postcss.config.mjs       Tailwind/PostCSS pipeline
  proxy.ts                 Next.js 16 root proxy — auth route protection
  .env.example             documents the 4 required environment variables
```

---

## 5. Architecture Overview

**Routing.** App Router with two route groups: `app/(auth)/` (`login/page.tsx`, `signup/page.tsx`, shared layout) and `app/(dashboard)/` (`dashboard/page.tsx`, `dashboard/generator/page.tsx`, `dashboard/projects/[id]/workbench/page.tsx`, `dashboard/projects/[id]/settings/page.tsx`, `dashboard/projects/[id]/history/page.tsx`, shared layout). `app/page.tsx` is the public marketing landing page (not a redirect). Confirmed current build output includes 9 routes total: `/`, `/_not-found`, `/dashboard`, `/dashboard/generator`, `/dashboard/projects/[id]/history`, `/dashboard/projects/[id]/settings`, `/dashboard/projects/[id]/workbench`, `/login`, `/signup`.

**Layouts.** `app/layout.tsx` is the root shell. `app/(dashboard)/layout.tsx` calls `requireUser()` (an auth gate) and composes `AppSidebar` + `TopNav` + `CommandPalette` + `KeyboardShortcutProvider` around a scrollable main content area. `app/(auth)/layout.tsx` wraps the login/signup pages.

**Component hierarchy.** App routes are thin — each `page.tsx` renders one `components/dashboard/*-view.tsx` composition component, which fetches server data (via a Server Action) and passes it into the relevant `features/*` module's components. Generic, non-business UI (`components/ui/*` shadcn primitives, `components/providers/*`) sits outside the feature-module system since it isn't tied to one feature.

**Client/server boundaries.** Page-composition components (`components/dashboard/*`) and layouts are async Server Components that fetch data directly. Interactive components (forms, the schema generator, output viewers) are explicitly marked `"use client"`. Server Actions (`lib/actions/*.ts`, `"use server"`) are the sole boundary between client interaction and backend logic — feature-local `hooks/`/`actions/` folders hold client-side orchestration (calling a Server Action, then pushing the result into a Zustand store), never business logic itself.

**Server Actions.** `lib/actions/auth.ts` (signUp/signIn/signOut), `lib/actions/project.actions.ts` (project CRUD), `lib/actions/generation.actions.ts` (fetch a generation/project's generations, plus `deleteGenerationAction` added Sprint 1), `lib/actions/generate-schema.ts` (authenticated schema generation — auth check, Zod validation, delegates to `lib/services/generation.service.ts`), `lib/actions/generate-schema-public.ts` (unauthenticated sandbox generation — rate-limited via a `check_sandbox_rate_limit` Supabase RPC, never persists data).

**The generation pipeline** (`lib/services/generation.service.ts`):
```
Prompt → Server Action (auth + Zod validation)
       → Gemini Provider (generates a Canonical Schema AST only)
       → Structural validation (lib/ast/validator.ts, Zod)
       → Semantic analysis (lib/ast/analyzer.ts — duplicate names, dangling
         FKs, unsafe expressions as errors; missing PK, reserved keywords,
         circular FKs as warnings)
       → Compiler Registry (lib/compiler) — 5 independent, pure compilers run
         against the same AST: SQL, Drizzle, JSON, Markdown, Mermaid
       → Persistence (lib/repositories/generation.repository.ts, Supabase insert)
       → UI renders all 5 output tabs
```

**Authentication.** Supabase Auth via `@supabase/ssr`. Session-cookie handling is split across `lib/supabase/{client,server,middleware}.ts`. Route protection is enforced twice (defense in depth): the Next.js 16 root proxy (`proxy.ts` → `lib/supabase/middleware.ts::updateSession`) redirects unauthenticated requests to `/dashboard*` to `/login`, and redirects authenticated requests to `/login`/`/signup` to `/dashboard`; independently, `app/(dashboard)/layout.tsx` calls `requireUser()` as a second gate.

**Authorization.** Row Level Security (RLS) in Supabase is the sole authorization mechanism — every table has explicit SELECT/INSERT/UPDATE/DELETE policies keyed on `auth.uid()`, with no application-layer ownership filtering. Runtime data access always goes through the authenticated Supabase Server Client, never raw Drizzle queries, specifically so RLS policies see the real authenticated user.

**Shared utilities.** `lib/utils.ts`, `lib/download.ts` (generic, output-agnostic — used by the Workbench but deliberately kept in the shared `lib` layer, not feature-owned), `hooks/use-copy-to-clipboard.ts`, `hooks/use-mobile.ts`, `types/ui.ts` (shared UI types consumed by `lib/stores/ui-store.ts` across features).

**State management.** Three Zustand stores (`lib/stores/`): `ui-store.ts` (cross-cutting UI chrome state, e.g. active output tab), `generation-store.ts` (prompt draft + generation status union), `project-store.ts` (project list + current selection, shared between the AI Workspace and Projects modules). Rule enforced by convention (verified by inspection, not tooling): a store never calls a Server Action, Supabase, or Gemini directly — only pure state and state transitions.

---

## 6. Current Features

Features confirmed implemented and reachable in the current codebase:

- **Natural-language schema generation** — authenticated users describe a data model in plain English and receive SQL DDL, a Drizzle ORM model, sample JSON, Markdown documentation, and a Mermaid ER diagram from one generation.
- **Public, unauthenticated demo sandbox** — a landing-page "try it now" flow (`features/landing/components/hero-sandbox.tsx`) that runs the same generation pipeline without persistence, rate-limited to 5 requests/hour per visitor (IP-hash-based, fails closed if the rate limiter is unreachable).
- **Project-based organization** — users create named projects; generations are saved under a project.
- **Generation persistence and retrieval** — generations are saved to Supabase; a per-project Developer Workbench route displays a project's latest generation by default, or a specific past generation via `?generation=<id>`.
- **Generation History** — a per-project route (`/dashboard/projects/[id]/history`, added Sprint 1) lists every past generation (newest first), opens any of them into the Workbench, and deletes one behind a confirmation dialog.
- **Developer Workbench** — resizable split-pane view of generation output, with a pan/zoom-capable Mermaid ER diagram viewer, a line-numbered code viewer, and per-artifact copy/download actions.
- **Authentication** — sign up, log in, log out via Supabase Auth; session-cookie based, protected routes enforced at both the middleware and layout level.
- **Dashboard** — authenticated home showing a user's projects as selectable, keyboard-accessible cards.
- **Dedicated Generator route** — a standalone `/dashboard/generator` page for the schema-generation workflow, separate from the dashboard's project list.
- **Project Settings shell** — a `/dashboard/projects/[id]/settings` route exposing SQL-dialect and naming-convention controls; both are genuinely disabled at the DOM level (not just visually), since the compiler layer currently only supports Postgres and snake_case output — the controls are shown to communicate future direction honestly, not hidden.
- **Command palette and keyboard shortcuts** — a `cmdk`-based command palette with a keyboard shortcut registry, available throughout the authenticated app.
- **Marketing landing page** — a real public page at `/` (hero, feature showcase, footer) rather than a redirect to the dashboard; adapts its call-to-action based on session state.
- **Dark / light / system theme** — via `next-themes`, with a theme toggle in the app shell.
- **Toast notifications** — `sonner`-based feedback for async operations (generation status, project creation, errors).

---

## 7. Development Principles

Principles observed as consistently applied throughout the codebase, and/or explicitly stated in `CLAUDE.md` and the project's own architecture documentation:

- **Strict type safety.** TypeScript strict mode; zero `any` usage found anywhere in the codebase.
- **Modular, boundary-enforced architecture.** UI is organized into `features/*` modules with a consistent internal shape (`components/hooks/types/actions/lib`); cross-module dependencies are restricted by an ESLint rule (`import/no-restricted-paths`), not left to convention alone.
- **Server Actions as the sole backend boundary.** All backend logic — auth, data mutation, AI generation — runs behind `"use server"` Server Actions; client code never calls Supabase or Gemini directly. Client-side stores never call a Server Action, Supabase, or Gemini directly either — that orchestration lives in a feature's `hooks/`/`actions/` layer.
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

As verified at Sprint 1 closure (task S1-005):

| Check | Status |
|---|---|
| Repository health | Healthy — Sprint 0 established a clean baseline; Sprint 1 shipped four implementation tasks on top of it with no regressions |
| Build (`npm run build`) | ✅ Passing — compiles successfully, all 9 routes generated |
| TypeScript (`npm run typecheck`) | ✅ Passing — zero errors |
| Lint (`npm run lint`) | ✅ Passing — zero errors, zero warnings |
| Tests (`npm test`) | ✅ Passing — 192/192 tests across 12 files |
| Git working tree | Clean relative to `HEAD` — no unintended tracked-file changes |
| Sprint 0 | ✅ Complete — see `Sprint-00-Recovery.md` |
| Sprint 1 | ✅ Complete — S1-001 (FK indexing), S1-002 (join-table warning), S1-003 (Generation History), S1-004 (UX polish/dependency hygiene), S1-005 (this closure pass) |

---

## 9. Known Risks

Updated at Sprint 1 closure to reflect what was resolved. Remaining items are inputs for future planning, not re-assessed or expanded here:

- ~~Unaddressed self-rated Critical tech debt (TD-003, TD-004)~~ — **Resolved, Sprint 1 (S1-001, S1-002).** Every generated schema now gets FK-column indexes and a join-table composite-uniqueness warning where applicable.
- ~~TD-006 (history/navigation, `deleteGeneration` unused)~~ — **Resolved, Sprint 1 (S1-003).** A full Generation History UI now exists; one disclosed gap remains — the two-account cross-user isolation test called for in `docs/planning/v0.7.1-roadmap.md` Milestone 3 was not performed live (see `TECH_DEBT.md` TD-006).
- ~~Minor unused/misplaced dependencies (`react-hook-form`, `shadcn`)~~ — **Resolved, Sprint 1 (S1-004).**
- **Documentation/continuity gap around "UX 2.0" — still open.** The nine-milestone "UX 2.0" initiative is documented in `docs/specifications/UX-2.0-Engineering-Specification.md` (recovered during Sprint 0), but the original "Engineering Spec" the code comments reference still does not exist anywhere in this repository. Unrelated to Sprint 1's scope.
- **No Git↔Vercel auto-deploy integration** (TD-005) — still open, human-gated by design; not part of Sprint 1's scope.
- **Placeholder/test data visible in the production Supabase account** (TD-015) — still open, requires explicit sign-off before deletion; not part of Sprint 1's scope. Note: Sprint 0's own live verification (S0-005) added one more throwaway test project to this same account.

The full, unabridged risk and issue inventory lives in `TECH_DEBT.md`; this section is a summary, not a replacement for it.

---

## 10. Current Sprint Summary

**Sprint 0 — Project Recovery: ✅ Complete.** Full detail in `Sprint-00-Recovery.md`. Established a verified engineering baseline (build/typecheck/lint/test clean), recovered/produced this document and `docs/specifications/UX-2.0-Engineering-Specification.md`, synchronized `ARCHITECTURE.md` and `TECH_DEBT.md`, and ran a full live runtime verification pass (S0-005) — zero blocking issues found.

**Sprint 1 — Product Development: ✅ Complete.**
- S1-001 — TD-003 Foreign Key Indexing: every relationship's source columns now get a supporting index in both SQL and Drizzle output.
- S1-002 — TD-004 Join-Table Composite Uniqueness Warning: a new analyzer warning flags join-table-shaped tables missing a uniqueness guarantee on their FK pair.
- S1-003 — TD-006 Generation History & Navigation UI: a new `/dashboard/projects/[id]/history` route (browse, open, delete past generations), closing the last gap in the already-existing repository/Server Action layer.
- S1-004 — UX Polish & Dependency Hygiene: TD-013 (prompt character counters), TD-018 (top-bar title fallback), TD-019 (signup email-confirmation messaging), and removal of an unused dependency plus relocation of a misplaced one.
- S1-005 — Sprint 1 Closure: this documentation-synchronization pass (`TECH_DEBT.md`, `docs/planning/v0.7.1-roadmap.md`, `CHANGELOG.md`, `docs/specifications/UX-2.0-Engineering-Specification.md`, this document).

**Known residual gap, disclosed not hidden:** the Milestone 3 (S1-003) acceptance criterion calling for an explicit two-account cross-user isolation test was not performed live — see `TECH_DEBT.md` TD-006 and `docs/planning/v0.7.1-roadmap.md` Milestone 3.

**Remaining open work (not part of Sprint 1, not newly invented here):** `docs/planning/v0.7.1-roadmap.md` Milestone 4 (Git↔Vercel integration, production data cleanup — human-gated) and the rest of Milestone 5 (native `ENUM` reconsideration, CHECK-constraint prompt guidance, composite FK physical constraints, VARCHAR sizing, CSP headers).
