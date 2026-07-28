# User Journey Maps

**Status:** Sprint 3 deliverable. Specification only.

**Governing documents:** `Design-System-2.0.md`, and every other Sprint 3 specification — each journey below cites the specific screen/behavior spec responsible for each step, so a journey step is never an unsourced invention.

**Purpose:** validate that the screen-by-screen specifications actually compose into coherent, complete experiences end to end. Each journey traces one persona through the product and records their goal, friction points, emotional state, what the system does in response, and the outcome that must hold for the journey to count as successful.

---

## 1. First-Time Visitor

| | |
|---|---|
| **Goals** | Understand what SchemaCraft AI does; decide within seconds whether it's relevant. |
| **Pain points** | Marketing pages that oversell with no proof; not knowing if the tool "actually works" without signing up first. |
| **Emotional state** | Skeptical, low patience, comparing against tools already in their toolbox. |
| **System response** | `Landing-Experience-Specification.md`: hero states the value prop in one sentence within the first viewport; the Live Playground (existing `HeroSandbox`) lets them generate a real result with zero signup. |
| **Expected outcome** | Visitor either (a) runs a real prompt through the playground and sees genuine output, or (b) scans Feature Highlights + Visual Pipeline and understands scope without generating — either path resolves the 5-second comprehension bar from the UX Review Checklist. |

**Step-by-step:** land on `/` → read headline/sub-headline → (skeptical) scroll to or click "Try it now" → type a real idea into the sandbox → generate → see SQL/Drizzle/JSON/Docs/ERD render via `OutputTabs` → hit the sandbox's 5-request/60-minute rate limit only if they push past casual exploration, at which point the message frames signup as unlocking more, not as a wall (`Landing-Experience-Specification.md` §Live Playground).

---

## 2. First Generation (newly signed-up user)

| | |
|---|---|
| **Goals** | Get from "just created an account" to "I have a real schema" as fast as possible. |
| **Pain points** | Blank-page paralysis (an empty prompt field with no model of what "good input" looks like); not knowing if a project needs to exist first. |
| **Emotional state** | Motivated but uncertain — they signed up because the sandbox worked; they don't yet trust the full product. |
| **System response** | `Dashboard-Experience-Specification.md` §Onboarding: empty-state Dashboard leads directly into `CreateProjectDialog`, which on success routes straight into the Generator with the new project pre-selected. `Generator-Experience-Specification.md` §Prompt Suggestions gives them a starting point instead of a blank field. |
| **Expected outcome** | Two user actions (create project, submit a prompt) between account creation and a completed, persisted generation — no dead ends, no screen where the next step isn't obvious. |

**Step-by-step:** confirm email → land on empty `/dashboard` → click the single primary "Create your first project" CTA → name the project → land on `/dashboard/generator`, project pre-selected → click a Prompt Suggestion chip (or write their own) → Generate → watch streaming progress (`Generator-Experience-Specification.md` §Streaming Generation) → see the completed result and a success toast → (organically) notice it's already in History without having done anything to save it.

---

## 3. Returning User

| | |
|---|---|
| **Goals** | Get back to whatever they were working on, fast — not re-orient from scratch. |
| **Pain points** | A dashboard that shows projects in creation order instead of recency; no visible sense of "what did I touch last." |
| **Emotional state** | Task-focused, low tolerance for friction — they already know how the product works. |
| **System response** | `Dashboard-Experience-Specification.md` §Recent Projects: cards ordered by recency, not creation date; Quick Actions surfaces "Resume last generation" directly. Command palette search (`Navigation-Experience-Specification.md`) lets them jump straight to a named project without scanning the grid at all. |
| **Expected outcome** | A returning user reaches their intended project in one click (card) or one keystroke sequence (`Cmd/Ctrl+K` + name) — never more than that. |

**Step-by-step:** sign in → land on `/dashboard` → either click the top card (already the most recent) or hit `Cmd/Ctrl+K`, type a partial project name, select it → land directly in that project's Workbench or Generator depending on which command they picked.

---

## 4. Power User

| | |
|---|---|
| **Goals** | Operate the entire product without touching the mouse; manage many projects/generations efficiently; get IDE-grade tooling when reviewing complex schemas. |
| **Pain points** | Any action that has a keyboard-accessible *label* but not a keyboard-accessible *shortcut*; a code viewer that can't be searched, only scrolled. |
| **Emotional state** | Efficiency-focused, notices and is bothered by friction others might not — this persona is the backend-engineer audience named explicitly in `CLAUDE.md`. |
| **System response** | `Navigation-Experience-Specification.md` §Keyboard Navigation (full palette-driven navigation), `Generator-Experience-Specification.md` §Prompt Editor keyboard shortcuts (`Cmd/Ctrl+Enter` to submit), `Workbench-Experience-Specification.md` §Monaco Integration + §Keyboard Shortcuts (real find widget, minimap; see note below on the tab-jump/copy shortcuts specifically). |
| **Expected outcome** | A power user can create a project, generate a schema, review it in the Workbench, and export it, start to finish, without leaving the keyboard once they know the shortcut set (documented and discoverable via Account Settings §Keyboard Shortcuts, `Dashboard-Experience-Specification.md`) — with the two exceptions noted below. |

