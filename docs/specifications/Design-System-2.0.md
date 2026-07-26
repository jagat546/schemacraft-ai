# SchemaCraft AI — Design System 2.0

**Status:** Sprint 2 deliverable. Specification only — no implementation.

**Relationship to existing code:** This document does not invent a system from nothing. `app/globals.css` already defines a partial token layer (surfaces, text, borders, four brand accents, a typography scale, and motion durations), documented factually in `docs/specifications/UX-2.0-Engineering-Specification.md` §6–8. That audit also recorded specific gaps: the typography scale is defined but never consumed by components; two of four accent colors (`emerald`, `amber`) are defined but wired to nothing; no spacing scale exists beyond Tailwind's defaults; sidebar nav items all render an identical icon. Design System 2.0 ratifies what already works, gives every existing token an explicit purpose, fills the gaps (spacing, elevation, a complete typography hierarchy, semantic color usage), and sets the rules that keep it that way. Where a new token is introduced, it is called out explicitly as new.

**How to read this document:** it is the source of truth for every future screen and component. If an implementation detail (a Tailwind class, a shadcn variant, a component prop) isn't dictated here, it's an implementation decision — but the visual result it produces must be traceable to a rule in this document. If it isn't, the design system is incomplete and should be revised, not silently worked around.

---

## 1. Design Philosophy

### Brand personality

SchemaCraft AI is a tool built by engineers, for engineers, doing something that requires trust: generating the schema an entire application will be built on. The personality is **precise, calm, and unshowy** — closer to a well-built CLI than a consumer app. It earns confidence through consistency and restraint, not through visual flourish.

### Visual identity

- Neutral-first: the interface is built from a near-black/near-white surface scale (already `--surface-0..3`), not color.
- One accent, used deliberately: violet marks the single "this is interactive / this is brand" signal in the product. It is not diluted by competing accent colors fighting for attention.
- Monospace is a first-class citizen, not an afterthought: this product's core output is code and schema, so `Geist Mono` appears with the same care as the UI typeface, never as an unstyled default.
- Flat over decorative: elevation comes from a disciplined surface + shadow system, not gradients, glassmorphism, or noise textures.

### Emotional goals

A user watching an AI generate a database schema — infrastructure their application will depend on — should feel **in control, not along for the ride**. Every screen should communicate:

- "Nothing here will surprise you." (predictable layout, consistent interaction patterns)
- "The system tells me what's happening." (explicit loading, success, and error states — never silent failure, never a control that does nothing)
- "My time matters." (no decorative delay, no animation that exists only to be watched)

### Design principles

1. **Clarity over decoration.** Every visual choice must earn its place by improving comprehension or usability.
2. **Consistency over novelty.** A new screen reuses existing patterns before inventing new ones.
3. **One accent, many neutrals.** Color is a signal, not a mood.
4. **Motion serves feedback, not delight.** Animation confirms state; it does not perform.
5. **Every interactive element is keyboard-operable.** No hover-only affordance.
6. **The interface recedes in favor of the generated artifact.** Chrome (nav, sidebar, top bar) is quieter than content.

### UX principles

- Predictable navigation: the same destination is always reached the same way.
- Progressive disclosure: advanced or destructive controls are not presented at the same visual weight as primary actions.
- Generated output is always the visual focus of any screen that contains it.
- Never block the UI on an animation; motion durations must never gate task completion.
- Speak the user's language: the primary audience thinks in tables, schemas, and structured data — visual metaphors (grids, structured cards, monospace) should feel native to that mental model, per the backend-analogy framing in `CLAUDE.md`.

### Accessibility philosophy

Accessibility is a default state, not a feature layered on afterward. A component that isn't keyboard-operable or screen-reader-legible is not "done," regardless of how it looks. See §11 for the concrete standard.

---

## 2. Color System

The palette is intentionally small. Every color below has exactly one job. Do not use a color outside its defined purpose (e.g., never use `rose` for anything but errors/destructive actions, even if the shade "looks right" for something else).

### Brand / accent color

