# Frontend Modularization — Feature Modules & State Stores

Status: **In progress. Day 1 of 7 complete.**

This document records the scope and ground rules for an incremental
frontend refactor: reorganizing `components/dashboard` and
`components/layout` into five independently-owned feature modules under
`features/`, backed by three Zustand stores under `lib/stores/`. It exists
so each day's work starts from a written decision instead of re-deriving
scope mid-implementation, and so the next engineer (human or otherwise)
picking this up mid-week has the same context.

**This is a structural refactor, not a redesign.** No visual design
changes, no new backend behavior, no changes to the Canonical AST pipeline
(`lib/ast`, `lib/compiler`, `lib/services/generation.service.ts`) or the
Server Action boundary (`lib/actions`). See `ARCHITECTURE.md` for the
system this refactor sits on top of and does not change.

## Scope decisions (confirmed before Day 1 began)

1. **Reorg only, this pass.** The original brief's feature-boundary list
   included several elements with no current implementation and no
   existing spec: Command Palette, Status Bar, Prompt Templates, Prompt
   Enhancement, a Compiler Pipeline Stepper / Live Logs view, and
   Projects Search/Favorites. Building these would be new feature work,
   not a reorg, and no Product Vision / UX Specification document for
   them exists in this repository. They are explicitly **out of scope**
   for Days 1–7 below. Each day's section states exactly what's deferred
   and why.
2. **Overlapping tech debt gets folded in.** Where a day's work touches
   the same file(s) as an already-known, already-triaged bug in
   `TECH_DEBT.md`, fix it as part of that day rather than opening a
   second migration of the same component later. Confirmed overlaps:
   Day 6 (Projects) touches TD-016 (dashboard project cards are
   non-interactive). No other day currently overlaps a tracked debt item.
   **Correction (Day 3):** this list originally also assigned TD-002
   (project selector shows a raw UUID, not the project title) to Day 6.
   That was wrong — `TECH_DEBT.md` names TD-002's location as
   `components/dashboard/schema-generator.tsx`, which is Day 3 (AI
   Workspace) territory, not Day 6. Reassigned and fixed on Day 3; see
   the Day 3 log entry below.
3. **Checkpoint after every day.** Each day must build, lint, and pass
   the existing 149-test suite, and existing functionality must be
   verified intact, before it's committed — and before the next day
   starts. Day 1 stops here for explicit sign-off before Day 2 begins.

## Module boundaries

| Module | Owns (this refactor) | Explicitly deferred |
|---|---|---|
| `features/shell` | `AppSidebar`, `TopNav` | Command Palette, Status Bar |
| `features/ai-workspace` | `PromptEditor`, the generation-triggering part of `SchemaGenerator` | Prompt Templates, Prompt Enhancement |
| `features/compiler` | The generation status display (`GenerationStatus`: idle / generating / error) | Pipeline Stepper, Live Logs, per-stage progress, any "compiler status" indicator finer-grained than idle/generating/error — there is no backend event stream to visualize; the pipeline (§7 of `ARCHITECTURE.md`) currently returns one final result, not intermediate stage events. Confirmed again on Day 4: no `v0.8.0` architecture document exists in this repo to define one, and building a real stage-by-stage indicator would require backend instrumentation, which is out of scope. A simulated/fake stepper was considered and rejected — it would show stages that aren't actually happening. |
| `features/workbench` | `OutputTabs`, `CodeViewer`, `MarkdownViewer`, `MermaidViewer` | — |
| `features/projects` | `ProjectsPanel` | Search, Favorites |

`components/ui/*` (shadcn primitives) and `components/providers/*`
(theme/toast) are not feature-owned and stay where they are — they're
generic UI infrastructure, not business components tied to one module.

Each module, once it has real content, follows the same internal shape:

```
features/<module>/
  components/   presentational + light container components
  hooks/        feature-specific hooks (state wiring, derived values)
  types/        module-local types not shared elsewhere
  actions/      thin client-side orchestration that calls lib/actions
                Server Actions and pushes results into a store —
                never business logic itself, never a direct fetch/DB call
  tests/        colocated *.test.ts(x), matching the project's existing
                convention (see lib/ast/*.test.ts, lib/compiler/**/*.test.ts)
```

`lib/actions/*.ts` (the `"use server"` boundary) is not moved into feature
folders — per "preserve the existing backend architecture," that boundary
stays exactly where `ARCHITECTURE.md` and `CLAUDE.md` document it. A
feature's `actions/` folder holds client-side callers of those Server
Actions, not the Server Actions themselves.

## State stores (`lib/stores/`)

Three stores, each a direct extraction of state that already exists today
as local `useState` inside a component — Day 1 makes it explicit and
testable without changing behavior yet:

- **`ui-store.ts`** — cross-cutting UI chrome state not already owned by
  another provider (sidebar collapse state belongs to
  `components/ui/sidebar`'s own `SidebarProvider`; theme belongs to
  `next-themes`). Currently holds one field, `activeOutputTab`, extracted
  from `OutputTabs`' previously-uncontrolled `defaultValue="sql"`.
