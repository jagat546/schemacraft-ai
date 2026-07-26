# Workbench Experience Specification

**Status:** Sprint 3 deliverable. Specification only — no implementation.

**Governing documents:** `Design-System-2.0.md`.

**Current baseline this extends:** `/dashboard/projects/[id]/workbench` today reviews a project's generations (latest by default, or a specific one via `?generation=<id>`) through `OutputTabs` + `SplitPaneCanvas` (code/doc tabs beside the Mermaid ERD, stacking on mobile) + `CodeViewer` (Prism-based, line-numbered, read-only syntax highlighting) + `MermaidViewer`/`MermaidCanvas` (pan/zoom, keyboard-operable). This spec treats the Workbench as the product's IDE-grade surface and upgrades the code-viewing layer specifically — see §Monaco Integration for what changes and why.

**Framing:** the Workbench is where a user goes to *seriously inspect* a generation, not to skim it — this is the one screen in the product that should feel like a professional developer tool, per the Sprint 3 product vision (Linear/Vercel/Supabase quality bar).

---

## Workspace Layout

- Three logical regions: a slim header (project name, generation version/date, back-to-dashboard), the main split workspace (code/doc tabs + ERD), and nothing else — no metrics, no marketing, no unrelated chrome. The Workbench earns its "IDE" framing partly by *removing* everything that isn't the artifact itself.
- `content-md` width is retained as the outer bound on typical viewports. Fullscreen Mode (§below) removes the sidebar and top bar to give the workspace more of the viewport, but the workspace content itself still respects `content-lg` as its hard maximum, per Design System 2.0 §5 ("No screen exceeds `content-lg`") — fullscreen is a chrome-removal mode, not an exception to the container-width system.

## Panel Behavior

- Two panels: the artifact panel (tabs: SQL, Drizzle, JSON, Documentation) and the ERD panel. Either panel can be collapsed to give the other full width — a collapse control (chevron) at the panel boundary, not just drag-to-zero, since drag-to-zero is fiddly and undiscoverable as a way to fully hide a panel.
- Collapsing a panel persists for the session (see State Persistence) — a user who collapses the ERD to focus on SQL shouldn't have to re-collapse it every time they revisit the Workbench in the same session.

## Monaco Integration **(new — forward specification)**

- **What changes:** `CodeViewer`'s Prism-based read-only display is replaced by a Monaco Editor instance in **read-only mode** for SQL, Drizzle, and JSON. Documentation remains rendered as Markdown (`MarkdownViewer`), not as an editor — Monaco is for code, not prose.
- **Why Monaco, and why read-only:** the product's generations are immutable, versioned artifacts (each generation is a new History entry, never mutated in place, per `Generator-Experience-Specification.md`) — so this is not a code-editing surface. It's a code-*reviewing* surface, and Monaco read-only mode gives IDE-grade review tooling (real find/replace widget, minimap, bracket matching, proper SQL/TypeScript/JSON language tokenization) that a syntax-highlighter alone cannot, without introducing the risk or complexity of actually letting users mutate generated output.
- **Configuration:** `readOnly: true`, line numbers on, word-wrap off by default (code review benefits from real line structure; wrapped SQL is harder to scan), minimap on by default on desktop (§Mini Map), off by default on mobile/narrow viewports where it would consume disproportionate width.

## Resizable Panels

- The existing draggable divider between the artifact panel and the ERD panel is retained, with a sensible min width on each side (~280px) so neither can be dragged to unusable. The divider position is persisted (§State Persistence).

## Fullscreen Mode **(new)**

- **Purpose:** let a user reviewing a large or complex schema remove all app chrome (sidebar, top bar) so more of the viewport goes to the Workbench content itself.
- **Interaction:** a fullscreen toggle in the Workbench header (icon button, tooltip "Fullscreen" / keyboard shortcut below) hides the sidebar and top bar with a `duration-slow` transition, reclaiming that space for the workspace — the workspace's own `content-lg` cap (§Workspace Layout) is unaffected; this mode removes surrounding chrome, it does not widen the content container itself. `Escape` exits fullscreen. Re-entering the Workbench route later does not persist fullscreen state — it's a transient viewing mode, not a saved layout, since defaulting a user into a chrome-less view unexpectedly would violate "AI should never surprise users negatively" (extended here to any UI state, not just AI output).

## Command Palette

- The existing global `Cmd/Ctrl+K` palette gains Workbench-scoped commands *only while the Workbench is focused*: "Jump to generation…" (opens History inline rather than navigating away), "Toggle ERD panel," "Toggle fullscreen," "Copy [current tab] to clipboard." These are additive to the existing global commands (navigation, theme, sign-out) — the palette remains one unified surface, not a different palette per screen.