| Token | Value | Purpose |
|---|---|---|
| `--accent-violet` | `#7c3aed` | The single brand and primary-interactive color. Primary buttons, active nav/tab state, focus rings, links, brand marks, selection state. If a screen has more than one color competing for the user's attention as "the important thing," it is misusing this system. |

### Semantic colors

| Token | Value | Purpose | Status |
|---|---|---|---|
| `--accent-emerald` | `#10b981` | **Success.** Completed generation, successful copy/download, positive validation, confirmation toasts. | Defined in code today but unwired — Design System 2.0 requires it be connected to every success state. |
| `--accent-amber` | `#f59e0b` | **Warning.** Non-blocking issues: rate-limit proximity, "coming soon" / disabled-but-visible controls, validation warnings that don't block submission. | Defined in code today but unwired — same requirement as above. |
| `--accent-rose` | `#f43f5e` | **Error / destructive.** Failed generation, validation errors, destructive-action buttons (delete project), `--destructive` mapping. | Already wired via `--destructive`; keep as-is. |
| `--accent-sky` | `#0ea5e9` *(new)* | **Info.** Neutral informational callouts, tips, keyboard-shortcut hints, non-actionable status badges. Introduced because no existing token covers this purpose; chosen to match the saturation/weight of the other three accents so it reads as part of the same family, not a foreign addition. | New token — requires implementation. |

Success/Warning/Error/Info must always pair color with an icon or text label — never color alone (see §11, contrast/colorblindness).

### Neutral palette / surfaces (background hierarchy)

The existing four-tier surface scale is the backbone of visual hierarchy. Depth is communicated by *which surface tier* an element sits on, not by arbitrary color choices.

| Token | Role |
|---|---|
| `--surface-0` | App canvas — the page background. The quietest layer. |
| `--surface-1` | Recessed / grouped areas — sidebar, muted panels, secondary backgrounds. Sits visually "behind" surface-0 content in some contexts, "beside" it in others (e.g., sidebar). |
| `--surface-2` | Raised content — cards, buttons at rest, primary content containers. |
| `--surface-3` | Floating content — popovers, dropdowns, dialogs, tooltips, the command palette. The highest resting layer; always paired with elevation-3 shadow (§6). |

### Border colors

| Token | Role |
|---|---|
| `--border-subtle` | Default separator — card edges, table rows, dividers. Low-contrast by design; borders should be felt, not seen. |
| `--border-strong` | Emphasis border — input focus-adjacent states, active selection outlines, elements that need to visually separate from a busy background. |

### Text colors

| Token | Role |
|---|---|
| `--text-primary` | Headings, primary body content, anything the user must read. |
| `--text-secondary` | Supporting text — descriptions, secondary labels, non-critical UI copy. |
| `--text-muted` | Placeholders, timestamps, disabled text, least-important metadata. |

### Usage rule

Every color decision in a component spec must cite one of the tokens above by name. "A slightly darker gray" is not a valid design decision — it is either `--surface-1`, `--text-secondary`, `--border-strong`, or the token doesn't exist yet and needs to be proposed (§13).

---

## 3. Typography System

### Font families

| Token | Family | Usage |
|---|---|---|
| `--font-sans` | Geist Sans | All UI text — headings, body, labels, buttons, navigation. |
| `--font-mono` | Geist Mono | All code and schema output: SQL, Drizzle, JSON, Mermaid source, inline code, keyboard-shortcut glyphs, technical identifiers (table/column names referenced in prose). |

Never fall back to system fonts; never introduce a third family.

### Type scale

This extends the existing partial scale (`display-lg`, `h1`, `h2`, `body`, `body-sm`, `code`) to cover every case a screen needs, closing the gap where components previously reached for ad hoc Tailwind size utilities instead.

