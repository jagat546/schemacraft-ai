# SchemaCraft AI — UX 2.0 Engineering Specification (Recovered)

**Status:** Recovered documentation, Sprint 0 (task S0-003). This document was reconstructed from the implemented codebase — commit history, source files, and code comments — because the original "Engineering Spec" referenced throughout commit messages and code comments (e.g. `app/globals.css:50`, `lib/actions/generate-schema-public.ts:10`) does not exist anywhere in this repository. It is not a re-creation of that lost document; it is a factual record of what UX 2.0 actually built, derived from the code as it exists today.

**Scope of "UX 2.0":** commits `dab289f` through `92a3592` on `refactor/frontend-modularization-review` (9 milestones, M1–M9), following the earlier "frontend modularization" refactor (Day 1–7) that established the `features/*` module structure UX 2.0 built on top of.

**Source basis:** every claim below is backed by a specific file read during this task. Where the implementation itself references an "Engineering Spec" section number in a code comment, that reference is quoted as-is — it documents that a numbered spec existed, not what it said beyond what the surrounding code demonstrates.

---

## 1. Purpose

UX 2.0 exists to take the product from a functional single-page generator (prompt in, tabs of output, one dashboard) to a navigable, multi-surface application: a real marketing front door, a keyboard-driven command interface, a dedicated workspace for reviewing generated output, and the first UI surface for the public (unauthenticated) demo. Evidence for this purpose, drawn directly from what was built:

- A dashboard that previously had no distinct routes for "generate" vs. "browse projects" gained a dedicated `/dashboard/generator` route (M3 Phase 3A) and a route group restructuring, separating the project list from the generation workflow.
- The public root (`/`) previously redirected straight to `/dashboard` (per `docs/architecture/frontend-modularization.md`'s own account of pre-UX-2.0 behavior); M7 replaced that with a real marketing page.
- A `check_sandbox_rate_limit` Supabase RPC and `sandbox_generations` table (present in `drizzle/migrations/0001_high_blacklash.sql` and `supabase/rls.sql`) were added specifically to support M9's unauthenticated sandbox — infrastructure with no purpose outside this initiative.
- A design-token layer (`app/globals.css`) was introduced ahead of the visual work, establishing `--surface-*`, `--text-*`, `--accent-*`, and a typography scale as the first commit in the sequence (M1) — visual/product surfaces were built on top of it, not the reverse.

---

## 2. Design Goals

Implemented goals, inferred from what the code actually does (not from a lost planning document):

- **A token-based design system, not ad hoc styling.** `app/globals.css` defines a full light/dark token set (`--surface-0..3`, `--border-subtle`/`--border-strong`, `--text-primary/secondary/muted`, four theme-invariant accent colors, a typography scale, and motion tokens) mapped onto shadcn's semantic color variables, rather than components hardcoding colors directly.
- **Keyboard-first navigation.** A centralized `KeyboardShortcutProvider` (single app-wide `keydown` listener, explicit registry) backs a `Cmd/Ctrl+K` command palette reachable from anywhere in the authenticated app — stated directly in the provider's own code comment as a fix for "shortcut conflicts" from "ad hoc `addEventListener` calls scattered per component."
- **A real public-facing surface, not just an authenticated app.** The marketing page (`app/page.tsx`) adapts its call-to-action based on session state and includes a live, working demo (the sandbox) rather than static marketing copy alone.
- **Never a control that silently does nothing.** The Project Settings dialect/naming controls are implemented as genuinely `disabled` at the DOM level, explicitly labeled "Coming soon," rather than hidden or fake-interactive — stated directly in both components' code comments as a deliberate choice.
- **Mobile-aware layout, not desktop-only.** The Workbench's split-pane view stacks vertically on mobile instead of squeezing panes side by side (`SplitPaneCanvas`, using `useIsMobile()`).
- **Accessible-by-construction interactive elements.** Newly built interactive surfaces (project cards, the Mermaid pan/zoom canvas, the naming-convention toggle) carry explicit `role`, `tabIndex`, keyboard handlers, and `aria-*` attributes rather than being click-only — consistent across every UX 2.0 component read during this audit.
- **Defense against a specific injected-SVG risk.** `MermaidViewer` sets `securityLevel: "strict"` and disables Mermaid's own built-in error rendering, since the diagram source is model-generated and never syntax-validated server-side — a deliberate, commented security decision, not an oversight.

---

## 3. User Experience

Only implemented behavior is described below.

### Layouts
- **Marketing (`/`):** single-column flow — sticky/blurred nav, hero section (headline, CTA buttons, and for unauthenticated visitors, an inline sandbox), a five-card feature showcase grid, and a footer. `max-w-3xl` (hero) / `max-w-6xl` (showcase/footer) centered containers.
- **Authenticated app (`/dashboard/*`):** a collapsible icon-mode sidebar (`AppSidebar`, via shadcn's `Sidebar` primitive) + a fixed top bar (`TopNav`, route title, command-palette trigger, theme toggle, sign-out) + a scrollable main content area. The shell itself does not scroll (`h-svh overflow-hidden` on the outer container); only `<main>` scrolls.
- **Content pages** (Dashboard, Generator, Workbench, Settings) are each centered, `max-w-3xl`/`max-w-4xl` single-column layouts inside that shell — no page uses a wider multi-column layout.

### Navigation
- Sidebar links to two destinations: Dashboard and Generator (`features/shell/lib/nav-items.ts`, the single source of truth consumed by both the sidebar's active-state highlighting and the top bar's route title).
- Project-level navigation (Workbench, Settings) happens via icon links on each `ProjectCard`, not the sidebar — there is no sidebar entry for an individual project.
- The command palette (`Cmd/Ctrl+K`) duplicates the two sidebar destinations as searchable commands, adds theme switching (light/dark/system) and sign-out as commands.

### Interaction patterns
- **Command palette:** a `cmdk`-based dialog (`CommandDialog`), opened via the top-bar "Search" button or `Cmd/Ctrl+K` (the shortcut fires even while focused in an input, via `allowInInput: true`). Selecting a command closes the palette, then runs the action.
- **Project selection:** clicking a `ProjectCard` (or Enter/Space when focused) sets it as the active project in a shared `project-store`; the Generator's own project `<Select>` reflects the same selection immediately, since both read the same store.
- **Mermaid diagram interaction:** mouse wheel/drag to zoom/pan, dedicated zoom-in/zoom-out/reset buttons, and — when the diagram region itself has focus — arrow-key panning as a keyboard-equivalent to mouse drag.
- **Output actions:** every generated artifact (SQL, Drizzle, JSON, Documentation, Mermaid) has an icon-button copy action (clipboard, with a success/failure toast) and a download action (browser file download, with a success toast), consistent across all five via a shared `OutputViewerFrame`/`OutputActions` pair.
- **Theme switching:** available both from a dedicated sun/moon dropdown toggle in the top bar and from the command palette's Theme group.

### Responsiveness
- The Workbench's split-pane (code tabs + Mermaid diagram) switches from horizontal (side-by-side) to vertical (stacked) below the mobile breakpoint, via `useIsMobile()`.
- Marketing nav/footer/showcase use responsive grid/flex breakpoints (`sm:`, `md:`, `lg:`) — e.g. the feature showcase grid goes from 2 columns (`sm:grid-cols-2`) to 5 (`lg:grid-cols-5`).
- The top bar hides the user's email and the command-palette trigger's "Search" label on narrow viewports (`hidden ... sm:inline` / `sm:flex`), keeping only icon-only controls.

### Accessibility
- `MermaidCanvas`: the diagram region has `tabIndex={0}`, an `aria-label` describing both mouse and keyboard interaction, `role="img"` + `aria-label` on the injected SVG (which otherwise has no accessible name), and a visible focus ring.
- `ProjectCard`: `role="button"`, `tabIndex={0}`, `aria-pressed` reflecting selection state, Enter/Space keyboard activation.
- `GenerationStatus`: the "generating" state exposes a visually-hidden `role="status" aria-live="polite"` announcement alongside the visual skeleton, so screen-reader users get an equivalent signal to the loading UI.
- `DialectSelector` / `NamingConventionToggle`: disabled controls carry an accessible name that includes "(coming soon)" and `aria-pressed`/`aria-label`, so assistive technology reflects the same "genuinely disabled, not broken" state sighted users see.
- Icon-only buttons throughout (`OutputActions`, `ZoomControls`, theme toggle) are wrapped in `Tooltip` + carry `aria-label`.

---

## 4. Screen Inventory

Every route confirmed to exist via `npm run build`'s route output and direct file inspection:

| Route | Page component | Purpose |
|---|---|---|
| `/` | `app/page.tsx` | Public marketing landing page; adapts CTA to session state; hosts the unauthenticated demo sandbox for logged-out visitors |
| `/login` | `app/(auth)/login/page.tsx` | Sign-in form |
| `/signup` | `app/(auth)/signup/page.tsx` | Sign-up form |
| `/dashboard` | `app/(dashboard)/dashboard/page.tsx` → `DashboardOverview` | Authenticated home: project list as selectable cards, project creation |
| `/dashboard/generator` | `app/(dashboard)/dashboard/generator/page.tsx` → `GeneratorView` | Dedicated schema-generation workflow (prompt → 5 output artifacts) |
| `/dashboard/projects/[id]/workbench` | `.../workbench/page.tsx` → `WorkbenchView` | Reviews a project's generations: latest by default, or a specific one via `?generation=<id>` |
| `/dashboard/projects/[id]/settings` | `.../settings/page.tsx` → `ProjectSettingsView` | Per-project generation-output settings (dialect, naming convention) — both controls disabled/backend-gated |

`/_not-found` also exists in the build output as Next.js's default not-found handling; no custom 404 page was found in `app/`.

---

## 5. Component Inventory

Grouped by `features/*` module ownership, per `eslint.config.mjs`'s enforced boundary graph. Only components read and confirmed during this task are listed.

### `features/shell` — app chrome (no dependencies on other feature modules)
- `AppSidebar` — collapsible icon-mode sidebar; renders `NAV_ITEMS`, highlights the active route.
- `TopNav` — async Server Component top bar; composes `PageTitle`, `CommandPaletteTrigger`, `ThemeToggle`, sign-out form.
- `PageTitle` — client component isolating the one piece of `TopNav` that needs `usePathname()`, so `TopNav` itself can stay a Server Component.
- `CommandPalette` / `CommandPaletteTrigger` — the `cmdk`-based command dialog and its trigger button.
- `KeyboardShortcutProvider` / `useKeyboardShortcut` — centralized global keyboard-shortcut registry.
- `ThemeToggle` — light/dark/system dropdown, via `next-themes`.
- `nav-items.ts` — single source of truth for sidebar destinations, shared with `PageTitle` and `CommandPalette`.

### `features/ai-workspace` — schema generation (may depend on `compiler`, `workbench`)
- `SchemaGenerator` — project selector + prompt editor + generation status + output tabs; orchestrates via `useProjectSelection` and `useGenerateSchema`.
- `PromptEditor` — prompt textarea + Generate button (presentational; no hooks, no `"use client"` needed).
- `use-generate-schema.ts` — client hook wrapping the `generateSchema` Server Action call and its store updates.

### `features/compiler` — generation status (may depend on `workbench`)
- `GenerationStatus` — renders idle/generating/error from `generation-store`; generating state reuses `workbench`'s `OutputSkeleton`.

### `features/workbench` — output display (leaf module, no dependency on other feature modules)
- `OutputTabs` — tab switcher across SQL/Drizzle/JSON/Documentation, paired with `SplitPaneCanvas` + `MermaidViewer` when a Mermaid diagram is present.
- `SplitPaneCanvas` — resizable two-pane layout, horizontal on desktop / stacked on mobile.
- `CodeViewer` — Prism-highlighted, line-numbered code display (SQL/Drizzle/JSON).
- `MarkdownViewer` — `react-markdown` + `remark-gfm` rendering with custom, Tailwind-styled element overrides.
- `MermaidViewer` — lazy-loads `mermaid`, renders the diagram client-side, handles loading/error states, delegates the rendered SVG to `MermaidCanvas`.
- `MermaidCanvas` — pan/zoom wrapper (`react-zoom-pan-pinch`) with zoom buttons and arrow-key panning.
- `OutputViewerFrame` — shared header (label + `OutputActions`) + scroll-area shell, deduplicated across `CodeViewer`/`MarkdownViewer`/`MermaidViewer`.
- `OutputActions` — copy-to-clipboard and download buttons, generic across all 5 output variants via `OUTPUT_CONFIG`.
- `OutputSkeleton` — loading-state placeholder, reused by both the Generator and `GenerationStatus`.
- `output-config.ts` — per-variant label/filename/mimeType/language configuration, the single source powering `OutputActions`, `CodeViewer`, and `MermaidViewer`.

### `features/projects` — project management (no dependencies on other feature modules)
- `ProjectsPanel` — project count, creation entry point, empty state, and the responsive project-card grid.
- `ProjectCard` — interactive, keyboard-accessible project card with Workbench/Settings entry-point icons.
- `CreateProjectDialog` — modal project-creation form, backed by `use-create-project.ts`.

### `features/landing` — public marketing (may depend on `workbench`, to render sandbox output through the same `OutputTabs`)
- `HeroSection` — headline, CTA (session-adaptive), and hosts `HeroSandbox` for logged-out visitors.
- `HeroSandbox` — the unauthenticated demo: a prompt textarea, rate-limit-aware generation, error/success states, renders results through the same `OutputTabs` the authenticated app uses.
- `FeatureShowcase` — five-artifact-type grid plus one static, honestly-labeled illustrative SQL example.
- `MarketingNav` / `MarketingFooter` — session-adaptive header/footer.

### `features/settings` — project settings shell (no dependencies on other feature modules)
- `DialectSelector` — SQL-dialect control; PostgreSQL selected and functional, MySQL/SQLite present but `disabled`.
- `NamingConventionToggle` — snake_case/camelCase toggle; snake_case active, camelCase `disabled`.

### `components/dashboard` — page-composition (not feature-owned; each fetches server data and delegates to a `features/*` module)
`dashboard-overview.tsx`, `generator-view.tsx`, `workbench-view.tsx`, `project-settings-view.tsx`.

### `components/ui` (shadcn primitives, style `base-nova`, base color `neutral`, per `components.json`)
Generic, non-feature-owned: `button`, `card`, `dialog`, `select`, `sheet`, `sidebar`, `tabs`, `tooltip`, `dropdown-menu`, `command`, `input`, `textarea`, `badge`, `separator`, `scroll-area`, `skeleton`, `resizable`. Not re-documented in detail here — see `SCHEMACRAFT_AI_MASTER_CONTEXT.md`.

---

## 6. Design System

Documented strictly as implemented in `app/globals.css` and `components.json` — no aspirational tokens included.

### Typography scale
| Token | Size | Line-height | Letter-spacing |
|---|---|---|---|
| `--text-display-lg` | 3rem | 1.1 | -0.02em |
| `--text-h1` | 1.5rem | 1.2 | -0.01em |
| `--text-h2` | 1.125rem | 1.3 | -0.01em |
| `--text-body` | 0.875rem | 1.5 | 0em |
| `--text-body-sm` | 0.75rem | 1.4 | 0.01em |
| `--text-code` | 0.8125rem | 1.6 | 0em |

These tokens are **defined** in the `@theme inline` block but were not observed being consumed via Tailwind utility classes in any component read during this task — components instead use standard Tailwind text-size utilities (e.g. `text-2xl`, `text-sm`) directly. This gap is noted factually in §8.

### Spacing / motion
- `--duration-fast: 150ms`, `--duration-base: 200ms`, `--ease-standard: cubic-bezier(0.16, 1, 0.3, 1)` — defined; observed in direct use only in `MermaidCanvas`'s programmatic pan animation (`ref.setTransform(..., 150, "easeOut")`), not wired as reusable Tailwind transition utilities elsewhere.
- No dedicated spacing-scale tokens beyond Tailwind's own defaults were found.

### Color system
Four-tier surface scale (`--surface-0` through `--surface-3`, lightest to a card-level white in light mode / darkest to a raised `#18181b` in dark mode), two border-strength tokens (`subtle`/`strong`, opacity-based), three text tokens (`primary`/`secondary`/`muted`), and four theme-invariant brand accents (`violet #7c3aed`, `emerald #10b981`, `amber #f59e0b`, `rose #f43f5e` — identical values in both light and dark mode). These map onto shadcn's semantic variables (`--background`, `--card`, `--primary`, `--destructive`, etc.) rather than components referencing the raw surface/text tokens directly — e.g. `--destructive: var(--accent-rose)`, `--sidebar-primary: var(--accent-violet)`.

Of the four accents, only `violet` (via `--sidebar-primary`) and `rose` (via `--destructive`, used pervasively for error text) are observed wired into the semantic layer. `emerald` and `amber` are defined but no consuming semantic variable or direct component usage was found in the files read.

### Component usage / shadcn
- Style: `base-nova`, base color `neutral`, CSS-variable mode enabled, Lucide icon library — per `components.json`.
- Components consistently use Base UI's `render` prop pattern for polymorphic elements (e.g. `<Button nativeButton={false} render={<Link href="..." />}>`), rather than wrapping `<Link>` around `<Button>`.
- Icon-button actions are consistently paired with `Tooltip`/`TooltipContent` plus an explicit `aria-label`, both for icon-only buttons and for less-obvious controls.

---

## 7. User Flows

Only flows traceable end-to-end through implemented code.

**Unauthenticated visitor → sandbox generation:**
`/` → reads hero copy → types a prompt (≤500 characters) into `HeroSandbox` → clicks Generate → `generatePublicSchemaAction` hashes the visitor's IP, checks `check_sandbox_rate_limit` (5 requests/60 minutes; fails closed if the check itself errors) → on success, `generateSchemaArtifacts` runs the same AST pipeline as the authenticated path (no persistence) → results render inline via `OutputTabs` → on rate-limit or error, a message plus a "Sign up for full access" link is shown.

**Authenticated user → create a project → generate a schema:**
`/dashboard` → `CreateProjectDialog` (title + optional description) → `createProjectAction` → new project appears in the grid and in `project-store` immediately (no page reload needed) → navigate to `/dashboard/generator` → select the project (or it's pre-selected via the synchronous `project-store` fallback) → describe the schema in `PromptEditor` → Generate → `GenerationStatus` shows a loading skeleton with an `aria-live` announcement → on success, `OutputTabs` renders all five artifacts, split-pane with the Mermaid diagram if present.

**Authenticated user → review a past generation:**
`/dashboard` → click a `ProjectCard`'s Workbench icon → `/dashboard/projects/[id]/workbench` → defaults to the project's latest generation (via `getProjectGenerationsAction`) → same five-artifact `OutputTabs` view, plus the generation's version number, creation date, and original prompt → "Back to Dashboard" returns to `/dashboard`. An explicit `?generation=<id>` query param loads a specific past generation instead of the latest.

**Authenticated user → project settings:**
`/dashboard` → click a `ProjectCard`'s Settings icon → `/dashboard/projects/[id]/settings` → view the project title and the two backend-gated controls (SQL dialect, naming convention), both visibly disabled with "Coming soon" badges and explanatory copy — no submission flow exists because nothing on this screen is currently editable.

**Command-palette-driven navigation (any authenticated screen):**
`Cmd/Ctrl+K` (or click the top-bar Search button) → palette opens → type to filter Navigation/Theme/Account commands → select one → palette closes → action runs (route change, theme change, or sign-out).

---

## 8. Known UX Limitations

Verified gaps only — no proposed solutions, per this task's scope.

- **Typography-scale tokens are defined but not consumed.** `--text-display-lg`, `--text-h1`, `--text-h2`, `--text-body`, `--text-body-sm`, `--text-code` exist in `app/globals.css` but no component read during this task uses them; headings use ad hoc Tailwind size classes (`text-2xl`, `text-4xl`, etc.) instead.
- **Two of four brand accent tokens appear unused.** `--accent-emerald` and `--accent-amber` are defined in both light and dark mode but no semantic variable or component reference to them was found.
- **Sidebar items all render the same icon.** `AppSidebar` maps over `NAV_ITEMS` (Dashboard, Generator) but renders a hardcoded `<Sparkles />` icon for every entry rather than a per-item icon — both nav destinations look identical in the sidebar.
- **No project-detail or history-list screen.** The Workbench route shows one generation at a time (latest, or one specified by `?generation=<id>`); there is no UI to browse/list all of a project's past generations, even though `getProjectGenerationsAction` (which returns the full list) already exists and is called internally by the Workbench route itself.
- **No custom 404 page.** Only Next.js's default `_not-found` handling was found; no product-styled not-found screen exists.
- **No client-side character-count indicator on either prompt input.** The authenticated Generator's `PromptEditor` and the sandbox's `HeroSandbox` textarea both enforce character limits only via `maxLength`/server-side validation, with no visible running counter (this matches `TECH_DEBT.md` TD-013, tracked for the authenticated path specifically).
- **Project Settings has no way to become interactive.** Both controls on `/dashboard/projects/[id]/settings` are permanently disabled by the compiler layer's current Postgres-only, snake_case-only implementation — the screen exists but has no functional path today.
- **No dedicated onboarding/empty-state guidance beyond text.** The "no projects yet" and "no generation to show" states are single centered text blocks with one action button — no illustration, tour, or multi-step guidance.

---

## 9. Future UX Work

Only items already present in the repository's own tracked backlog (`TECH_DEBT.md`, `docs/planning/v0.7.1-roadmap.md`) are listed. No new roadmap items have been introduced.

- **History/navigation UI** — a full list view of a project's past generations (browse, view, delete), beyond the Workbench's current "latest or one specific ID" access pattern. Tracked as `TECH_DEBT.md` TD-006 / v0.7.1 Milestone 3.
- **Client-side prompt character-count indicator** — `TECH_DEBT.md` TD-013.
- **SQL dialect and naming-convention options becoming real** — currently blocked on the compiler layer (`lib/compiler/sql` is Postgres-only, snake_case-only); no compiler-side work is scheduled in the currently-tracked backlog beyond the UI shell already built.

No other future UX items were found recorded anywhere in the repository's documentation. This is itself consistent with the Sprint 0 finding (see `Sprint-00-Recovery.md` §4, §6) that the "Engineering Spec" governing UX 2.0's original scope is not present in-repo — any further UX roadmap beyond the three items above would require Sprint 0's separate documentation-synchronization work, not this recovery task.