**Step-by-step:** `Cmd/Ctrl+K` → "New Project" → name it (Enter) → auto-routed to Generator → type prompt → `Cmd/Ctrl+Enter` → watch the staged reveal complete → click a tab to review an artifact → open Workbench via palette command ("Jump to generation…") → `Cmd/Ctrl+F` to search the generated SQL for a specific table name → use the command palette's "Copy [tab] to clipboard" entry to copy it.

**Implementation note (S4-017 closure audit):** `Workbench-Experience-Specification.md`'s keyboard shortcuts table also lists direct `Cmd/Ctrl+1..5` tab-jump and `Cmd/Ctrl+Shift+C` copy-current-tab bindings. S4-015 (which built the Workbench's other keyboard/command-palette infrastructure) scoped those two specific global bindings out to stay within its own roadmap acceptance criteria — the same actions remain reachable today via mouse (tab click) and the command palette's "Copy [tab] to clipboard" entry, just not via a dedicated keystroke. Tracked as `TECH_DEBT.md` TD-023.

---

## 5. Failed Generation

| | |
|---|---|
| **Goals** | Understand *why* it failed and get back to a working state without re-doing work. |
| **Pain points** | Losing a carefully-written prompt on failure; a generic "Something went wrong" with no path forward. |
| **Emotional state** | Frustrated, and — because this is an AI product — primed to distrust the whole tool if the failure feels opaque or arbitrary. This is the highest-stakes emotional moment in the product for trust preservation. |
| **System response** | `Generator-Experience-Specification.md` §Failure Recovery: prompt text is never cleared — verified, `generation-store.ts`'s `fail()` action only ever touches `state`. A dedicated Retry action now resubmits that preserved prompt directly (S6-001, closes `TECH_DEBT.md` TD-022). The journey's original step-by-step also described partial-artifact recovery, which was never built and never will be — corrected below to what the product actually does. |
| **Expected outcome** | The user's prompt is still there, the reason is legible, and a single Retry click resubmits it without retyping or re-navigating. |

**Step-by-step (as shipped):** submit a prompt → generation fails (the single AI call + compile step is all-or-nothing — there is no partial SQL/Drizzle-succeeded-but-JSON-failed state, per §Streaming Generation's own architecture note) → `GenerationStatus` shows the failure reason with a **Retry** action, prompt text still intact in the editor → user clicks Retry (or edits the prompt first, then Generate) → succeeds.

---

## 6. Export Workflow

| | |
|---|---|
| **Goals** | Get a finished schema out of the product and into their real project (repo, teammate, migration tool). |
| **Pain points** | Having to copy five artifacts one at a time when they actually want "everything, now"; not knowing which file format/extension they're getting. |
| **Emotional state** | Transactional — this is the moment the AI-generated output becomes their real infrastructure, so correctness (not surprising or malformed files) matters more than speed here. |
| **System response** | `Generator-Experience-Specification.md` §Export UX: single "Export all" bundles all five artifacts (plus the ERD as both `.mmd` and `.svg`) into one zip download; per-artifact copy/download remains available for single-file needs. |
| **Expected outcome** | A user who wants everything gets one correct zip in one click; a user who wants just the SQL file gets it in one click from the SQL tab — both paths exist and neither is more effort than it needs to be. |

**Step-by-step:** open a completed generation (fresh or from History) → click "Export all" → single download triggers → unzip locally → find SQL/Drizzle/JSON/Markdown files plus ERD source and rendered image, correctly named and typed. Alternative path: select the Drizzle tab only, click its download icon (`OutputActions`, existing) for a single-file need.

---

## 7. Project Management

| | |
|---|---|
| **Goals** | Organize multiple schemas across different real projects; find, revisit, and clean up old work. |
| **Pain points** | A flat, unfiltered grid once project count grows past a screenful; no way to tell generations apart within a project without opening each one. |
| **Emotional state** | Administrative, mildly impatient — this isn't the creative/generative part of the product, so friction here feels especially unjustified. |
| **System response** | `Dashboard-Experience-Specification.md` §Search / §Filters for finding a project; `Generator-Experience-Specification.md` §Generation History (version number, date, prompt shown per entry) for distinguishing generations within a project; delete flows (project and generation) always confirmed and, for generation deletion, undoable via the toast pattern in `Generator-Experience-Specification.md` §Undo/Retry Behavior. |
| **Expected outcome** | A user with 20+ projects and dozens of generations can find, review, and prune their work without ever feeling lost or risking accidental data loss. |

**Step-by-step:** land on `/dashboard` → type a partial name into Search to narrow 20 projects to 2 → open the right one's History → scan version numbers, dates, and original prompts to identify an old, no-longer-needed generation → delete it → see the "Generation deleted — Undo" toast, confirming the action registered and remains reversible for a few seconds → the entry is gone from the list, everything else unaffected.