| Token | Size | Line height | Letter spacing | Weight | Usage |
|---|---|---|---|---|---|
| `--text-display-lg` | 3rem (48px) | 1.1 | -0.02em | 600 | Marketing hero headline only. Never in the authenticated app. |
| `--text-h1` | 1.5rem (24px) | 1.2 | -0.01em | 600 | Page title (one per screen). |
| `--text-h2` | 1.125rem (18px) | 1.3 | -0.01em | 600 | Section header within a page. |
| `--text-h3` *(new)* | 1rem (16px) | 1.4 | -0.005em | 600 | Card header, subsection header, dialog title. |
| `--text-body` | 0.875rem (14px) | 1.5 | 0em | 400 | Default UI text — the workhorse size. Buttons and form labels use this at weight 500. |
| `--text-body-sm` | 0.75rem (12px) | 1.4 | 0.01em | 400 | Secondary/meta text — helper text, table cell secondary content. |
| `--text-caption` *(new)* | 0.6875rem (11px) | 1.4 | 0.02em | 500 | Badges, timestamps, overline labels. May be uppercase with the given letter-spacing when used as a category label (e.g., "SUCCESS", "BETA"). |
| `--text-code` | 0.8125rem (13px) | 1.6 | 0em | 400 | All code/monospace content, set in `--font-mono`. |

### Font weights

Only three weights are used anywhere in the product:

- **400 (regular)** — all body and code text.
- **500 (medium)** — interactive labels: buttons, form labels, active nav/tab state, captions.
- **600 (semibold)** — all headings (`display-lg` through `h3`).

Never use 700 or heavier. Restraint in weight is part of what separates this from a consumer marketing site — matches the target quality bar (Linear, Vercel, Supabase all cap around semibold).

### Rules

- No component may use a raw Tailwind text-size utility (`text-2xl`, `text-4xl`, etc.) — every piece of text consumes one of the tokens above.
- Headings are always semibold; body and code are always regular; interactive labels are always medium.
- Code content is always `--font-mono` — never render a table/column name or SQL fragment in the sans family.
- Line length for body text should stay within a readable measure (~60–80 characters) — a consequence of the container widths in §5, not a new token.

---

## 4. Spacing System

No spacing scale exists in the codebase today beyond Tailwind's raw defaults — this is the primary gap Design System 2.0 closes. The scale below is a semantic subset of Tailwind's own 4px-based scale, so it costs nothing to adopt and nothing is renamed.

| Token | Value | Typical use |
|---|---|---|
| `space-1` | 4px | Icon-to-label gap; tightest spacing that still reads as "related." |
| `space-2` | 8px | Compact internal padding (badges, chips), tight vertical stacks. |
| `space-3` | 12px | Form field internal padding, small control gaps. |
| `space-4` | 16px | **Base rhythm unit.** Default component padding, card internal padding, standard gap between related elements. |
| `space-6` | 24px | Gap between cards in a grid, spacing between subsections within a page. |
| `space-8` | 32px | Spacing between major sections on a page. |
| `space-12` | 48px | Spacing between distinct page regions (e.g., hero to feature grid). |
| `space-16` | 64px | Page-top spacing on wide/marketing layouts, hero vertical padding. |

### Applied rhythm

- **Page spacing:** page content starts at `space-8` (compact) to `space-16` (marketing/hero) from the viewport edge, scaling down on mobile per breakpoint.
- **Section spacing:** `space-8` between major sections within a single page (e.g., between the prompt editor and the output tabs).
- **Card spacing:** `space-4`–`space-6` internal padding depending on card density; `space-4` gap between cards in a grid.
- **Form spacing:** `space-2` between a label and its input; `space-4` between fields; `space-6` between field groups.
- **Grid spacing:** `gap-4` default for dense grids (project cards), `gap-6` for lower-density/wider grids (marketing feature showcase).

### Rule

Every margin, padding, and gap value in the product must be one of the eight values above. No arbitrary pixel value (`13px`, `18px`, `gap-[10px]`) is permitted. If a layout seems to need something in between, it doesn't — round to the nearest scale step.

---

## 5. Layout System

### Container widths

Derived from what's already in productive use — formalized so future screens don't reinvent a width:

| Token | Width | Usage |
|---|---|---|
| `content-sm` | `max-w-3xl` (48rem / 768px) | Focused single-column content: forms, prompt editor, auth screens. |
| `content-md` | `max-w-4xl` (56rem / 896px) | Detail/review views with moderate content density (Workbench). |
| `content-lg` | `max-w-6xl` (72rem / 1152px) | Wide layouts: marketing showcase, footer, any multi-column grid. |