- **`generation-store.ts`** — the prompt draft and the `GenerationState`
  union, extracted verbatim from `components/dashboard/schema-generator.tsx`.
- **`project-store.ts`** — the project list and current selection, shared
  between the AI Workspace (which project a generation targets) and the
  Projects module (which project is open). The server (via
  `getProjectsAction`, RLS-scoped) remains the source of truth for the
  list; this store is a client-side mirror a feature hook hydrates from
  server-rendered props, not an independent fetcher.

**Rule for all three stores, enforced by review on every later day:** a
store never calls a Server Action, Supabase, or Gemini directly. Stores
hold state and pure state transitions only. Orchestration (calling
`lib/actions/*`, then pushing the result into a store) lives in a
feature's `hooks/`/`actions/` layer — this is what "no business logic
inside React components" and "no API calls inside UI components" actually
means in practice: the call moves out of the `.tsx` file, not into the
store either.

## Day-by-day log

- **Day 1 — Workspace Foundation.** ✅ Added `zustand`; created the three
  stores above with colocated tests (all passing); wrote this document.
  No component moved, no behavior changed — `npm run build`, `npm run
  lint`, and `npm test` all verified clean before and after.
- **Day 2 — Navigation.** ✅ Moved `AppSidebar`, `TopNav`, and
  `ThemeToggle` from `components/layout/` into `features/shell/components/`
  (via `git mv`, preserving history) and updated the two import sites
  (`app/dashboard/layout.tsx`, `top-nav.tsx`'s own import of
  `ThemeToggle`). No `hooks/`, `types/`, or `actions/` subfolder was
  created for this module — deliberately, not an oversight: `AppSidebar`
  is static presentational markup, `TopNav` is an async Server Component
  doing idiomatic direct data-fetching (`getCurrentUser()`, the pattern
  `CLAUDE.md` explicitly prefers), and `ThemeToggle` only calls
  `next-themes`' own `useTheme()` hook directly — none of that is
  "business logic in a component" in the sense the architecture rules
  mean; it's framework-idiomatic RSC/hook usage with nothing to extract.
  Command Palette and Status Bar remain deferred (§ Scope decisions).
  Sign-out stays a native `<form action={signOut}>` — Next.js's own
  zero-JS mutation pattern — rather than being wrapped in an artificial
  client hook. No `TECH_DEBT.md` item touches `app-sidebar.tsx`,
  `top-nav.tsx`, or `theme-toggle.tsx`; none were integrated this day.
- **Day 3 — AI Workspace.** ✅ Moved `PromptEditor` and `SchemaGenerator`
  into `features/ai-workspace/components/`. Extracted the
  `generateSchema` Server Action call and its transition/toast side
  effects into `features/ai-workspace/hooks/use-generate-schema.ts` — the
  component no longer calls a Server Action or holds generation state
  directly; it reads/writes `generation-store` and `project-store`
  through the hook and the stores' own hooks. `SchemaGenerator` now
  hydrates `project-store` from its server-fetched `projects` prop via a
  `useEffect` (documented in the store's own file as the intended
  pattern). **Integrated: TD-002** (see correction above) — the project
  selector's `SelectValue` showed the raw project UUID instead of its
  title on initial load. Root cause, verified against
  `@base-ui/react`'s own source and its documented `Select.Value`
  children-render-prop example: the trigger's label resolves by matching
  the current value against items *registered by mounted `SelectItem`s*;
  the initial value is set programmatically (the first project,
  auto-selected before the popup is ever opened), so no item is
  registered yet and it falls back to stringifying the raw value. Fixed
  with an explicit `children` resolver on `SelectValue` that looks the
  title up directly from the `projects` array — Base UI's own documented
  pattern for this exact case, not a workaround. Prompt Templates and
  Prompt Enhancement remain deferred (§ Scope decisions).
- **Day 4 — Compiler Experience.** ✅ Extracted the generating/idle/error
  status display out of `SchemaGenerator` into
  `features/compiler/components/generation-status.tsx`, reading
  `generation-store` directly (it's the single source of truth; the
  component holds no local state of its own — there's nothing feature-
  local to hold). No `hooks/`/`types/`/`actions/` subfolder: there's no
  orchestration here, only derived rendering. Scope was clarified before
  implementation: "Pipeline visualization" / "Progress display" /
  "compiler status" from the Day 4 brief were interpreted as the reorg of
  the three states that already exist (idle/generating/error), not a new
  multi-stage pipeline stepper — confirmed with the requester, since no
  backend stage-event source exists to drive a real one and a simulated
  one would misrepresent actual progress. No `TECH_DEBT.md` item touches
  this display logic; none integrated this day.
- **Day 5 — Developer Workbench.** Not started.
- **Day 6 — Projects.** Not started.
- **Day 7 — Polish.** Not started.
