# Empty State Library

**Status:** Sprint 3 deliverable. Specification only.

**Governing documents:** `Design-System-2.0.md` §10 (Empty states component standard).

**Shared layout pattern:** every empty state in this library follows the same structure, so the product never presents an inconsistent "nothing here" experience — centered content within its region, an icon or small illustrative glyph (Lucide, per Design System 2.0 §9 — no custom illustration system), one sentence in `--text-secondary` explaining *why* it's empty, and at most one primary-weight action button where a next step genuinely exists. If there's no meaningful action, the state explains and stops — it does not invent a button for the sake of having one.

**Guiding rule (from the sprint brief):** every empty state should educate. "Educate" means the user leaves understanding either what would normally be here, or what they need to do to make something appear here — never just "No results."

---

## No Projects

- **Trigger:** a brand-new account's Dashboard, before any project has been created.
- **Message:** "Projects are where your generations live. Create one to get started." — teaches what a project *is*, not just that the list is empty.
- **Visual:** centered, replaces the entire metrics row + grid region (per `Dashboard-Experience-Specification.md` §Empty States).
- **Primary action:** "Create your first project" — the single most primary action available anywhere in a new account, routes into `CreateProjectDialog`.
- **Educates by:** defining "project" in-context, right where the user needs the definition.

## No History

- **Trigger:** a project's `/history` route, before any generation has ever been created for that project.
- **Message:** "No generations yet. Every schema you generate for this project will show up here, so you can revisit or compare past versions."
- **Visual:** centered within the History list region.
- **Primary action:** "Generate a schema" — routes to the Generator with this project pre-selected.
- **Educates by:** explaining History's purpose (versioned past generations) before the user has any entries to infer it from.

## No Search Results

- **Trigger:** Dashboard project search (`Dashboard-Experience-Specification.md` §Search) or a filter combination that matches nothing.
- **Message:** "No projects match '[query]'." When filters are also active: "No projects match '[query]' with the current filters."
- **Visual:** centered within the grid region, replacing the cards — the metrics row above stays visible so the user retains context that they *do* have projects, this specific query just didn't match any.
- **Primary action:** "Clear search" (and, if filters are active, "Clear filters" as a secondary action) — never leaves a user in a dead-end filtered-to-zero state with no way back.
- **Educates by:** distinguishing "you have zero projects" (see above) from "you have projects, but none match this query" — these are different situations and must never share the same message.

## Offline

- **Trigger:** the client detects a lost network connection (e.g., a fetch/Server Action fails with a network error, or `navigator.onLine` reports false) while attempting any data operation.
- **Message:** "You're offline. Reconnect to continue." Read-only content already loaded in the page (e.g., a generation already rendered in the Workbench) remains visible and usable — going offline does not blank out content the browser already has.
- **Visual:** a persistent, low-emphasis banner (`--surface-1`, `--accent-amber` accent icon) rather than a full-page takeover, since offline is often transient and the user may still want to read what's already loaded.
- **Primary action:** none required — the banner auto-dismisses the moment connectivity returns, and any action attempted while offline (e.g., clicking Generate) is blocked with an inline message rather than silently failing (see `Error-Experience.md` §Network Failures).
- **Educates by:** naming the actual condition (offline) instead of presenting a generic error that leaves the user guessing whether it's their connection or the product.

## No Generations

- **Trigger:** distinct from "No History" — this is the Generator screen itself, for a project that has never had a prompt submitted (the pre-first-generation state within the active generation surface, not the historical list).
- **Message:** carried by the Prompt Editor's placeholder text modeling a good example prompt, plus the Prompt Suggestion chips (`Generator-Experience-Specification.md` §Prompt Suggestions) — there is no separate "empty state screen" here, because an empty prompt editor with helpful placeholder content already satisfies the same educational goal without adding a redundant intermediate screen.
- **Educates by:** showing, not telling — a well-formed example prompt teaches the input format faster than an instructional paragraph would.

## Permission Denied

- **Trigger:** a user attempts to access a project, generation, or resource they don't own (e.g., a stale/shared Workbench URL for a project that isn't theirs, or a resource whose ownership check fails).
- **Message:** "You don't have access to this project." Deliberately does not confirm or deny whether the resource exists under someone else's account (a security-conscious choice, matching the Password Reset messaging pattern in `Navigation-Experience-Specification.md`).
- **Visual:** full-region replacement (not a banner — this blocks the entire intended content, so it should occupy the space that content would have).
- **Primary action:** "Back to Dashboard" — the one universally-valid next step regardless of what the user was trying to reach.
- **Educates by:** being unambiguous that this is a permissions issue, not a bug or a "page not found" — the user shouldn't waste time troubleshooting their own client.

## Rate Limit Exceeded

- **Trigger:** the public sandbox's existing 5-requests/60-minute cap (`check_sandbox_rate_limit`), or any future authenticated-tier rate limit.
- **Message (sandbox, unauthenticated):** "You've reached the free preview limit. Sign up for full access — no rate limit for your own projects." — framed as an upgrade invitation, matching the existing, correct pattern (`Landing-Experience-Specification.md` §Live Playground), not as a punitive wall.
- **Message (authenticated, future tiered limits):** states the specific limit and when it resets (e.g., "You've reached your plan's generation limit for this month. Resets [date]."), with a link to Account Settings §Billing if applicable.
- **Primary action:** sandbox — "Sign up"; authenticated — "View plan" (Account Settings billing section) or simply wait, if that's genuinely the only option.
- **Educates by:** always stating the concrete limit and reset condition, never a vague "try again later."

## Server Unavailable

- **Trigger:** the AI generation backend or the database is unreachable/erroring at the infrastructure level (not a user error, not a rate limit).
- **Message:** "Something's wrong on our end, not yours. Please try again in a moment." — explicitly reassures the user the failure isn't their prompt or their mistake, which matters specifically because this is an AI product and the instinct is to suspect the request was somehow wrong.
- **Visual:** same error-state visual language as `Error-Experience.md` §Unexpected Errors (`--accent-rose` accent, icon, message) — this is a specific instance of that general error category, not a separately-styled state.
- **Primary action:** "Retry" — and, per `Generator-Experience-Specification.md` §Failure Recovery, if this occurs during a generation, the prompt is preserved so retry costs nothing.
- **Educates by:** clearly separating "the system failed" from "you did something wrong," which is the single most trust-preserving distinction an AI product's error copy can make.