No screen exceeds `content-lg`. No screen uses full viewport width for text content.

### Grid philosophy

- CSS Grid for collections of like items (project cards, feature showcase cards).
- Flexbox for component-internal layout (a card's header row, a form's button row).
- Column count is content-driven (2, 3, or 4 columns), not a rigid 12-column system — this product's layouts are compositions of cards and panels, not editorial page layout.

### Breakpoints

Standard Tailwind breakpoints, mobile-first:

| Breakpoint | Width |
|---|---|
| `sm` | 640px |
| `md` | 768px |
| `lg` | 1024px |
| `xl` | 1280px |
| `2xl` | 1536px |

### Responsive behavior

- Sidebar collapses to icon-only below `lg`.
- Split-pane views (code + diagram) stack vertically below `md`.
- Multi-column grids reduce to a single column below `sm`.
- Non-essential top-bar labels (search label, user email) hide below `sm`, leaving icon-only controls — already an established pattern, ratified here as the rule for any future top-bar control.

### Content hierarchy

Exactly one primary action per screen. The generated artifact (schema, SQL, diagram) is always the largest and most visually dominant element on any screen that contains one — chrome recedes onto `--surface-1` while content sits on `--surface-0`/`--surface-2`.

---

## 6. Elevation

No shadow system exists in the codebase today; elevation is currently implied only by surface tier and border. Design System 2.0 formalizes a 4-level system tied directly to the surface scale in §2, so "which surface" and "how elevated" are always the same decision.

| Level | Surface | Border | Shadow | Usage |
|---|---|---|---|---|
| **0 — Flush** | `surface-0` | none | none | Page background. |
| **1 — Grouped** | `surface-1` | `border-subtle` | none | Sidebar, muted/grouped panels. Border only, no shadow — it's beside content, not above it. |
| **2 — Raised** | `surface-2` | `border-subtle` | `shadow-sm` | Cards, buttons at rest, primary content containers. |
| **3 — Floating** | `surface-3` | `border-strong` | `shadow-md` | Popovers, dropdowns, dialogs, tooltips, command palette. Always paired with a low-opacity backdrop scrim when modal. |

### Shadow values *(new tokens)*

Kept deliberately subtle — this product is a flat, borderless-leaning dark-first UI in the Linear/Vercel mold, not a heavy-drop-shadow skeuomorphic one.

- `shadow-sm`: `0 1px 2px rgba(0,0,0,0.04), 0 1px 1px rgba(0,0,0,0.03)` — light mode. In dark mode, shadows contribute less than borders; rely primarily on `border-strong` plus a barely-there shadow at ~half the light-mode opacity.
- `shadow-md`: `0 4px 16px rgba(0,0,0,0.08), 0 2px 6px rgba(0,0,0,0.04)` — light mode; same dark-mode de-emphasis rule applies.

### Rules

- Elevation communicates interactivity and layering only — never decoration. A card doesn't get a shadow "to look nice"; it gets one because it's a level-2 raised surface.
- Never use more than one shadow style within the same screen region — no mixing custom shadows with the scale above.
- Static text/content blocks and full-bleed sections need no shadow if the surface tier alone communicates hierarchy — don't add elevation just because a component "feels flat" without checking whether it actually needs to be raised.

---

## 7. Border Radius

The existing radius scale (`--radius: 0.625rem` base, with multiplier steps already defined in `globals.css`) is retained and given explicit semantic mapping:

| Token | Value | Usage |
|---|---|---|
| `radius-sm` | 6px | Badges, chips, small tags, inline code snippets. |
| `radius-md` | 8px | Inputs, buttons, tabs, small form controls. |
| `radius-lg` | 10px | **Default component radius.** Cards, dialogs, dropdowns, panels. |
| `radius-xl` / `radius-2xl` | 14px / 18px | Large feature panels, marketing sections, hero cards. |
| **Pill** | `rounded-full` + horizontal padding | Status badges, toggle switches, filter chips. |
| **Circular** | `rounded-full` at 1:1 aspect | Avatars, icon-only buttons. |

### Rules

