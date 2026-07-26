# SchemaCraft AI — Master Context

**Status:** Authoritative project reference. Describes the repository as it exists today.
**Last verified:** 2026-07-26, at Sprint 4 closure (S4-017), branch `feature/s4-016-a11y-audit` (linear descendant of `main`, no divergence).
**Maintenance rule:** Update this document whenever architecture, features, or repository structure change. If this document and the repository disagree, the repository is correct — file a doc-sync task rather than trusting this file blindly.

---

## 1. Executive Summary

- **Project name:** SchemaCraft AI
- **Product vision:** Turn a plain-English description of a data model into a complete, internally-consistent set of database artifacts — SQL DDL, a Drizzle ORM model, sample JSON, Markdown documentation, and a Mermaid ER diagram — generated from one deterministic pipeline so every artifact stays consistent with every other.
- **Current status:** Functioning product with a working end-to-end generation pipeline, authentication (including password reset and session-expiration recovery), project/generation persistence, generation history/navigation with undoable delete, a full Account Settings screen, a Monaco-powered Workbench (fullscreen mode, route-scoped command palette commands, prev/next generation nav, session-persisted layout state), and a public marketing site with an unauthenticated demo sandbox and a richer set of landing sections. Every generated schema still includes FK-column indexes and a join-table uniqueness warning where applicable. Repository builds, typechecks, lints, and tests clean as of the last verification (Sprint 4, task S4-017).
- **Current milestone:** Sprint 4 — UX 2.0 Implementation, complete (S4-001 through S4-017: design tokens through Monaco integration, Workbench chrome, an accessibility audit pass, and this closure task). Sprint 3A (spec QA) and Sprint 1 (S1-001 through S1-005) completed prior. Sprint 0 (Project Recovery) completed before that. Version `0.7.1` per `package.json`.

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
| AI provider | Google Gemini (`@google/genai`), model alias `gemini-flash-latest` | `lib/ai/client.ts`, `lib/ai/providers/gemini.ts` |
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
| Testing | Vitest | `test/`, `**/*.test.ts`/`**/*.test.tsx` (280 tests, 33 files, two-project config: `node` + `jsdom`-backed `dom`) |
| Accessibility testing | `jest-axe` (axe-core, S4-016) | `vitest.setup.dom.ts` (matcher registration), `test/a11y.test.tsx` — structural/ARIA checks only; color-contrast is not evaluated in jsdom (no compiled stylesheet loaded into these unit tests) |
| CI | GitHub Actions | `.github/workflows/ci.yml` |
| Hosting | Vercel | `.vercel/project.json`; deploys currently manual (`vercel --prod`) — no Git↔Vercel auto-deploy integration is configured |

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
                           session-expired, S4-006B/AD-004)
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
                           account (email/password/sign-out-all-sessions),
                           billing/preferences/developer (genuinely disabled
                           placeholders, no backend yet)
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
  actions/                 Server Action boundary ("use server") — auth,
                           project/generation CRUD, schema generation,
                           account preferences (S4-010B)
  services/                generation.service.ts — pipeline orchestrator
  ai/                       Gemini client + provider adapter + prompt builder
  ast/                      Canonical Schema AST: Zod schema, types, structural
                           validator, semantic analyzer
  compiler/                 5 independent compilers (SQL, Drizzle, JSON,
                           Markdown, Mermaid) + shared helpers + registry
  repositories/             RLS-backed Supabase data access (projects, generations)
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

supabase/               Row Level Security policies (rls.sql) and the
                         handle_new_user signup trigger (triggers.sql)

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
                         session-expiration ADR, Sprint 5 AST design doc),
                         planning/ (roadmaps + release log), specifications/
                         (Sprint 3 UX 2.0 spec suite), screenshots/

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
  .env.example             documents the 4 required environment variables