## Search

- Within the Monaco-backed code panel: Monaco's native find widget (`Cmd/Ctrl+F` while the editor has focus), scoped to the currently active tab's content. This is the one place in the product where in-content text search exists — it is not a product-wide search (that's the command palette / Dashboard search from `Dashboard-Experience-Specification.md`, a different concern: finding a *project*, not finding *text within a schema*).

## Replace

- Present in the UI exactly as Monaco's standard find/replace widget renders it, but functionally inert: since the editor is read-only, Monaco natively disables the replace action (this is Monaco's own built-in behavior for read-only editors, not a custom restriction to design). No custom "why can't I replace" messaging is needed beyond Monaco's own disabled-control affordance — consistent with Design System 2.0's rule that a disabled control must be genuinely, visibly disabled, never fake-interactive.

## Mini Map

- Monaco's minimap, enabled by default on desktop for SQL/Drizzle/JSON tabs where the artifact is long enough to benefit (roughly >40 lines — below that, a minimap adds visual noise without aiding navigation, so it's suppressed automatically rather than user-toggled for short artifacts). User can toggle it off via the Workbench-scoped command palette entry; the choice persists for the session.

## Keyboard Shortcuts

| Shortcut | Action |
|---|---|
| `Cmd/Ctrl+K` | Open command palette (global) |
| `Cmd/Ctrl+F` (editor focused) | Open Monaco find widget |
| `Cmd/Ctrl+1..5` | Jump to tab 1–5 (SQL, Drizzle, JSON, Docs, ERD) |
| Arrow keys (ERD panel focused) | Pan the diagram (existing) |
| `+` / `-` / `0` (ERD panel focused) | Zoom in / out / reset (existing zoom controls, keyboard-equivalent) |
| `Escape` | Exit fullscreen if active; otherwise close find widget if open |
| `Cmd/Ctrl+Shift+C` | Copy current tab's content (mirrors the existing copy button) |

All shortcuts are registered through the existing `KeyboardShortcutProvider`, scoped to fire only while the Workbench route is active, exactly like the provider's existing conflict-avoidance design.

## Theme Behavior

- Monaco's theme is derived from the product's active theme (light/dark/system, from the global `ThemeToggle`) — never a separate, independently-set editor theme. Monaco's built-in `vs`/`vs-dark` bases are re-themed to pull from the Design System 2.0 surface/text/accent tokens (background = `--surface-2`, foreground = `--text-primary`, selection/match highlight = `--accent-violet` at reduced opacity) so the editor reads as part of the product, not a visually foreign embedded widget.

## Diagram Rendering

- Unchanged from the existing, already-solid pattern: lazy-loaded Mermaid, client-side render, pan/zoom via `react-zoom-pan-pinch`, `role="img"` + `aria-label` on the rendered SVG, `securityLevel: "strict"` (a deliberate defense given diagram source is model-generated and never syntax-validated server-side, per the existing implementation). "Fit to view" is the default zoom on first render (per `Generator-Experience-Specification.md`).

## Navigation

- Header shows the current generation's version number and date (existing) plus, new, a compact prev/next control to step through a project's generation history without leaving the Workbench or opening the full History list — useful for comparing "what changed between v3 and v4" without round-tripping through the History screen. Opening History itself (full list, delete action) remains the dedicated `/history` route.

## State Persistence

Persisted **per project, for the session** (not indefinitely across devices/logins — this is workspace convenience state, not user data worth syncing to the backend):

- Active tab
- Split-pane divider position
- Panel collapse state (artifact panel / ERD panel)
- Minimap on/off

Not persisted: fullscreen mode (transient, per above), which generation is being viewed (always resolves fresh from the route/query param, since that's meaningful application state, not a UI preference).

## Performance Expectations

- Monaco is lazy-loaded (dynamic import, matching the existing lazy-load pattern already used for Mermaid) — it never ships in the initial bundle for routes that don't render the Workbench.
- Large generated artifacts (schemas with 50+ tables) must remain responsive: Monaco's own virtualized rendering handles this natively for code content; the Mermaid ERD must remain pannable/zoomable without frame drops at this scale — if a given generation's diagram is large enough to degrade interaction, the ERD panel shows a one-time notice suggesting the user use zoom/fit-to-view rather than silently degrading.
- Tab switching and panel resize must feel instant (`duration-fast` or less perceived latency) — no visible re-render flash when switching between already-loaded tabs.