- Never use a radius value outside this scale.
- A component's radius is a single step — a `radius-lg` card must not contain a child element using `radius-2xl` unless the pattern is an intentional nested-card (in which case the child steps up, never down, and the difference must be at least one full step to read as intentional rather than accidental).

---

## 8. Motion System

The two existing durations and the existing easing curve are retained and extended to cover cases not yet named.

| Token | Value | Usage |
|---|---|---|
| `duration-instant` *(new)* | 100ms | Micro-feedback: button press, checkbox/toggle state change. |
| `duration-fast` | 150ms | Hover states, tooltips, small transitions. |
| `duration-base` | 200ms | Default transition: panel open, tab switch. |
| `duration-slow` *(new)* | 320ms | Larger surface transitions: dialog open, sidebar collapse/expand. |

No animation in the product exceeds ~400ms. This is a tool, not a showcase — motion must never make the user wait.

### Easing

- `--ease-standard` (`cubic-bezier(0.16, 1, 0.3, 1)`, existing) — used for all entrances and expansions.
- `--ease-exit` *(new)* (`cubic-bezier(0.4, 0, 1, 1)`) — used for all exits/collapses. Things should leave faster than they arrive; asymmetric timing reads as more responsive than a single shared curve.

### Animation philosophy

Motion exists to do exactly three things:

1. Confirm an action registered (button press, copy success).
2. Preserve spatial continuity when layout changes (panel expand, sidebar collapse).
3. Communicate system state (loading, generating).

It never exists for delight alone. No parallax, no spring/bounce easing, no auto-playing decorative animation anywhere in the product, including marketing pages.

### Hover behavior

State changes (background, border, text color) transition over `duration-fast`. Functional controls (buttons, cards, nav items) do not scale or transform on hover — reserve any transform-based affordance for the rare, deliberately playful marketing moment, and even there, prefer restraint.

### Loading animations

Skeletons are the default for content placeholders (the existing `OutputSkeleton` pattern), preferred over spinners because they preserve layout and reduce perceived wait. Spinners are reserved for indeterminate actions under ~2 seconds. Every loading state pairs its visual with an `aria-live="polite"` announcement — already established in `GenerationStatus` and required for every future async state.

### Page transitions

None by default — route changes are instant. Only elements that persist across a navigation (e.g., a shared layout shell) may animate; full-page fade/slide transitions are not used.

### Reduced motion

`prefers-reduced-motion` must be respected everywhere: all non-essential transitions (hover, decorative, layout) are disabled. Essential state-communicating motion (a loading indicator) may remain but must switch to opacity/visibility changes rather than transform/movement.

---

## 9. Iconography

### Library

Lucide, exclusively — already the configured icon library in `components.json`. No second icon library is ever introduced; mixing icon sets is one of the fastest ways to look inconsistent.

### Sizes

| Size | Usage |
|---|---|
| 16px | Default — inline with body text, inside buttons, form controls. |
| 20px | Standalone nav items, icon-only buttons that aren't inline with text. |
| 24px | Empty-state illustrations, feature-highlight icons. |

No other sizes. No arbitrary scaling of an icon between these steps.

### Stroke weight

Lucide's default 2px stroke, at every size, everywhere. Never override to a thin (1px) or bold (2.5px) variant — uniform stroke weight across the entire icon set is part of what reads as deliberate rather than assembled from defaults.

### Usage rules

- Icons never carry meaning alone in a critical action. Paired with a visible text label where space allows; where icon-only (toolbar actions), always paired with a `Tooltip` and an explicit `aria-label` — the pattern already established in `OutputActions`/`ZoomControls`.
- **Navigation icons must be semantically distinct per destination.** This directly closes a known gap: `AppSidebar` currently renders the same `Sparkles` icon for every nav entry, making Dashboard and Generator visually indistinguishable in the sidebar. Every future nav item gets its own meaning-appropriate icon.
- Default placement is a leading icon (left of label) for buttons and nav items. Trailing icons are reserved for disclosure/navigation hints only: a chevron for expandable/dropdown content, an external-link glyph for links that leave the app.
- One icon = one meaning, product-wide. The icon used for "copy" in one place is the icon used for "copy" everywhere.

---

