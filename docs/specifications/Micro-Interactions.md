# Micro-Interactions

**Status:** Sprint 3 deliverable. Specification only — no implementation, no new motion/color tokens.

**Governing documents:** `Design-System-2.0.md` §8 (Motion), §2 (Color), §10 (Component Standards), §11 (Accessibility). Every duration, easing curve, and color cited below is a named token from that document — this spec does not introduce any new one.

**Scope note:** this document also covers the **Accessibility Experience** deliverable from the Sprint 3 brief (§Accessibility Experience below), because interaction states and accessibility are two views of the same thing — a hover state that has no focus equivalent is an accessibility bug, not a separate concern. This decision is recorded in `Sprint-03-Summary.md`.

**Guiding rule, restated from the sprint brief:** every animation must improve usability. If a micro-interaction below can't be justified by one of: confirming an action registered, preserving spatial continuity, or communicating system state — it doesn't belong in the product (Design System 2.0 §8, Core Experience Principle #10).

---

## Interaction States

Every interactive element in the product — button, card, input, tab, nav item — implements this exact state set. No component may skip a state that applies to it, and no component may add a state not listed here without a design-system update.

| State | Visual response | Duration/Easing | Notes |
|---|---|---|---|
| **Rest** | Baseline appearance per the component's Design System 2.0 §10 spec. | — | |
| **Hover** | Background/border/text color shifts one step (e.g., `surface-2` → `surface-1`-adjacent hover tint, or `--text-secondary` → `--text-primary`). Never a scale/transform on functional controls. | `duration-fast`, `ease-standard` | Mouse-only signal; must have an equivalent Focus state for keyboard users — hover conveying information with no focus equivalent is a §Accessibility Experience violation. |
| **Focus** | Visible ring using `--ring`, minimum 2px effective offset. Always rendered — never suppressed for mouse users via `:focus-visible`-only styling if that would leave keyboard users without it; `:focus-visible` is acceptable specifically because it still shows the ring for keyboard interaction, which is the point. | Instant (no transition delay on appearance — a delayed focus ring reads as lag). | Every interactive element must reach this state via `Tab`. |
| **Active / Pressed** | A momentary, slightly deeper shift than hover (e.g., one further step of background darkening/lightening) — confirms the click/tap registered before any async result is known. | `duration-instant` | Applies to buttons, toggles, cards, tabs — anything that responds to a press before a network round-trip completes. |
| **Success** | `--accent-emerald` accent (icon and/or border, never a full-surface color flood), paired with an icon (checkmark) — never color alone. | Enter: `duration-base`/`ease-standard`. Exit (if transient, e.g. a toast): `duration-fast`/`ease-exit`. | See §Notifications for the toast-specific pattern. |
| **Error** | `--accent-rose` accent, paired with an icon and a text message — never color alone. | Same timing as Success. | See `Error-Experience.md` for full messaging rules; this section governs only the visual/motion behavior. |
| **Loading** | Component-appropriate: button label replaced by a spinner (sub-2s actions) or the surrounding content replaced by a skeleton (§Skeletons, anything longer). | Enter: `duration-base`. | Never both a spinner and a skeleton for the same piece of content. |
| **Disabled** | `--text-muted` text, no hover/active response, `cursor: not-allowed`. Genuinely non-interactive (`disabled` attribute / equivalent), never a clickable-looking element that silently no-ops — the existing Project Settings "Coming soon" pattern is the standard (Design System 2.0 §1). | — | If a disabled control needs an explanation ("Coming soon," "Requires Pro plan"), it's shown via label/badge/tooltip, never by letting the user click and discover nothing happens. |

## Transitions

- Panel/layout transitions (sidebar collapse, dialog open, split-pane resize) use `duration-slow`/`ease-standard` on entrance, `ease-exit` on exit — covered fully in Design System 2.0 §8.
- Content transitions within a fixed layout (tab switch, cross-fade from skeleton to real content) use `duration-base`.
- No transition in the product exceeds `duration-slow` (320ms). If something feels like it needs more time to read as smooth, the fix is simplifying what's changing, not lengthening the timer.

## Skeletons

- Shape-matched to the content they precede (existing `OutputSkeleton` pattern) — a skeleton for a code block looks like lines of code-length blocks, not a generic gray rectangle.
- Subtle pulse animation (opacity oscillation, not position movement), respecting `prefers-reduced-motion` (pulse disabled, static mid-tone shown instead — still communicates "loading" via shape, just without motion).
- Used for content loads expected to exceed the ~2-second spinner threshold set in Design System 2.0 §8; a load resolving well inside that window shows no indicator at all (a flash of a skeleton for a 200ms load is itself a usability regression — instant content is calmer than an unnecessary loading flicker).

## Notifications (Toasts)

- Enter at `duration-base`/`ease-standard` from a fixed screen position (consistent position across the whole product — always the same corner); exit at `duration-fast`/`ease-exit`.
- Auto-dismiss interval: success/info toasts dismiss after a few seconds; error toasts either persist until manually dismissed or use a longer interval — an error is more likely to need re-reading or action than a success confirmation.
- Multiple simultaneous toasts stack, most recent on top, each independently dismissible; the product avoids triggering more than one toast for a single logical user action (e.g., a bundled export produces one toast, not five).
- `role="status"` for success/info, `role="alert"` for error, per Design System 2.0 §10/§11 — this is both a component-standard and an accessibility requirement, stated once here to avoid duplicating it inconsistently across documents.

## Confetti Policy

- **Default: none.** Per Core Experience Principle #10 ("remove anything that exists only because it looks cool") and the reasoning in `Generator-Experience-Specification.md` §Success States: a completed generation is the product's *routine* core loop, not a rare milestone — celebrating it every time cheapens the celebration and adds motion that doesn't serve usability.
- **The one sanctioned exception, if the product ever wants one:** a true first-time-only milestone (e.g., a user's very first successful generation, ever) may get a single, restrained celebratory moment — never full-screen confetti, never sound, never something that blocks or delays the user from seeing their actual result. If implemented, it fires once per account, ever, and is themed identically light/dark. Absent an explicit product decision to add this, it does not exist.
- Nothing else in the product (project creation, export, deletion-undo) gets celebratory animation — a success toast is sufficient acknowledgment for all of these.

## Progress Indicators

- Indeterminate (spinner) only for sub-2-second actions with no meaningful sub-steps to report.
- Determinate/qualitative (e.g., "3 of 5 artifacts ready," per `Generator-Experience-Specification.md` §Progress Indicators) for anything longer or multi-step — and only ever reflects real, known progress. A simulated/fake progress percentage is explicitly disallowed (Design System 2.0's "AI should never surprise users negatively" applied to the system's own honesty about its state).

---

## Accessibility Experience

Restates and applies Design System 2.0 §11 concretely, per surface, so no future screen can claim ambiguity about what "accessible" means here.

### Keyboard Navigation

- Every interactive element reachable via `Tab`, in an order matching visual/logical reading order.
- No keyboard traps anywhere — a dialog, dropdown, or the Monaco editor's find widget (`Workbench-Experience-Specification.md`) must always have a working `Escape` or equivalent exit.
- Every mouse-only affordance described in this document (hover states) has a keyboard-reachable equivalent (focus states) — enforced as a rule, not a per-component judgment call.

### Screen Readers

- Semantic HTML first: `<button>` for actions, `<nav>` for navigation regions, `<table>` for tabular data (never a div-grid impersonating a table, per Design System 2.0 §10 Tables).
- Every async state change described in this document (generation progress, toast notifications, skeleton-to-content swaps) is announced via `aria-live="polite"` (`role="alert"` for errors) — extending the existing, already-correct `GenerationStatus` pattern to every future async surface, including the streamed per-artifact completion events in `Generator-Experience-Specification.md`.
- Icon-only controls always carry an `aria-label` in addition to their visual Tooltip (existing pattern, `OutputActions`/`ZoomControls`) — retained as the mandatory standard for any new icon-only control (Fullscreen toggle, Workbench panel-collapse chevrons, etc.).

### Focus Management

- Opening a dialog moves focus into it (first focusable element or the dialog itself) and traps it there while open; closing returns focus to the element that triggered it — applies to every dialog-class component (`CreateProjectDialog`, confirmation dialogs, the Templates picker in `Generator-Experience-Specification.md`, the command palette).
- A route change that meaningfully changes the primary content (e.g., completing a generation) may move focus to the new content's heading for screen-reader users, but never in a way that yanks a sighted, actively-typing user's focus away from an input they're still using.

### Reduced Motion

- `prefers-reduced-motion` disables all non-essential transitions product-wide: hover/press color shifts remain (they're not "motion" in the animation sense) but scale/slide/fade entrances, skeleton pulsing, and toast slide-in all switch to instant appearance/opacity-only equivalents, per Design System 2.0 §8.
- The Account Settings §Accessibility override (`Dashboard-Experience-Specification.md`) lets a user force this behavior regardless of OS-level setting.

### Contrast

- Every text/background and border/background pairing used anywhere in this document and the screen specs must meet Design System 2.0 §11's 4.5:1 (body text) / 3:1 (large text, UI component boundaries) minimums, in both light and dark mode. This is a hard gate on implementation, not a post-hoc audit item.

### Touch Targets

- Minimum 44×44px effective hit area for every interactive control regardless of visual size — icon buttons at 16–20px visual size (Design System 2.0 §9) still get 44×44px of padding-inclusive hit area. Applies equally to desktop-with-touchscreen and mobile.

### ARIA Expectations

- ARIA is additive, used only to fill a gap semantic HTML can't cover on its own (e.g., `aria-pressed` on the naming-convention toggle, `role="img"` + `aria-label` on the Mermaid-rendered SVG, `aria-current="page"` on the active nav item) — never a substitute for using the correct native element in the first place.

### WCAG AA Compliance

- WCAG 2.1 AA is the floor for every screen specified across all Sprint 3 documents, with no exceptions carved out for "just a marketing page" or "just an internal settings screen." A screen that doesn't meet this bar is not complete, regardless of visual polish.
