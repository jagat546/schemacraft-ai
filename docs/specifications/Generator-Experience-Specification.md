# Generator Experience Specification

**Status:** Sprint 3 deliverable. Specification only — no implementation. This is the heart of the product; every interaction below is fully documented, per the sprint brief.

**Governing documents:** `Design-System-2.0.md`.

**Current baseline this extends:** `features/ai-workspace`'s `SchemaGenerator` (project selector + `PromptEditor` + `GenerationStatus` + `OutputTabs`), backed by `useGenerateSchema` and `generation-store`. The prompt is capped at 4000 characters with a live `{count}/{max}` counter (`--text-caption`). Generation is currently a single request/response (not streamed): idle → generating (skeleton + `aria-live` announcement) → success (five artifacts in `OutputTabs`, split-pane with the Mermaid ERD when present) or error. Output actions (copy/download) are already generic across all five artifact types via a shared `OutputActions`/`OUTPUT_CONFIG` pair.

---

## Prompt Editor

- **Purpose:** the single input surface for the entire product — a natural-language description of a data model.
- **Interaction:** a `Textarea` (Design System 2.0 §10) sized generously (minimum ~6 visible rows, resize vertical-only), auto-focused when the Generator route loads with no in-flight generation. Live character counter (`--text-caption`) shifts to `--accent-amber` at 90% of the 4000-char cap and `--accent-rose` if somehow exceeded (should be prevented client-side via `maxLength`, matching the existing pattern).
- **Keyboard shortcuts:** `Cmd/Ctrl+Enter` submits the prompt from within the textarea (new — today submission requires clicking Generate); `Escape` while focused and the field is empty returns focus to the project selector; both are registered through the existing `KeyboardShortcutProvider` registry, not a local listener, to avoid the exact "ad hoc `addEventListener`" conflict that provider was built to prevent.
- **Empty state:** when the field is empty, placeholder text models a good prompt (a real example, not "Enter your prompt here") — this doubles as the first-time onboarding hint referenced in `Dashboard-Experience-Specification.md` §Onboarding.

## Prompt Suggestions **(new)**

- **Purpose:** help a user who has an idea but doesn't know how to phrase it for best results.
- **Interaction:** a small row of 3–4 suggestion chips (pill shape, `--text-body-sm`) beneath the textarea, shown only when the field is empty — e.g., "E-commerce store," "Blog with comments," "SaaS billing system." Clicking a chip fills the textarea with a complete, well-formed example prompt for that domain (not just a topic keyword) and focuses the field for editing, it does not auto-submit.
- **Why it exists:** reduces the single biggest first-use failure mode — a blank textarea and no sense of what "good input" looks like — without forcing every user through a tutorial.
- **Success criteria:** a first-time user with no prior prompt-writing experience can produce a usable generation by clicking one chip and pressing Generate, unedited.

## Templates **(new)**

- **Purpose:** a step beyond suggestions — a curated starting *structure* a user can adapt, for users who know their domain but want a scaffold (e.g., "Multi-tenant SaaS" implies specific patterns — tenant isolation, org membership — that are hard to phrase from scratch).
- **Interaction:** a "Start from a template" secondary link near the prompt editor (not a competing primary action) opens a lightweight picker (dropdown or small dialog, elevation level 3) listing template names with a one-line description each. Selecting one populates the prompt editor with a longer, structured prompt the user can edit before generating — templates never generate immediately on selection, since the whole point is the user reviews and adapts the text first.
- **Distinction from Prompt Suggestions:** suggestions are single-domain starting phrases aimed at first-time users; templates are more structurally complete starting points aimed at users who already know they want a specific, somewhat complex pattern. Both write into the same textarea; neither bypasses user review before submission.

## Streaming Generation **(shipped as a staged reveal, S4-012 — see below)**

**Implementation note (S4-012):** this section originally specified genuine per-artifact streaming — each artifact appearing as the backend produces it, with slower ones still loading while faster ones are already usable. Implementing S4-012, `lib/services/generation.service.ts` was read directly: the pipeline makes exactly one AI call (`geminiProvider.generateAST`), then runs all five compilers synchronously, in-process, against the same already-complete AST, with no per-artifact latency to stream. All five artifacts become available at the same instant, right after the single Server Action resolves — there is no natural point where "SQL is ready but Drizzle isn't." Fabricating one (artificial delays between reveals) would misrepresent system state, which `Design-System-2.0.md`'s "AI should never surprise users negatively" principle rules out. Full accounting of this decision lives in `Sprint-04-Implementation-Roadmap.md` §1.

