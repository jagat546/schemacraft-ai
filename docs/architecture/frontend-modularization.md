# Frontend Modularization — Feature Modules & State Stores

Status: **Complete. All 7 days done.**

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
| `features/workbench` | `OutputTabs`, `CodeViewer`, `MarkdownViewer`, `MermaidViewer`, `OutputActions`, `OutputSkeleton`, `output-config.ts` | — |
| `features/projects` | `ProjectsPanel`, `ProjectCard` (now selectable, TD-016), `CreateProjectDialog` | Search, Favorites, any project detail page/route (none exists) |

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
  lib/          feature-local, non-component pure helpers/config with no
                consumer outside this module (added Day 5, see
                features/workbench/lib/output-config.ts) — not part of the
                original five-subfolder contract, extended because
                OUTPUT_CONFIG doesn't fit components/hooks/types/actions
                and has zero consumers outside Workbench
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

  **Regression caught and fixed during this milestone's verification, not
  a new Day 4 defect:** live browser testing (authenticated session, real
  reload) showed the project selector briefly display its "Select a
  project" placeholder before flipping to the correct default project.
  Root cause traced to Day 3: the pre-refactor code set the default
  selected project synchronously via a `useState(projects[0]?.id ?? null)`
  initializer; the refactored version moved that into `project-store`,
  populated by a `useEffect`, which runs one paint after the initializer
  would have. Fixed in `schema-generator.tsx` by falling back to
  `projects[0]?.id` synchronously during render whenever the store's
  `selectedProjectId` is still `null`, matching the original behavior
  exactly rather than waiting on the effect. Re-verified with three
  consecutive fresh reloads showing the correct project immediately, and
  the full lint/typecheck/test/build gate re-run clean afterward.
- **Day 5 — Developer Workbench.** ✅ Moved `OutputTabs`, `CodeViewer`,
  `MarkdownViewer`, `MermaidViewer`, `OutputActions`, and `OutputSkeleton`
  into `features/workbench/components/`, and `output-config.ts` into
  `features/workbench/lib/` (new subfolder — see above). Two candidates
  were deliberately **not** moved despite being Workbench's only current
  consumers: `lib/download.ts` (`downloadTextFile`) and
  `hooks/use-copy-to-clipboard.ts` are both generic, output-agnostic
  utilities with no dependency on `OUTPUT_CONFIG` or any output type —
  kept in the shared `lib`/`hooks` layers so a future feature can reuse
  them without an awkward cross-feature import back into Workbench.
  `types/ui.ts` (`OutputVariant`/`OutputLanguage`) also stayed shared:
  it's consumed by `ui-store` (Day 1), outside Workbench.

  `OutputTabs`' tab switching, previously uncontrolled Radix/Base UI
  state (`defaultValue="sql"`), is now wired to `ui-store`'s
  `activeOutputTab` — the field Day 1 created anticipating exactly this
  and that had gone unused through Days 2–4. This is consuming existing
  state, not introducing new state, per this milestone's instruction to
  continue using the existing stores.

  Cross-module import note: `features/compiler/components/
  generation-status.tsx` (Day 4) imports `OutputSkeleton` from
  `features/workbench` — a one-directional Compiler → Workbench
  dependency, the same pattern `features/ai-workspace` already has on
  both `features/compiler` and `features/workbench`. No cycle exists.

  No `TECH_DEBT.md` item touches any file moved or edited this day;
  none integrated.