## 10. Component Standards

Design principles only — no implementation, no Tailwind, no component code. Every component below assumes the color, type, spacing, elevation, radius, and motion rules already defined.

### Buttons

- **Purpose:** trigger a single, unambiguous action.
- **Hierarchy:** one primary button (`--accent-violet` fill) per view/section; secondary actions use a neutral/outline treatment on `surface-2`; destructive actions use `--accent-rose`, always with a confirmation step for irreversible operations.
- **Interaction:** `duration-fast` color transition on hover; `duration-instant` feedback on press; disabled state is visually muted (`--text-muted`) and non-interactive, never just lower opacity on an otherwise-clickable element.
- **Accessibility:** minimum 44×44px hit target regardless of visual size; icon-only buttons require `aria-label`.
- **Variants:** primary, secondary, outline, ghost, destructive, icon-only.
- **States:** rest, hover, focus, active/pressed, disabled, loading (spinner replaces label, label preserved for screen readers).

### Inputs

- **Purpose:** single-line data entry.
- **Hierarchy:** always paired with a visible label above the field (never placeholder-as-label).
- **Interaction:** focus state uses `--border-strong` + visible focus ring; validation state (error) uses `--accent-rose` border + inline message below the field.
- **Accessibility:** label programmatically associated via `for`/`id`; error messages associated via `aria-describedby`.
- **Variants:** text, search (with leading icon), select.
- **States:** rest, focus, filled, error, disabled.

### Textareas

- Same rules as inputs, plus: resize behavior is deliberate (vertical-only or fixed, never freeform in both axes unless the content genuinely benefits, e.g. the prompt editor); character-count indicators (already established for the prompt editor) use `--text-caption` and shift to `--accent-amber`/`--accent-rose` as the limit approaches/is exceeded.

### Cards

- **Purpose:** group related content as a single, scannable unit (project card, feature card).
- **Hierarchy:** elevation level 2 (§6); internal padding `space-4`–`space-6`.
- **Interaction:** if a card is itself interactive (selectable/clickable), the entire card is the hit target, with a visible hover and focus state — never a card that looks clickable but only responds on a small inner element.
- **Accessibility:** interactive cards carry `role="button"`, `tabIndex={0}`, and keyboard activation (Enter/Space) — the pattern already established in `ProjectCard`.
- **Variants:** static (display-only), interactive/selectable, with-actions (icon buttons in a corner).
- **States:** rest, hover, selected/active, focus.

### Dialogs

- **Purpose:** interrupt for a focused, blocking task (create project, confirm destructive action).
- **Hierarchy:** elevation level 3, centered, with a scrim behind it at low opacity over the rest of the UI.
- **Interaction:** opens/closes at `duration-slow` with `ease-standard`/`ease-exit`; closes on Escape, backdrop click (unless the action is destructive and requires explicit cancellation), or an explicit close control.
- **Accessibility:** focus is trapped within the dialog while open and returns to the triggering element on close; `role="dialog"`, labelled by its title.
- **Variants:** form dialog, confirmation dialog, destructive-confirmation dialog.
- **States:** entering, open, exiting.

### Dropdowns

- **Purpose:** present a bounded set of choices without leaving the current context.
- **Hierarchy:** elevation level 3, anchored to its trigger.
- **Interaction:** opens on click or Enter/Space on the trigger; closes on selection, Escape, or outside click; arrow keys move selection.
- **Accessibility:** `role="menu"`/`listbox` as appropriate, full keyboard operability, current selection indicated both visually and via `aria-selected`.
- **Variants:** menu (actions), select (single value), multi-select.
- **States:** closed, open, item-hover/focus, selected.

### Tooltips

- **Purpose:** supplemental context for an icon-only or ambiguous control — never load-bearing information.
- **Hierarchy:** elevation level 3, minimal footprint, `--text-caption` or `--text-body-sm`.
- **Interaction:** appears after a short hover delay or on focus, `duration-fast`; disappears immediately on blur/mouse-leave.
- **Accessibility:** triggered on keyboard focus, not just mouse hover; content also exposed via `aria-label` on the target so screen readers aren't dependent on the tooltip rendering.
- **Variants:** label-only tooltip, keyboard-shortcut tooltip (shows the shortcut in `--font-mono`).
- **States:** hidden, visible.

