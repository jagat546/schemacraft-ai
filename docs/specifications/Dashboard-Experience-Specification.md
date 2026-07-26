# Dashboard Experience Specification

**Status:** Sprint 3 deliverable. Specification only — no implementation.

**Governing documents:** `Design-System-2.0.md`. Every visual reference below is a named token or component standard from that document.

**Scope note:** this document also covers the **Settings** deliverable from the Sprint 3 brief. Settings is specified here, not as a standalone file, because it is dashboard-shell content: it is reached from the same shell (sidebar/top-bar), shares the same layout system, and today already exists in a project-scoped form (`/dashboard/projects/[id]/settings`, per `docs/specifications/UX-2.0-Engineering-Specification.md`). §6 below distinguishes **project settings** (existing) from **account/global settings** (new) and specifies both. This decision, and the two other deliverables folded into other documents, is recorded in `Sprint-03-Summary.md`.

**Current baseline this extends:** the authenticated shell today is a collapsible icon-mode sidebar (`AppSidebar`, two destinations: Dashboard, Generator) + a fixed top bar (`TopNav`: route title, command-palette trigger, theme toggle, sign-out) + a non-scrolling outer shell with a scrolling `<main>`. The Dashboard route (`/dashboard`) renders `ProjectsPanel`: a project count, a creation entry point, an empty state, and a responsive grid of interactive `ProjectCard`s (each with Workbench/Settings/History icon links).

---

## Navigation Hierarchy

Three tiers, never more:

1. **Global** — sidebar destinations (Dashboard, Generator, and, per this spec, Account Settings — see §6). These are the only entries that ever appear in the sidebar.
2. **Project-scoped** — Workbench, History, Project Settings for a specific project. Reached via icons on a `ProjectCard`, never via the sidebar (a sidebar entry for an individual project doesn't scale past a handful of projects and duplicates what the card grid already does well).
3. **In-page** — tabs, accordions, and other within-screen navigation (e.g., `OutputTabs`).

**Why this exists:** a two-tier-only sidebar (today) undersells the product's actual surface area once Settings, History, and Search all need a place. A strict three-tier model keeps the sidebar from becoming a dumping ground while still making every destination reachable within two clicks from anywhere.

## Sidebar Behavior

- **Purpose:** persistent orientation and one-click access to the two most frequent destinations (Dashboard, Generator) plus account-level settings.
- **Why it exists:** the single highest-frequency action in this product is "start or resume generating a schema" — the sidebar exists to make that action never more than one click away, from any screen.
- **Behavior:** collapsible to icon-only (existing pattern), expanded by default on desktop (`≥lg`), collapsed by default on smaller viewports. Each entry gets a **distinct icon** (closing the known gap where every entry currently renders the same `Sparkles` icon, per Design System 2.0 §9/§13.6) — e.g., a grid/layout icon for Dashboard, a wand/sparkle icon reserved specifically for Generator (this is the one destination where a "magic generation" glyph is earned), a gear icon for Settings.
- **Active state:** `--accent-violet` indicator + `--text-primary` label, per Design System 2.0 §10 Navigation.

## Top Navigation

- **Purpose:** show where the user is (route title) and provide access to cross-cutting actions that don't belong in the sidebar (search/command palette, theme, account/sign-out).
- **Why it exists:** the sidebar answers "where can I go"; the top bar answers "what can I do from anywhere, right now, without navigating."
- **Behavior:** unchanged from today's pattern — route title (resolved per-route, including dynamic project routes, per the existing `PageTitle` suffix-matching fix), command-palette trigger, theme toggle, account menu (sign-out lives here; in the rebuilt version, "Account Settings" also lives in this menu as a shortcut, in addition to its sidebar entry). This plain route-title pattern applies to global-tier screens (Dashboard, Generator, Account Settings); project-scoped screens (Workbench, History, Project Settings) replace it with the breadcrumb trail defined in `Navigation-Experience-Specification.md` §Breadcrumbs, since a bare route title can't communicate *which* project the user is in.

## Quick Actions

- **Purpose:** let a returning user start their most common next action without navigating through the full IA.
- **User goal:** "I know exactly what I want to do — don't make me click through three screens to do it."
- **Behavior:** a small, fixed set of quick actions surfaced at the top of the Dashboard content area — "New Project," "New Generation" (pre-selects the most recently active project), and, once a user has ≥1 project, "Resume last generation." No more than three quick actions — more than that stops being "quick" and becomes a second navigation system competing with the sidebar.
- **Visual emphasis:** rendered as a row of secondary-weight buttons (not primary — the primary-weight action on this screen is reserved for the empty-state "Create your first project" CTA when no projects exist). Uses the icon+label button pattern from Design System 2.0 §10.

## Recent Projects

- **Purpose:** the dashboard's primary content — the existing `ProjectsPanel` grid, retained.
- **Why it exists:** for a user with more than a few projects, the dashboard's job is to answer "which project was I just working on" as fast as possible.
- **Behavior:** grid of `ProjectCard`s, most-recently-active first (a change from today's presumed creation-order default — recency ordering is what makes "recent projects" true to its name). Each card shows: project title, a relative timestamp (`--text-caption`, e.g., "Updated 2h ago"), and the existing Workbench/History/Settings icon actions. Selecting a card (click or Enter/Space, existing keyboard-accessible pattern) sets it as the active project in `project-store`, exactly as today.
- **Success criteria:** a user with 10+ projects can find the one they touched most recently without scrolling past unrelated ones.

## Search **(new)**

- **Purpose:** find a specific project by name once the list grows past what's comfortably scannable.
- **User goal:** "I know the project's name (or part of it) — just take me there."
- **Behavior:** a search field at the top of the project grid, filtering client-side by title as the user types (no debounce needed at expected project-count scale); the command palette's existing search also indexes project names so the same query works from anywhere (`Cmd/Ctrl+K`), not just on the dashboard.
- **Success criteria:** typing three characters of a known project name narrows the grid to a match within one keystroke's perceived latency.

## Filters **(new)**

- **Purpose:** narrow the project grid by a meaningful dimension once volume justifies it.
- **User goal:** "Show me only the projects I actually care about right now."
- **Behavior:** a small set of filter chips (pill shape, per Design System 2.0 §7) — e.g., "Has generations" / "Empty" — kept deliberately minimal for v1 rather than a full filter-builder UI, consistent with "reduce anything that exists only because it looks cool." Filters and search compose (AND logic).
- **Success criteria:** filters never produce a confusing "0 results" without an accompanying explanation and a one-click "Clear filters" action (see Empty States).

## Metrics **(new)**

- **Purpose:** give a returning user a one-glance sense of their own activity and account state.
- **User goal:** "How much have I actually built here?"
- **Behavior:** a compact, non-clickable metrics row above the project grid — total projects, total generations, and (once account tiers exist per the Pricing spec) usage against any plan limit. Uses `--text-h2` numerals + `--text-caption` labels, `surface-2` cards, no charts or sparklines unless a real trend exists to show — a single static number is honest; a fabricated-looking chart from one data point is not.
- **Rule:** metrics are informational only, never gamified (no streaks, no "you're falling behind" framing) — consistent with "AI should never surprise users negatively" and the calm, trustworthy brand personality in Design System 2.0 §1.

## Empty States

- **Purpose:** a first-time (zero-project) dashboard must teach, not just say "nothing here."
- **Behavior:** see `Empty-States.md` for the full pattern; on this screen specifically, the empty state replaces the metrics row and project grid entirely with a single centered block: one sentence describing what a project is, and one primary-weight "Create your first project" button — the single most primary action available anywhere in the empty-account state.

## Onboarding

- **Purpose:** get a brand-new user to their first successful generation with zero ambiguity about what to do next.
- **User goal:** "I just signed up — what now?"
- **Behavior:** no multi-step product tour, no modal walkthrough (both violate "remove anything that exists only because it looks cool" and add friction ahead of value). Instead: the empty-state CTA above leads directly into `CreateProjectDialog`, which on success routes straight into the Generator with that project pre-selected — the fastest possible path from "just signed up" to "watching a real generation happen." Any explanatory copy needed lives inline on the screens the user is already on (e.g., a one-line hint in the Generator's empty prompt state), not in a separate onboarding flow.
- **Success criteria:** time from first dashboard render to a completed first generation involves exactly two user actions (create project, submit a prompt) with no dead ends in between.

## Responsive Layout

- Metrics row: 3-up on desktop, 1-column stacked on mobile.
- Project grid: reduces column count at each breakpoint per Design System 2.0 §5 (down to 1 column below `sm`).
- Quick actions row: remains a horizontal row down to `sm`, then stacks to avoid button label truncation.
- Search/filters: collapse into a single expandable control below `sm` rather than consuming permanent vertical space on small screens.

---

## Settings

Two distinct settings surfaces exist, and this spec keeps them distinct rather than merging them — they answer different questions and are owned by different scopes.

### Project Settings (existing, project-scoped)

Unchanged in scope from the current implementation (`/dashboard/projects/[id]/settings`): SQL dialect and naming-convention controls, both currently genuinely `disabled` at the DOM level with a "Coming soon" label rather than hidden — this pattern is correct and is retained as the standard for any backend-gated control anywhere in the product, per the "never a control that silently does nothing" principle (`docs/specifications/UX-2.0-Engineering-Specification.md` §2), which Design System 2.0 §1 restates as "never a control that does nothing."

### Account Settings **(new, global-scoped)**

Reached from the sidebar and the top-bar account menu. A single-column, categorized settings page — no dashboard-style grid, since settings is a form-dense, low-decoration surface by nature.

- **Categories & Navigation:** a left-aligned in-page category list (not a second sidebar — this is in-page navigation, tier 3) with sections: Preferences, Appearance, Accessibility, Account, Billing, Keyboard Shortcuts, Developer. Selecting a category scrolls/switches to that section; on mobile, categories collapse into a top dropdown/tab strip.
- **Preferences:** default SQL dialect for new projects (mirrors, doesn't duplicate, the per-project override), default naming convention, default landing screen after login (Dashboard vs. Generator).
- **Appearance / Theme:** light/dark/system — the existing `ThemeToggle` options, surfaced here as the canonical control; the top-bar toggle remains a shortcut to the same underlying state, not a second source of truth.
- **Accessibility:** a `prefers-reduced-motion` override (force-reduce motion even if the OS setting doesn't request it — some users want this per-app), and a "high-contrast borders" toggle that swaps `--border-subtle` for `--border-strong` product-wide for users who find the default separators too quiet. Both are additive on top of the Design System 2.0 §11 baseline, never a replacement for it.
- **Account:** email, password change, sign-out-of-all-sessions, delete-account (destructive — see Error Experience / confirmation pattern in Design System 2.0 §10 Dialogs).
- **Billing (placeholder):** until a real billing system exists, this section shows current plan (read-only) and a single "Manage billing" action that is honestly disabled/labeled "Coming soon" — the same non-fake-interactive pattern as Project Settings' current dialect/naming controls. No fake pricing table, no fake invoice history.
- **Keyboard Shortcuts:** a read-only reference list of every shortcut registered in `KeyboardShortcutProvider` (existing registry), grouped by context (Global, Generator, Workbench) — this is documentation, not a rebinding UI, for v1.
- **Developer:** exposes anything genuinely aimed at the product's backend-engineer audience — e.g., a toggle to always show raw UUIDs instead of resolved titles where both are available, or a "verbose error detail" toggle that shows the underlying error code alongside the friendly message. Off by default.
- **Reset Behavior:** each category has its own "Reset to defaults" action, scoped only to that category (never a single "reset everything" button, which is one destructive action away from wiping account-level settings unintentionally) — each reset is a lightweight confirmation (not a full destructive dialog), since resetting preferences is recoverable and low-stakes, unlike account deletion.