- **Day 6 — Projects.** ✅ Moved `ProjectsPanel` into
  `features/projects/components/`, and split it into three pieces: the
  panel itself (composition + `project-store` hydration), the new
  `ProjectCard` (TD-016 fix, below), and `CreateProjectDialog`. Extracted
  the `createProjectAction` call and its dialog-state/toast/refresh side
  effects out of the panel into `features/projects/hooks/
  use-create-project.ts` — the same boundary as
  `use-generate-schema.ts` (Day 3). On success, the hook calls
  `project-store`'s `addProject` so the new project appears immediately
  without waiting for the `router.refresh()` round trip.

  **Integrated: TD-016** (project cards were non-interactive). Root
  cause: the click/select behavior was simply never wired up —
  `project-store` and the AI Workspace's dropdown reading from it already
  existed; the dashboard cards just never wrote to it. Fixed by making
  `ProjectCard` a real interactive element (`role="button"`, `tabIndex`,
  click/keyboard handlers, `aria-pressed`, a selected-state ring) that
  calls `selectProject(id)`. Deliberately scoped to *selection*, not
  navigation: there is no project detail page/route in this app, and
  building one would be new functionality outside this milestone, not a
  bug fix. Verified the resolved bug's specific symptom no longer holds:
  cards are keyboard-reachable, `aria-pressed` reflects state, and
  clicking one is visible immediately in the AI Workspace's own selector.

  Same synchronous-fallback pattern as the Day 4 regression fix applied
  here proactively (not reactively) in `ProjectsPanel`, computing
  `selectedProjectId` during render rather than waiting on the hydration
  effect — avoids reintroducing that flash for "no card highlighted for
  one frame" on a fresh load.

  Search and Favorites remain deferred (§ Scope decisions). No new route
  or project detail page was added.
- **Day 7 — Polish.** ✅ Final cleanup and stabilization pass, no new
  functionality.
  - Removed the empty `components/layout/` directory left over from Day
    2 (git doesn't track empty directories, but the filesystem still had
    it).
  - Removed `selectSelectedProject` from `project-store.ts` and its two
    dedicated tests — genuinely dead code: nothing in application code
    called it (only its own test did). Created in Day 1 anticipating a
    need that never materialized, since Days 3 and 6 both resolved a
    project's title inline instead.
  - Fixed a real, if latent, bug: `features/workbench/components/
    output-tabs.tsx` called `useUiStore` (a hook) but was missing its
    `"use client"` directive, added when the store wiring landed in Day
    5. It worked only because it's always rendered inside an
    already-client tree (`SchemaGenerator`) — a future import from a
    Server Component context would have failed. Added the directive.
  - Audited every feature file's client/server boundary; everything else
    was already correctly minimal — `PromptEditor`, `AppSidebar`,
    `TopNav`, and `OutputSkeleton` have no hooks and correctly carry no
    `"use client"`.
  - Confirmed the cross-feature dependency graph is acyclic:
    `ai-workspace → compiler, workbench`; `compiler → workbench`;
    `workbench` and `projects` have no outbound feature dependencies.
    Matches the documented module table exactly.
  - **TECH_DEBT.md sync:** TD-013's `Where:` path was stale
    (`components/dashboard/prompt-editor.tsx`, moved in Day 3) —
    corrected. TD-002 and TD-016 were already marked resolved in their
    own Day 3/6 entries; no other item needed updating.
  - **ARCHITECTURE.md sync:** rewrote the Folder Structure section to
    show `features/*` and `lib/stores/*` instead of the pre-refactor
    tree; updated the Frontend Modularization section from "in progress"
    to complete. Also corrected a pre-existing inaccuracy in the Testing
    Architecture section unrelated to this refactor: the compiler test
    count was listed as 138 (should be 91) and `test/smoke.test.ts`'s 2
    tests were omitted from the breakdown entirely, even though the
    stated 149-test total already silently included them — verified the
    real per-file counts directly against a test run rather than
    trusting the prior arithmetic.
  - **Scope note on the regression checklist's "browser refresh → previously
    selected project retained":** `project-store` and `ui-store` are
    plain in-memory Zustand stores with no persistence middleware, so a
    hard browser refresh always resets them — exactly matching
    pre-refactor behavior (the original `useState(projects[0]?.id ?? null)`
    initializer never persisted a selection across a reload either).
    Verified live: after a refresh, the app deterministically falls back
    to the most-recently-created project via the same synchronous
    fallback used throughout this refactor, with no flash and no error.
    Adding real cross-refresh persistence (e.g. `localStorage`) would be
    new functionality this milestone's brief explicitly excludes, not a
    bug fix — not implemented.