```

---

## 5. Architecture Overview

**Routing.** App Router with two route groups: `app/(auth)/` (`login/page.tsx`, `signup/page.tsx`, `reset-password/page.tsx`, `reset-password/confirm/page.tsx` — S4-006, shared layout) and `app/(dashboard)/` (`dashboard/page.tsx`, `dashboard/generator/page.tsx`, `dashboard/settings/page.tsx` — Account Settings, S4-010, `dashboard/projects/[id]/workbench/page.tsx`, `dashboard/projects/[id]/settings/page.tsx`, `dashboard/projects/[id]/history/page.tsx`, shared layout). `app/page.tsx` is the public marketing landing page (not a redirect). Confirmed current build output includes 12 routes total: `/`, `/_not-found`, `/dashboard`, `/dashboard/generator`, `/dashboard/settings`, `/dashboard/projects/[id]/history`, `/dashboard/projects/[id]/settings`, `/dashboard/projects/[id]/workbench`, `/login`, `/reset-password`, `/reset-password/confirm`, `/signup`.

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

**Authentication.** Supabase Auth via `@supabase/ssr`. Session-cookie handling is split across `lib/supabase/{client,server,middleware}.ts`. Route protection is enforced twice (defense in depth): the Next.js 16 root proxy (`proxy.ts` → `lib/supabase/middleware.ts::updateSession`) redirects unauthenticated requests to `/dashboard*` to `/login`, and redirects authenticated requests to `/login`/`/signup` to `/dashboard`; independently, `app/(dashboard)/layout.tsx` calls `requireUser()` as a second gate. Password reset (`/reset-password`, `/reset-password/confirm`) and sign-out-all-sessions (Account Settings) added Sprint 4 (S4-006). `requireUser()` itself is now implemented on top of a new, non-redirecting `getSessionResult()` helper (`lib/auth/session-result.ts`, AD-004/S4-006B) — `requireUser()`'s own external behavior (redirect to `/login` on an expired/missing session) is unchanged; `getSessionResult()` exists so a Server Action (`generate-schema.ts`) can instead surface a `{status:"SESSION_EXPIRED"}` result the UI recovers from in place, without navigating the user away mid-generation.

**Authorization.** Row Level Security (RLS) in Supabase is the sole authorization mechanism — every table has explicit SELECT/INSERT/UPDATE/DELETE policies keyed on `auth.uid()`, with no application-layer ownership filtering. Runtime data access always goes through the authenticated Supabase Server Client, never raw Drizzle queries, specifically so RLS policies see the real authenticated user.

**Shared utilities.** `lib/utils.ts`, `lib/download.ts` (generic, output-agnostic — used by the Workbench but deliberately kept in the shared `lib` layer, not feature-owned), `hooks/use-copy-to-clipboard.ts`, `hooks/use-mobile.ts`, `types/ui.ts` (shared UI types consumed by `lib/stores/ui-store.ts` across features).

**State management.** Four Zustand stores (`lib/stores/`): `ui-store.ts` (cross-cutting UI chrome state, e.g. active output tab), `generation-store.ts` (prompt draft + generation status union, including the `session-expired` variant), `project-store.ts` (project list + current selection, shared between the AI Workspace and Projects modules), and `workbench-store.ts` (S4-015 — Workbench fullscreen flag plus per-project active tab/panel-collapse/split-size/minimap-override state, the first store to use `zustand/middleware`'s `persist`, backed by `sessionStorage` and keyed per project id so it matches "for the session," not indefinitely). Rule enforced by convention (verified by inspection, not tooling): a store never calls a Server Action, Supabase, or Gemini directly — only pure state and state transitions.

---

## 6. Current Features

Features confirmed implemented and reachable in the current codebase:

- **Natural-language schema generation** — authenticated users describe a data model in plain English and receive SQL DDL, a Drizzle ORM model, sample JSON, Markdown documentation, and a Mermaid ER diagram from one generation. Prompt Suggestions chips and a Templates picker (S4-011) help a user with a blank field get started; a staged reveal (S4-012) paces the five completion indicators honestly (the data is already fully present the instant it mounts — see `Generator-Experience-Specification.md` §Streaming Generation's implementation note).
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

As verified at Sprint 4 closure (task S4-017):

| Check | Status |
|---|---|
| Repository health | Healthy — Sprints 0/1/3A established a clean baseline; Sprint 4 shipped 17 tasks on top of it (design tokens through Monaco integration, Workbench chrome, an accessibility audit) with no regressions, verified after every single task, not just at the end |
| Build (`npm run build`) | ✅ Passing — compiles successfully (Turbopack), all 12 routes generated, static/dynamic split unchanged from before Sprint 4 |
| TypeScript (`npm run typecheck`) | ✅ Passing — zero errors |
| Lint (`npm run lint`) | ✅ Passing — zero errors, zero warnings |
| Tests (`npm test`) | ✅ Passing — 280/280 tests across 33 files |
| Git working tree | Clean relative to `HEAD` — no unintended tracked-file changes |
| Sprint 0 | ✅ Complete — see `Sprint-00-Recovery.md` |
| Sprint 1 | ✅ Complete — S1-001 through S1-005 |
| Sprint 3A | ✅ Complete — spec QA pass over the Sprint 2/3 documentation suite |
| Sprint 4 | ✅ Complete — S4-001 through S4-017; see `Sprint-04-Closure.md` |

---

## 9. Known Risks

Updated at Sprint 4 closure to reflect what was resolved. Remaining items are inputs for future planning, not re-assessed or expanded here:

- ~~Unaddressed self-rated Critical tech debt (TD-003, TD-004)~~ — **Resolved, Sprint 1.**
- ~~TD-006 (history/navigation)~~ — **Resolved, Sprint 1.**
- **Documentation/continuity gap around "UX 2.0" — resolved by adoption.** Sprint 4 *is* the UX 2.0 implementation (the design system, product-experience specs, and this roadmap all trace back to that initiative); the gap noted at Sprint 1 closure no longer applies in the same way now that the specs have a concrete, shipped implementation to point to.
- **No Git↔Vercel auto-deploy integration** (TD-005) — still open, human-gated by design; not part of Sprint 4's scope.
- **Placeholder/test data visible in the production Supabase account** (TD-015) — still open, requires explicit sign-off before deletion; not part of Sprint 4's scope.
- **Two prepared-but-not-applied database changes await human sign-off** (new, Sprint 4): a Postgres trigger (S4-009) and a `user_preferences` table (S4-010B) are both written as code (SQL/Drizzle) but deliberately never applied to any live database in this environment — no live Supabase credentials were available, and applying schema changes without explicit review was out of scope for an autonomous implementation pass.
- **Delete-account is not implemented** (new, Sprint 4) — Account Settings' Account section has no self-service delete-account action. Supabase Auth has no anon-key-callable self-delete method; implementing this needs either a service-role client or a `SECURITY DEFINER` Postgres function, which is an architectural decision deliberately left for explicit human sign-off rather than resolved unilaterally.
- **Generator Failure Recovery is partially unimplemented** (TD-022, new Sprint 4) — no Retry button exists on a failed generation yet (though the prompt is correctly preserved), and the spec's "partial-streaming failure" behavior is architecturally impossible given the one-atomic-call pipeline. Predates Sprint 4; surfaced by S4-017's journey walkthrough, not introduced by it.
- **Two Workbench keyboard shortcuts from its own spec table were scoped out of S4-015** (TD-023, new Sprint 4) — `Cmd/Ctrl+1..5` tab-jump and `Cmd/Ctrl+Shift+C` copy-current-tab; the underlying actions remain reachable via mouse/command palette.
- **Icon-only buttons don't meet the 44×44px touch-target minimum** (TD-020, new Sprint 4) and **Workbench Fullscreen Mode hides chrome instantly rather than with the spec's animated transition** (TD-021, new Sprint 4) — both found and deliberately not rushed during S4-016's accessibility audit; see `TECH_DEBT.md` for why each needs a dedicated follow-up rather than a quick patch.
- **Contrast (Design System 2.0 §11) was not verified with a real rendering/Lighthouse pass** — the automated accessibility suite added in S4-016 (jest-axe/axe-core) runs in jsdom, which never loads this app's actual compiled stylesheet, so it cannot evaluate real rendered contrast. No authenticated Supabase session was available in this environment for a live browser pass either.
- **Live browser/interactive verification of S4-015's Workbench chrome (drag-resize + collapse, fullscreen toggle, sessionStorage persistence across a real reload) was not performed** — same root cause (no authenticated session available in this environment); flagged for manual verification before merge in that task's own commit message.

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

**Known residual gaps, disclosed not hidden:** see §9 above and `TECH_DEBT.md` TD-020 through TD-023, plus the two prepared-but-unapplied database changes and the unresolved delete-account mechanism decision. None of these block Sprint 4's own acceptance criteria; all are scoped as explicit follow-up work.

**Sprint 5 has not begun.** Per this Sprint 4 execution's own standing instructions, no Sprint 5 scope is started or implied by anything in this document.

**Remaining open work (not part of Sprint 1, not newly invented here):** `docs/planning/v0.7.1-roadmap.md` Milestone 4 (Git↔Vercel integration, production data cleanup — human-gated) and the rest of Milestone 5 (native `ENUM` reconsideration, CHECK-constraint prompt guidance, composite FK physical constraints, VARCHAR sizing, CSP headers).