### Badges

- **Purpose:** compact status or category label.
- **Hierarchy:** `--text-caption`, pill or `radius-sm` shape, colored per §2 semantic meaning (never decorative color).
- **Variants:** neutral, success, warning, error, info — one-to-one with the semantic colors in §2.
- **States:** static (badges are not interactive).

### Tabs

- **Purpose:** switch between mutually exclusive views of related content (the SQL/Drizzle/JSON/Docs output tabs).
- **Hierarchy:** active tab uses `--accent-violet` indicator + `--text-primary`; inactive tabs use `--text-secondary`.
- **Interaction:** arrow-key navigation between tabs when a tab has focus; `duration-fast` indicator transition.
- **Accessibility:** `role="tablist"`/`tab`/`tabpanel`, active tab reflected via `aria-selected`.
- **Variants:** default (underline indicator).
- **States:** active, inactive, hover, focus, disabled.

### Tables

- **Purpose:** dense, scannable structured data.
- **Hierarchy:** header row uses `--text-caption` weight/case, `--border-subtle` row dividers, no vertical grid lines unless density genuinely requires them.
- **Interaction:** sortable columns indicate direction via icon, not color alone; row hover uses `--surface-1`.
- **Accessibility:** semantic `<table>` markup with proper `<th scope>`; never a div-grid pretending to be a table.
- **Variants:** static, sortable, with row actions.
- **States:** rest, row-hover, row-selected, empty (see Empty states).

### Navigation (top-level)

- **Purpose:** orient the user and provide access to primary destinations.
- **Hierarchy:** the single source of truth for nav destinations drives every surface that lists them (sidebar, command palette, top-bar title) — never a second hardcoded list.
- **Interaction:** active destination indicated via `--accent-violet` + distinct icon (§9) + `--text-primary`.
- **Accessibility:** current page indicated via `aria-current="page"`.

### Sidebar

- **Purpose:** persistent primary navigation in the authenticated app.
- **Hierarchy:** elevation level 1 (`surface-1`, border only, no shadow).
- **Interaction:** collapses to icon-only below `lg` and on manual toggle; collapse/expand transitions at `duration-slow`.
- **Accessibility:** collapsed icon-only state still exposes full labels via `aria-label`/tooltip, never label-only-when-expanded.
- **States:** expanded, collapsed, item-active, item-hover.

### Breadcrumbs

- **Purpose:** show location within a hierarchy deeper than the top-level nav (e.g., Project → Workbench).
- **Hierarchy:** `--text-body-sm`, `--text-muted` for all but the current/final segment, which uses `--text-primary`.
- **Interaction:** every non-final segment is a functioning link.
- **Accessibility:** wrapped in `<nav aria-label="Breadcrumb">` with an ordered list.

### Toasts

- **Purpose:** transient, non-blocking feedback for an action's result (copy success, save error).
- **Hierarchy:** elevation level 3, fixed position, colored border/icon per semantic meaning (§2) — success uses emerald, error uses rose; this is the first mandatory consumer that wires the currently-unused `emerald` token.
- **Interaction:** enters at `duration-base`, auto-dismisses after a fixed interval (errors may persist longer or require manual dismissal), exits at `duration-fast` with `ease-exit`.
- **Accessibility:** `role="status"` (success/info) or `role="alert"` (error), announced via `aria-live` — already the established pattern for async status.
- **Variants:** success, error, warning, info.

### Empty states

- **Purpose:** explain absence of content and, where applicable, offer the one action that resolves it.
- **Hierarchy:** centered, `--text-secondary` body copy, at most one primary button.
- **Rule:** never a blank screen with no explanation — every empty state names what's missing and, if there's a next step, names it as a single clear action.

### Loading states

- **Purpose:** communicate that the system is working, not frozen.
- **Hierarchy:** skeletons matching the shape of the content they'll be replaced by are the default (§8); indeterminate spinners only for sub-2-second actions.
- **Accessibility:** always paired with an `aria-live="polite"` text equivalent.