**What shipped instead — an honest staged reveal:** the five artifacts' completion indicators populate in the same fixed order originally specified (SQL → Drizzle → JSON → Documentation → ERD), with a brief, consistent stagger (`StagedOutputReveal`, `features/ai-workspace/components/staged-output-reveal.tsx`), but every indicator's underlying content is already fully present the instant the component mounts — `OutputTabs` itself is never gated behind the reveal sequence, and a user can click ahead to already-complete content at any point. The reveal paces *how the completion indicators are presented*, not *when data becomes available*, which is the honesty distinction that makes this different from simulated/fake progress.

- **Behavior:** each artifact's indicator dot turns `--accent-emerald` in order, one per `duration-fast` (150ms) interval, backed by data that has already arrived in full.
- **Order:** fixed (SQL → Drizzle → JSON → Documentation → ERD), matching the original spec's ordering rationale — predictability, not arbitrary pacing.
- **Fallback:** artifacts absent from a given result (e.g., no `mermaidDiagram`) are simply not included in the sequence — there is no "waiting" state for something that was never going to arrive.
- **Deferred, not abandoned:** true AI-token-level streaming (streaming the single Gemini call itself and incrementally validating/compiling partial output) remains a real, distinct future possibility, explicitly out of scope for Sprint 4 — it would require changes to `lib/ai/providers/gemini.ts` and `lib/ast/validator.ts` well beyond a UX-implementation task, and needs its own architecture review before it's taken on.

## Progress Indicators

- **Purpose:** make an in-flight generation feel accountable, never like the UI has frozen.
- **Interaction:** the existing `GenerationStatus` "generating" skeleton, extended for streaming: a top-level progress indicator (e.g., "3 of 5 artifacts ready") in `--text-body-sm`, plus per-tab completion dots described above. The visually-hidden `aria-live="polite"` announcement (existing pattern) fires on each artifact completion, not just once at the end, so screen-reader users get the same incremental feedback sighted users do.
- **Rule:** progress indicators never show a fake/simulated percentage — if the backend can't report real sub-progress, the indicator stays qualitative ("Generating…") rather than inventing a number that doesn't correspond to anything, per the "AI should never surprise users negatively" principle (a fake 80%-then-stuck progress bar is a classic trust violation).

## Split View / Resizable Layout

- Identical pattern to the Workbench's `SplitPaneCanvas` (reused, not reinvented, per Design System 2.0 §13.3): code/document tabs on one side, the Mermaid ERD on the other, horizontal on desktop, stacked vertically on mobile via the existing `useIsMobile()` pattern. The divider is draggable, with a sensible min/max pane width so neither side can be resized to unusable.

## SQL / Drizzle / JSON / ER Diagram Preview

- All four (plus Documentation) render through the existing shared `OutputViewerFrame` + `OutputActions` pattern — `CodeViewer` (line-numbered, syntax-highlighted, `--font-mono`/`--text-code`) for SQL/Drizzle/JSON, `MarkdownViewer` for Documentation, `MermaidViewer` + `MermaidCanvas` (pan/zoom, keyboard-operable via arrow keys when focused) for the ERD. No changes to this pattern — it already meets the standard.
- **ER Diagram specifics:** zoom in/out/reset controls (existing), plus a "Fit to view" default on first render so a large schema doesn't open zoomed to an unreadable 100%.

## Generation History

- The existing `/dashboard/projects/[id]/history` list (newest first, opens any past generation into the same `OutputTabs` view via `?generation=<id>`, delete behind a confirmation dialog) is retained as-is. From the Generator screen itself, a compact "View history" link sits near the project selector so a user mid-session can jump to a past version without leaving the generation flow entirely (opens history in the same tab — this is a navigation, not a modal, since history is a first-class screen).

## Copy UX

- Every artifact has a copy icon button (existing `OutputActions` pattern) — click copies that artifact's full content to the clipboard, with a success toast (`--accent-emerald`, per Design System 2.0 §10 Toasts) and an inline icon swap (copy icon → checkmark for `duration-fast`, then reverts) so success is visible even if the user's eyes aren't on the toast.
- **Failure:** if clipboard access is denied by the browser, the toast shows an error state (`--accent-rose`) with the reason, never a silent no-op.

## Export UX **(new)**

- **Purpose:** let a user take the *entire* generation (all five artifacts) at once, not just one at a time — useful when handing a schema off to a teammate or committing it to a repo.
- **Interaction:** a single "Export all" action (secondary button, near the tab strip) bundles all artifacts into a zip (SQL file, Drizzle file, JSON file, Markdown doc, and the ERD as both `.mmd` source and a rendered `.svg`), triggering one browser download. This is additive to, not a replacement for, per-artifact copy/download.

## Download UX

- Per-artifact download (existing `OutputActions` pattern) — one click, correct file extension and MIME type per `OUTPUT_CONFIG`, success toast. No changes; this already meets the bar.

## Failure Recovery **(partially shipped — see implementation note)**

- **Purpose:** a failed generation must never be a dead end.
- **Interaction:** on failure, `GenerationStatus` shows an error state (per `Error-Experience.md`) with the specific failure reason where one is known (rate limit, prompt rejected for length, model error) and a **Retry** button that resubmits the exact same prompt without requiring the user to retype anything. The prompt text is never cleared on failure — losing a carefully-written prompt after a failed attempt is exactly the kind of negative surprise Core Experience Principle #5 forbids.
- **Partial-streaming failure:** if streaming generation fails after some artifacts already completed, those completed artifacts remain visible and usable; only the failed remainder shows the error/retry state, scoped to what actually failed.

**Implementation note (S4-017 closure audit):** the prompt-preservation half of this section shipped and is verified — `generation-store.ts`'s error state never clears `prompt`. The other two bullets above did not ship and predate Sprint 4 entirely (no S4-0XX roadmap task was ever scoped to build them): `GenerationStatus`'s error branch is a plain message with no **Retry** button anywhere in the Generator today, and "partial-streaming failure" describes a granularity that is architecturally impossible given the same fact that drove §Streaming Generation's own resolution above — one atomic AI call compiled into all five artifacts at once means there is no "SQL succeeded but JSON failed" state to recover from partially; a failure is a failure of the single request, all-or-nothing. Tracked as `TECH_DEBT.md` TD-022 rather than silently left unimplemented.

## Success States

- On full completion, the generating skeleton is replaced by `OutputTabs` with the first artifact (SQL) pre-selected, plus a brief, single success toast — not a celebratory overlay (see Micro-Interactions.md confetti policy: this action, while satisfying, is a routine part of the product's core loop, not a rare milestone, so it does not get a celebratory animation every time).
- The generation is automatically and immediately visible in Generation History with no separate "save" step — persistence is implicit in the existing architecture and should stay that way.

## First-Time Onboarding

- No separate onboarding flow within the Generator itself. The first-time experience is carried entirely by: an empty-state placeholder prompt that models good input, Prompt Suggestions chips, and (per `Dashboard-Experience-Specification.md`) a direct route from account creation into a pre-selected project. A first-time user reaches a completed generation through the same screen and the same actions a returning user uses — there is no "training wheels" mode that later has to be turned off.

## Undo / Retry Behavior

- **Retry:** covered under Failure Recovery — always available, always resubmits the same prompt.
- **Undo:** generation itself is not destructively undoable (each generation is a new, versioned history entry, never overwriting a prior one — this is a feature, not a gap, since it means nothing is ever lost). What *is* undoable: deleting a generation from History shows a brief "Generation deleted — Undo" toast (per `Error-Experience.md` / `Micro-Interactions.md` notification pattern) with a time-limited undo action, since deletion is the one genuinely destructive, hard-to-reverse action in this flow.

## Loading States

- Per-artifact skeletons (existing `OutputSkeleton`, extended for streaming per above) — shape-matched placeholders, not spinners, for anything expected to exceed the ~2-second spinner threshold set in Design System 2.0 §8.
- The project selector and prompt editor remain fully interactive during generation for a *different* project's future prompt (the user may want to queue their next thought) but the Generate button itself is disabled and shows a loading state for the current in-flight request, preventing duplicate submissions.

## Animation Sequence

Full sequence, start to finish, all durations/easing per Design System 2.0 §8:

1. User submits (click or `Cmd/Ctrl+Enter`) → Generate button transitions to its loading state at `duration-instant`.
2. `GenerationStatus` skeleton fades in at `duration-base`/`ease-standard`, replacing the previous output (if any) — no layout jump; the skeleton occupies the same region the result will occupy.
3. As each artifact streams in, its tab's completion dot appears at `duration-fast`; if it's the currently-selected tab, the skeleton content cross-fades to real content at `duration-base`.
4. On full success, the success toast enters at `duration-base`/`ease-standard` and auto-exits at `duration-fast`/`ease-exit` after its display interval.
5. On failure, the error state replaces the skeleton with the same cross-fade timing as a successful artifact — failure is never visually jarring or abrupt relative to success, it simply communicates a different outcome.

No step in this sequence exceeds `duration-slow` (320ms); the entire chrome-level transition budget for a single generation's UI response is under half a second, independent of how long the actual AI generation takes.