### Error states

- **Purpose:** communicate what failed and, where possible, what to do next.
- **Hierarchy:** `--accent-rose` accent, icon + message, never color alone.
- **Rule:** an error state always explains the failure in plain language and offers a recovery action (retry, go back, contact support) where one exists — never a dead end.

### Skeletons

- **Purpose:** placeholder that mirrors the layout of the content about to load, reducing layout shift and perceived wait.
- **Hierarchy:** `--surface-1` blocks matching the target content's approximate shape/size, subtle pulse animation respecting `prefers-reduced-motion`.

---

## 11. Accessibility Standards

- **WCAG target:** WCAG 2.1 AA, product-wide, as a floor — not an aspirational target.
- **Contrast:** minimum 4.5:1 for body text, 3:1 for large text (≥18px/24px bold-equivalent) and for UI component boundaries (input borders, focus indicators). Every text/background token pairing in §2 must be checked against this before use, in both light and dark mode.
- **Keyboard navigation:** every interactive element is reachable and operable via keyboard alone, in a logical (visual) order; no keyboard traps; `Escape` closes any overlay (dialog, dropdown, tooltip, command palette).
- **Focus indicators:** always visible, using the `--ring` token; never removed (`outline: none`) without an equivalent, clearly visible replacement; minimum 2px effective offset from the element edge.
- **Screen reader considerations:** semantic HTML first (`<button>`, `<nav>`, `<table>`), ARIA only to fill genuine gaps; async state changes (loading, generation complete, errors) are announced via `aria-live`, matching the pattern already established in `GenerationStatus`.
- **Touch targets:** minimum 44×44px effective hit area for every interactive control, regardless of visual icon/button size — achieved through padding, not by enlarging the visible element.

---

## 12. Design Constraints

Explicitly disallowed, product-wide:

- Spacing values outside the §4 scale.
- Decorative gradients with no semantic purpose (a gradient must communicate something — e.g., a generation-in-progress shimmer — not exist for visual interest alone).
- Glassmorphism/backdrop-blur beyond the single sanctioned use (a dialog's backdrop scrim, §6/§10).
- More than one shadow style visible in the same screen region.
- Border-radius values outside the §7 scale.
- More than one accent color driving primary attention within the same view (semantic colors for status are fine alongside it; two *competing* brand-weight accents are not).
- Motion durations or easing curves outside §8.
- More than one icon library, or inconsistent stroke weight within Lucide.
- More than three font weights in use anywhere (400/500/600 — never 700+).
- Any hover-only affordance without a keyboard/focus equivalent.
- Text/background combinations that fail the §11 contrast minimums.

---

## 13. Developer Rules

1. **Never invent a new spacing value.** Use `space-1` through `space-16` (§4) only. If nothing fits, that's a signal to reconsider the layout, not to reach for an arbitrary pixel value.
2. **Never introduce a new semantic color without design-system approval.** `--accent-sky` (Info) is the one sanctioned addition in this sprint. `emerald` and `amber` already exist and must be wired to their defined roles (success, warning) wherever those states occur — they are not available for other uses.
3. **Reuse existing shadcn component variants before creating a new one.** A new visual variant of an existing component requires a documented reason it can't be expressed with what already exists.
4. **Follow the typography hierarchy exactly.** No ad hoc `text-2xl`/`text-4xl`/etc. utilities — consume the `--text-*` tokens (§3). This directly closes the gap flagged in the UX 2.0 audit, where the scale was defined but never consumed by any component.
5. **Preserve every accessibility requirement in §11 on every new component**, not just the ones a reviewer happens to test.
6. **One icon library, one icon per meaning.** Sidebar and other primary-nav icons must be visually distinct per destination — no repeated placeholder icon across different destinations.
7. **All elevation must use the four-tier surface + shadow system in §6.** No ad hoc `box-shadow` values.
8. **All motion must use the duration/easing tokens in §8.** No ad hoc `transition` values or timing functions.
9. **When a need falls outside this system** — a color, spacing value, radius, or duration that genuinely doesn't fit — escalate to the design system owner and extend this document before implementing locally. A local one-off is how design systems rot.
