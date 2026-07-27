# Sprint 7 — Implementation Roadmap

**Status:** Planning only. No application code was written or modified to produce this document.
**Author role:** Product Manager / Technical Architect / Senior Staff Engineer (planning-only capacity this sprint — implementation deliberately not started).
**Source of truth:** The repository as it exists at Sprint 6 closure (`main` merge of `feature/sprint-6-application`, commit `03e4149`), read directly for this document — not assumed from prior planning docs. Where a prior document (`Sprint-06-Implementation-Roadmap.md`'s own "Future Roadmap" outline) sketched a direction, it was checked against the actual code before being carried forward, scoped down, or rejected — see §3 for where and why it changed.

---

## 1. Executive Summary

Sprint 6 closed a real cluster of gaps: Generator Retry, business-rule schema output quality, authenticated-user rate limiting, a working delete-account flow, a touch-target fix, and first-run onboarding. The product is now feature-complete for a single-user, single-provider generation workflow with a solid safety net (347 tests, full lint/typecheck/build gates). Auditing the repository directly (not the prior roadmap's own assumptions) for Sprint 7 surfaces a different shape of work than the Sprint 6 roadmap's own "Iterative Refinement & Schema Evolution" outline anticipated: that outline's headline idea — an AI that merges follow-up instructions into an existing AST — is genuinely new AI-prompting and AST-merge architecture, which this sprint's own constraints (prefer completing existing workflows, avoid speculative architecture, no new systems without a product decision) argue against building yet. Instead, this document proposes a **scoped-down, code-reuse-only interpretation** of "iterative refinement" — letting a user carry a past generation's prompt forward to edit and resubmit, and letting them compare two already-stored generations — both achievable entirely with existing architecture, plus closing two small, real, user-visible gaps found during this audit: a "Coming soon" settings toggle that's now trivially completable, and a public-facing README that materially undersells the shipped product.

Sprint 7's proposed shape is **5 implementation tasks + 1 closure task**, smaller than Sprint 6's 8, reflecting that most of the highest-value, lowest-risk backlog was already cleared last sprint.

---

## 2. Repository Health

Verified directly (re-running the validation gate, not assumed from `Sprint-06-Closure.md`'s own claims):

| Check | Status |
|---|---|
| Build (`npm run build`) | ✅ Passing |
| TypeScript (`npm run typecheck`) | ✅ Passing, zero errors |
| Lint (`npm run lint`) | ✅ Passing, zero errors/warnings |
| Tests (`npm test`) | ✅ Passing — 347 tests, 45 files |
| Working tree | Clean |
| Sprints complete | 0, 1, 3A, 4, 5, 6 |

One repository inconsistency found during this audit, disclosed rather than silently corrected (this is a planning task — no file was edited to fix it): **`TECH_DEBT.md`'s TD-023 and TD-024 entries are interleaved** — TD-023's own closing "Why"/"Recommended fix" paragraphs appear *after* TD-024's heading instead of before it, apparently from an edit that inserted TD-024 at the wrong point in the file. Content-wise nothing is lost, but the reading order is wrong. Recommended as a one-line fix folded into whichever task next touches `TECH_DEBT.md` (see S7-006).

---

## 3. Product Assessment

**Current maturity:** A working, single-user, single-AI-provider (Gemini) product: natural-language prompt → five consistent artifacts (SQL, Drizzle, JSON, docs, Mermaid), saved under projects, browsable history, a Monaco-powered Workbench, full account lifecycle (signup/reset/delete), rate-limited both for anonymous sandbox and authenticated use, and a first-run onboarding card. This is materially past "MVP" — it's a complete core loop with real hardening (retry, rate limits, touch targets) behind it.

**Where the Sprint 6 roadmap's own Sprint 7 outline doesn't survive contact with the constraints given for this planning pass:**
- Its headline idea — "add/modify a table' style follow-up prompts against an existing AST" — requires new AI-prompting design (how does a follow-up instruction get merged with an existing `CanonicalSchemaAST`? Does the model see the full AST as context? Does it emit a diff or a full replacement?) and new AST-merge logic that doesn't exist anywhere in the codebase today (confirmed: no diff/merge utility exists under `lib/ast/` or `features/history/`). That is exactly the kind of "speculative architecture" this planning pass's own instructions say to avoid building without a dedicated design decision.
- Its own text already flagged this: "Genuinely new AI-prompting and AST-merge design work, not a continuation of Sprint 6's shape" — i.e., even the document that proposed it didn't claim it was a natural Sprint 7 continuation.

**What "iterative refinement" can mean without any of that new architecture** (this is what §6 proposes as S7-001/S7-002): a user can already produce a *new* version of a schema by editing a prompt and generating again — every generation is already versioned per project. What's actually missing is entirely on the **UX** side, not the AI/architecture side: (a) there is no way to carry a past generation's original prompt back into the Generator to tweak it — a user who wants to "add a `reviews` table to what I already have" has to either remember or re-read the old prompt and retype the whole thing from scratch; (b) there is no way to see what changed between two versions without opening both Workbench tabs side by side manually. Both are pure UI/data-reuse problems against data and stores that already exist.

---

## 4. UX Assessment

**Largest UX problems found, in order of user-visibility:**

1. **A first-time GitHub visitor / prospective user reads a materially stale README** — "149 automated tests" (actual: 347), a feature list that omits the Workbench, Account Settings, Monaco editor, multi-provider AI architecture, export bundling, Retry, rate limiting, and onboarding entirely, a roadmap section still tracking v0.7.1's own milestones, and a CI claim ("runs on every push and pull request to `main`") that is currently false (TD-024: `project_ci.yml` is `workflow_dispatch`-only). This is the single most-visible surface this audit found that doesn't match reality — anyone evaluating the project from its repository page gets a materially understated picture.
2. **No way to iterate on a past generation without retyping the prompt** — covered in §3 above; this is the real, achievable core of "iterative refinement."
3. **No way to compare two generations** — a user who's produced several versions of a schema while iterating has no way to see what actually changed, only to open two Workbench tabs and eyeball the SQL.
4. **Two Account Settings controls are permanently stuck on "Coming soon" for no remaining technical reason** — `DeveloperSettings`' "Show raw project IDs" toggle is blocked purely on wiring, not on any unresolved product/architecture question (unlike `PreferencesSettings`' SQL-dialect/naming-convention selectors, which are blocked on a real, unmade product decision — see §9).
5. **Rate-limit rejections are a plain error message with no indication of when the user can try again** — S6-004 shipped a correct, safe 60/hour + 10/minute ceiling with a clear rejection message, but doesn't tell the user *how long* to wait. Minor, but a real "why can't I generate right now" moment for anyone who hits it.

**No other UX problems of comparable visibility were found.** Onboarding (S6-007), Retry (S6-001), touch targets (S6-006), and delete-account (S6-003) all closed real gaps last sprint and were not re-audited as broken.

---

## 5. Architecture Assessment

**Weaknesses found (none are urgent; all are disclosed rather than silently accepted):**

- **Single SQL dialect, single naming convention.** `PreferencesSettings`' dialect/naming selectors are disabled specifically because the compiler layer only ever produces PostgreSQL + `snake_case` — the UI is honest about this (shown-and-disabled, not hidden), but it means the "coming soon" promise has stood since Sprint 4 with no decision made about whether it's actually wanted. This is a product-decision gap, not an engineering one — see §9.
- **No pagination anywhere.** `getProjectsForUser`, `getProjectGenerations`, and every other list-returning repository function (confirmed by reading every query in `lib/repositories/project.repository.ts`/`generation.repository.ts`) fetches its full result set every time, with no `.limit()`/`.range()` except the single-row version-number lookup. At this product's current single-user, modest-project-count scale this is a non-issue; it becomes one only if a user accumulates hundreds of projects or generations. Not proposed as a Sprint 7 task (no evidence anyone has hit this yet — "will the user notice" fails today), but worth tracking as a watch item.
- **`TECH_DEBT.md` TD-001** (generation-version-allocation race) remains open, accepted risk — a genuine race exists between reading the latest version number and inserting the next one, mitigated by a unique constraint that turns a race into a clean, retryable error rather than data corruption. Unchanged since Sprint 1's own assessment; still low real exposure (single user, single-tab-at-a-time usage is the realistic case).
- **No architectural blocker to any of this sprint's proposed tasks** — the AST/compiler/provider/repository patterns reviewed in the v0.7.1 audit and every sprint since remain sound and consistently applied; nothing here calls for a refactor.

---

## 6. Technical Debt Review

Current open items in `TECH_DEBT.md`, cross-checked against the file directly:

| ID | Item | Priority | Sprint 7 disposition |
|---|---|---|---|
| TD-001 | Generation-version race (accepted risk) | High (as originally rated), low real exposure | Not in scope — no new information changes the Sprint 1 assessment. |
| TD-005 | No Git↔Vercel auto-deploy | High | DevOps-owned, out of scope. |
| TD-007 | Enums compile to `TEXT + CHECK`, not native `ENUM` | Medium | Deferred (Sprint 9 outline candidate) — no user-visible defect, a deliberate v1 scope cut. |
| TD-008 | Composite FKs get no physical Drizzle constraint | Medium | Deferred (Sprint 9 outline candidate) — same reasoning. |
| TD-012 | No CSP configured | Low | Deferred (Sprint 9 outline candidate) — real hardening gap, not user-visible. |
| TD-015 | Placeholder/test data in production `projects` table | Medium | Deferred — human-gated, requires explicit sign-off before deleting production data; not a code task. |
| TD-017 | Vercel "Sensitive" env vars opaque to CLI | Low | Process note, not a code fix; no action. |
| TD-021 | Fullscreen mode hides chrome instantly, not animated | Low | Deferred (Sprint 9 outline candidate) — needs a small product decision (save/restore sidebar state vs. accept the instant-toggle exception) before it's even buildable correctly. |
| TD-023 | Two Workbench keyboard shortcuts never implemented | Low | Deferred (Sprint 9 outline candidate) — niche, power-user-only, reachable today via mouse/command palette. |
| TD-024 | CI/CD: no automatic trigger, CD non-functional | High | DevOps-owned (AD-006), out of scope. README's false CI claim is in scope — see S7-004. |
| *(new, this audit)* | `TECH_DEBT.md` TD-023/TD-024 entries interleaved (doc-ordering bug) | Trivial | Fold into S7-006 closure's doc pass. |

**Nothing here is newly Critical or newly High.** The Critical/High tier from prior audits (project-selector UUID display, FK indexing, join-table uniqueness, CI/test infra, history UI) was fully cleared by Sprint 1; the current High-tier items (TD-005, TD-024) are both DevOps-owned and already tracked with a clear recommended action (AD-006) that this execution role cannot act on directly.

---

## 7. Production Readiness

- **Core generation loop:** Production-ready. Retry, rate limiting, and output-quality improvements (CHECK constraints, realistic sizing) are all shipped and tested.
- **Account lifecycle:** Production-ready *pending one disclosed verification gap*: `delete_own_account()` and `check_authenticated_rate_limit()` are both prepared, reviewed SQL, not yet applied to any live database, and not yet smoke-tested against a real (non-production) Supabase project — this environment has no live Supabase credentials, consistent with every prior sprint's disclosure of the same limitation. This is the single biggest gap between "code complete" and "verified in production" today.
- **Deployment pipeline:** Not production-ready as currently configured — TD-024/AD-006's findings stand: CI requires a manual trigger, and the CD workflow is non-functional. This is DevOps-owned and blocks nothing in this document's own scope, but it is the most material launch blocker in the repository today and is called out explicitly so it isn't lost.
- **Monetization:** Not production-ready, and not close — `BillingSettings` is an honest, disabled placeholder with no pricing model, plan tiers, or payment processor decided. This requires a product/business decision before any code should be written (see §9); this document does not propose implementation.
- **Compliance/privacy:** No privacy policy exists in the repository (flagged, not newly discovered — AD-005 already disclosed this gap re: Supabase backup retention). Not proposed for Sprint 7 (Sprint 9 outline candidate, per the existing plan).

---

## 8. Launch Blockers (if "launch" means a real, monetized, publicly promoted 1.0)

1. **Deployment pipeline is not verified end-to-end** (DevOps-owned, TD-024/AD-006).
2. **No monetization mechanism exists** — every account is Free-tier only; there is no way to charge anyone (product/business decision required first).
3. **Two prepared SQL functions (delete-account, rate-limiting) have never run against a live database** — both are believed correct by design review, neither has been executed for real.
4. **No privacy policy** — a real gap for any product that persists user-generated content and account data, ahead of any public launch claim.

None of these four are addressed by this Sprint 7 proposal — they are DevOps-owned, business-decision-gated, or require live infrastructure access this environment doesn't have. They are listed here so they aren't lost in a document that otherwise focuses on buildable application work.

---

## 9. Items Requiring a Decision Before They Can Be Scoped (not proposed as Sprint 7 tasks)

Per this planning pass's own instruction to classify rather than guess:

- **SQL dialect / naming convention support.** `PreferencesSettings` has promised "coming soon" since Sprint 4 with no decision on whether a second dialect (e.g. MySQL) or naming convention (e.g. camelCase) is actually wanted. Building either is a real compiler-layer undertaking (new type-maps, new render logic, dialect-aware AST validation) — **needs a product decision on which dialect(s)/conventions to actually support, if any**, before it can be scoped as an implementation task.
- **Monetization / billing.** Needs a business decision (pricing model, plan tiers, payment processor) before any Stripe-style integration work can be scoped. Flagged as P1 business importance, P3 buildability today (nothing to build against yet).
- **Public API / programmatic access** (Sprint 8 outline candidate). Needs a decision on authentication model (API keys?), its own rate-limiting story, and versioning — not assumed here.
- **Team / multi-user project sharing** (Sprint 8 outline candidate). Needs a permissions model decided first (owner/editor/viewer? organization-level billing?) — a real product decision, not an engineering one.
- **Non-default AI provider selection UI** (Sprint 8 outline candidate). Needs a decision on whether/how to expose Anthropic/OpenAI to real users (cost implications, UI for API-key-per-provider or platform-subsidized access) before a picker is worth building.

---

## 10. Sprint 7 Objective

**Objective:** Complete the two highest-value, lowest-risk pieces of "let a user iterate on a schema instead of starting over" using only existing architecture and data, and close two small, concretely-scoped gaps found during this audit (a completable settings toggle, and a materially stale public README) — without any new AI-prompting design, AST-merge logic, or product decisions.

**Business value:** A returning user who wants to adjust a schema currently has meaningfully more friction than necessary (retype the whole prompt from memory) — closing that gap increases the odds a user comes back for a second, third, and fourth generation rather than treating the tool as one-shot. A corrected README directly affects how the project is perceived by anyone evaluating it externally (recruiters, contributors, prospective users), which is a real, if intangible, business cost of leaving it stale.

**User value:** Faster, lower-friction iteration on an existing schema; visibility into what changed between two versions; one more working control in Account Settings instead of a permanent "coming soon."

**Acceptance criteria (sprint-level):** Every task passes lint/typecheck/test/build individually and is committed on its own before the next begins; a user can carry a past generation's prompt into the Generator and regenerate; a user can view a diff between two generations of the same project; the Developer Settings "Show raw project IDs" toggle actually works; README.md accurately reflects the shipped feature set, test count, and CI's actual (not aspirational) behavior.

**Estimated effort:** 5 implementation tasks (3 Small, 1 Medium, 1 Small-optional) + 1 closure task — smaller than Sprint 6, reflecting a thinner remaining high-value backlog.

**Dependencies:** None between S7-001/S7-002/S7-003/S7-004 — all touch disjoint files and can be sequenced in any order; S7-005 is optional and independent; S7-006 (closure) depends on all prior tasks being complete.

**Risks:** See §11 (Risk Assessment) below.

---

## 11. Sprint 7 Tasks

### S7-001 — Edit & Regenerate: Carry a Past Generation's Prompt Forward
- **Purpose:** Let a user resume iterating on an existing schema instead of retyping a prompt from scratch — the concretely-achievable core of "iterative refinement," reusing exactly the pattern S6-007's onboarding card already established (set `generation-store`'s prompt, navigate to the Generator) rather than inventing a new mechanism.
- **Scope:** Add an "Edit & Regenerate" action to a past generation in `features/history/components/generation-history-item.tsx` (alongside the existing Open/Delete actions) and, if it fits naturally without crowding the toolbar, the Workbench's generation nav. Clicking it sets `useGenerationStore`'s `prompt` to that generation's original stored prompt and navigates to `/dashboard/generator`, where the user edits and resubmits normally through the existing pipeline — a new version is created exactly the way any other generation is.
- **Deliverables:** A working "Edit & Regenerate" control; a small hook or inline handler mirroring `OnboardingCard`'s `goToGeneratorWith` pattern (do not duplicate that logic — extract a shared helper if used in more than one place).
- **Files expected to change:** `features/history/components/generation-history-item.tsx`, possibly a new small shared helper (e.g. `features/ai-workspace/lib/carry-prompt-to-generator.ts` or similar, only if genuinely reused in a second location — not created speculatively for one call site), `components/dashboard/workbench-generation-nav.tsx` (optional, only if it fits without crowding).
- **Acceptance criteria:** Clicking "Edit & Regenerate" on a past generation navigates to the Generator with that generation's exact original prompt pre-filled and editable; submitting creates a new version under the same project through the unmodified existing pipeline; no change to `generation-store.ts`'s shape or `generate-schema.ts`'s contract.
- **Validation strategy:** A component test on the new action (asserts the store's prompt is set to the generation's stored prompt and navigation occurs), mirroring `onboarding-card.test.tsx`'s existing router-mock convention; `lint`/`typecheck`/`test`/`build`.
- **Estimated complexity:** S — pure reuse of an existing store and an existing navigation pattern, one new UI control.
- **Stop conditions:** None expected — if the Workbench toolbar genuinely has no room without violating the touch-target spacing S6-006 just established, drop that half and ship History-only rather than force a cramped layout.

### S7-002 — Generation Comparison (Diff View)
- **Purpose:** Let a user see what actually changed between two generations of the same project, rather than opening two Workbench tabs and comparing by eye — the second concretely-achievable piece of "iterative refinement," using only data every generation already stores.
- **Scope:** A new view (a route, e.g. `/dashboard/projects/[id]/history/compare?a=<id>&b=<id>`, or a dialog launched from the History list with a two-generation selection step — implementer's choice, whichever fits the existing History list interaction model with the least new UI surface) that renders a text diff of two stored generations' SQL output (and, if straightforward, the other artifacts too — SQL is the minimum bar). Reads `GeneratedSchema.sql` (and friends) directly from two already-fetched `Generation` records; no new AI call, no AST comparison.
- **Files expected to change:** A new component under `features/history/components/` (e.g. `generation-diff-view.tsx`), a new small entry point in `generation-history-item.tsx` or `generation-history-list.tsx` to select two generations to compare, possibly a new route file under `app/(dashboard)/dashboard/projects/[id]/history/`.
- **Implementation strategy:** Use a small, focused diff library for correct line-diffing (hand-rolling a correct LCS-based diff is a real undertaking not worth reinventing for this) rather than a naive string comparison — this is a technical library choice, not a product decision, and doesn't require sign-off the way a new AI/architecture dependency would. Render additions/removals with the same semantic-color conventions (`--accent-emerald`/`--accent-rose`) Design System 2.0 already establishes for success/error, not new colors.
- **Acceptance criteria:** A user can pick any two generations from the same project's History and see a clear, correct diff of their SQL output; comparing a generation to itself shows no differences (a trivial but real correctness check); the feature degrades gracefully (a clear message, not a crash) if a project has fewer than two generations.
- **Validation strategy:** Unit tests on the diff-rendering logic against hand-written fixture pairs (matching this project's own "hand-written expected output, never snapshots" testing convention); a component test for the selection UI; `lint`/`typecheck`/`test`/`build`.
- **Estimated complexity:** M — the only Sprint 7 task touching a genuinely new piece of UI surface (a diff renderer), even though the underlying data and AI/compiler pipeline are completely unchanged.
- **Stop conditions:** If comparing every artifact type (not just SQL) turns out to need meaningfully different diff-rendering per format (e.g. Mermaid diagrams don't diff meaningfully as text), ship SQL-only for this task and note Drizzle/JSON/docs comparison as a follow-up rather than expanding scope mid-task.

### S7-003 — Complete Developer Settings' "Show Raw Project IDs" Toggle
- **Purpose:** Close one of the two remaining "Coming soon" badges in Account Settings — the one that's blocked purely on wiring, not on an unmade product decision (unlike `PreferencesSettings`' dialect/naming selectors, see §9).
- **Scope:** Make the toggle real using the exact same guaranteed-cookie pattern `lib/actions/account-preferences.actions.ts` already established for reduced-motion/high-contrast: the cookie is the real, immediately-effective mechanism; a best-effort `user_preferences` DB write happens alongside it and is allowed to silently fail (that table has no migration applied yet, same disclosed state as every other consumer of it). Every place that currently resolves a project's display title from its ID (the Generator's project selector, `ProjectCard`, breadcrumbs) reads this preference and shows the raw UUID instead when it's on.
- **Files expected to change:** `lib/actions/account-preferences.actions.ts` (extend to include this preference), `features/account-settings/components/developer-settings.tsx` (enable the control), the consumers that currently resolve a project's title (`features/ai-workspace/components/schema-generator.tsx`, `features/projects/components/project-card.tsx`, `features/shell/components/breadcrumbs.tsx` — confirm the actual full list by search before implementing, per this project's own "search before adding, never duplicate" convention).
- **Acceptance criteria:** Toggling "Show raw project IDs" on immediately shows UUIDs instead of titles everywhere a project is displayed by name; toggling it off restores titles; the preference persists across a page reload (cookie) without requiring the `user_preferences` migration to be applied.
- **Validation strategy:** Unit/component tests on the toggle and on at least one consumer's conditional-display logic; `lint`/`typecheck`/`test`/`build`.
- **Estimated complexity:** S — one settings control plus updating however many display sites actually exist (expected small, single digits).
- **Stop conditions:** None expected — this is a mechanical wiring task with a fully-precedented pattern to follow.

### S7-004 — README Refresh
- **Purpose:** Close the single most externally-visible gap this audit found — the public README materially undersells and misrepresents the current, much more mature product (stale test count, missing features, a false CI-automation claim, a roadmap frozen at v0.7.1).
- **Scope:** Update `README.md`'s feature list (add Workbench, Account Settings incl. delete-account, Monaco editor, multi-provider AI architecture, export bundling, Retry, authenticated rate limiting, onboarding), technology stack table (add the AI providers, Zustand, jest-axe, etc. already listed in `SCHEMACRAFT_AI_MASTER_CONTEXT.md`), test count (347, not 149), and the roadmap section (replace the frozen v0.7.1-milestone checklist with an accurate summary of Sprints 1/4/5/6, linking to `SCHEMACRAFT_AI_MASTER_CONTEXT.md` and the relevant closure docs rather than re-describing them). Correct the CI claim to reflect its actual current behavior (manual trigger only) rather than removing the sentence silently — this is public-facing honesty about the same gap `AD-006`/TD-024 already disclose internally.
- **Files expected to change:** `README.md` only.
- **Acceptance criteria:** Every feature currently shipped and reachable in the product is mentioned; the test count and CI-trigger description match reality; the roadmap section reflects Sprints 1 through 6 as actually completed, not a frozen v0.7.1 checklist.
- **Validation strategy:** No automated test applies to a Markdown README — validation is a careful re-read against `SCHEMACRAFT_AI_MASTER_CONTEXT.md` §6 (Current Features) and §8 (Repository Status) for accuracy; `lint`/`typecheck`/`test`/`build` still run (to confirm the sprint's overall gate, even though this task touches no code) per the standing "validate after every task" rule.
- **Estimated complexity:** S — a documentation-only task.
- **Stop conditions:** None expected.

### S7-005 — Rate-Limit Rejection Clarity (Optional / Stretch)
- **Purpose:** Close the smallest UX gap found (§4, item 5) — a rate-limited user sees a correct but uninformative rejection with no sense of when to try again.
- **Scope:** Have `check_authenticated_rate_limit()` (and its repository wrapper) return enough information to tell the user approximately when they can retry (e.g., seconds until the oldest counted request ages out of the burst/hourly window), surfaced in the existing rejection message. This touches the SQL function's return shape (application-owned — the function itself is prepared-but-unapplied SQL, not live infrastructure) and `lib/repositories/rate-limit.repository.ts`'s outcome type.
- **Files expected to change:** `supabase/rls.sql` (`check_authenticated_rate_limit`'s return shape), `lib/repositories/rate-limit.repository.ts`, `lib/actions/generate-schema.ts`'s rejection message.
- **Acceptance criteria:** A rate-limited rejection message includes an approximate wait time, not just "please try again later."
- **Validation strategy:** Unit tests on the updated `resolveRateLimitOutcome`-equivalent logic; `lint`/`typecheck`/`test`/`build`.
- **Estimated complexity:** S, but touches a prepared-not-applied SQL function's contract, so treat with the same care as any schema-adjacent change.
- **Stop conditions:** **This task is explicitly optional** — if S7-001 through S7-004 consume the sprint's full capacity, drop this task rather than rush it; it was not called out in any prior planning document and is this audit's own smallest, lowest-priority addition.

### S7-006 — Sprint 7 Closure
- **Purpose:** The same closure pattern every prior sprint has used.
- **Scope:** Full validation (`lint`/`typecheck`/`test`/`build`) on the merged state; `TECH_DEBT.md` sync (mark any items this sprint closes; fix the TD-023/TD-024 ordering bug found in §2); `SCHEMACRAFT_AI_MASTER_CONTEXT.md` sync (per this project's now-standing "sync at closure, not per-task" documentation philosophy); a new `docs/planning/Sprint-07-Closure.md`.
- **Files expected to change:** `TECH_DEBT.md`, `SCHEMACRAFT_AI_MASTER_CONTEXT.md`, new `docs/planning/Sprint-07-Closure.md`.
- **Acceptance criteria:** Full validation passes on the merged state; documentation reflects exactly what shipped, including if S7-005 was dropped.
- **Validation strategy:** `lint`/`typecheck`/`test`/`build`.
- **Estimated complexity:** S.
- **Stop conditions:** None expected.

---

## 12. Priority Matrix

| Item | Priority | Why |
|---|---|---|
| S7-001 Edit & Regenerate | **P1** | Directly closes the highest-value UX gap found (§4); pure reuse, low risk, will be noticed by any returning user. |
| S7-004 README refresh | **P1** | Highest-visibility, lowest-risk item found — affects every external visitor's first impression; zero engineering risk. |
| S7-003 Developer Settings toggle | **P1** | Small, fully-precedented, closes a "coming soon" with no remaining technical blocker. |
| S7-002 Generation Comparison | **P2** | Real value for actively-iterating users, but a genuinely new UI surface (more risk/effort than S7-001/003/004) and less universally noticed than S7-001. |
| S7-005 Rate-limit clarity | **P2** | Real but narrow (only affects users who actually hit the ceiling); explicitly optional this sprint. |
| Native `ENUM` (TD-007) | P2 | Deferred, Sprint 9 outline; no user-visible defect today. |
| Composite FK Drizzle constraint (TD-008) | P2 | Deferred, Sprint 9 outline; silent scope cut, not a visible bug. |
| Production data cleanup (TD-015) | P2 | Deferred; human-gated, not a code task. |
| CSP headers (TD-012) | P3 | Deferred, Sprint 9 outline; real hardening gap, invisible to users. |
| Fullscreen animation (TD-021) | P3 | Deferred, Sprint 9 outline; needs its own small product decision first. |
| Remaining keyboard shortcuts (TD-023) | P3 | Deferred, Sprint 9 outline; niche, power-user-only. |
| SQL dialect / naming convention support | **Needs product decision** | Not buildable without deciding which dialect(s)/conventions to support, if any. |
| Monetization / billing | **P1 business importance, needs product decision** | Real business need, but no pricing model exists to build against. |
| Public API (Sprint 8 outline) | P2, needs product decision | Real future value, needs an auth/versioning decision first. |
| Team/multi-user sharing (Sprint 8 outline) | P2, needs product decision | Needs a permissions model decided first. |
| Provider-selection UI (Sprint 8 outline) | P2, needs product decision | Needs a cost/exposure decision first. |
| CI/CD automation (TD-024/AD-006) | **P0 for a real launch, DevOps-owned** | The single biggest gap between "code complete" and "safely deployable" — out of this execution role's scope, flagged for the DevOps owner. |
| Live SQL smoke tests (delete-account, rate-limit) | **P0 for production confidence, needs live credentials** | Both functions are believed correct by design review only; neither has executed against a real database. |
| Privacy policy | P2, Sprint 9 outline | Real gap ahead of any public launch claim; not a Sprint 7 task. |
| Pagination for projects/generations | P3 | No evidence of real impact yet at current scale; watch item only. |

---

## 13. Risk Assessment

- **S7-002's diff view is this sprint's only genuinely new UI surface** — the risk is scope creep (trying to diff every artifact type, or building a fully-featured comparison tool) rather than technical difficulty. Mitigated by the task's own stop condition: SQL-only is an acceptable, complete deliverable if multi-artifact diffing turns out to need materially different rendering per format.
- **S7-003 touches multiple consumer components**, not just the settings screen — risk is missing a display site that resolves a project title from an ID. Mitigated by the task's own instruction to search the repository for every such site before implementing, per this project's established "search before adding, never duplicate" convention.
- **S7-005, if attempted, changes a prepared-but-unapplied SQL function's contract** — low risk since it's never been applied to any live database, but should still be reviewed with the same care as any schema-adjacent change, per this project's standing discipline.
- **No task this sprint touches the AST, compiler, or provider architecture** — the lowest-architectural-risk sprint since Sprint 1, by design, given the stated preference for completing existing workflows over new systems.
- **The four launch blockers in §8 are unaddressed by this sprint** — this is a deliberate scope boundary (DevOps ownership, business decisions, live-credential access this environment lacks), not an oversight, but it means Sprint 7 alone does not move the product materially closer to a monetized public launch. That requires action outside this execution role's scope.

---

## 14. Dependencies

- S7-001, S7-002, S7-003, and S7-004 have no dependencies on each other or on anything outside this sprint — each touches a disjoint set of files.
- S7-005 (if attempted) is independent of all of the above.
- S7-006 depends on every attempted task in this sprint being complete (implementation + tests + lint + typecheck + build + commit, per the standing Sprint Execution Rule) before it begins.
- No task in this sprint depends on the DevOps-owned CI/CD fix, on any product decision listed in §9, or on live Supabase/Vercel credentials this environment doesn't have.

---

## 15. Success Criteria

1. A user can carry a past generation's prompt into the Generator and regenerate, without retyping it, verified by a passing test and (disclosed, not assumed) not verified live against a real AI provider call in this environment.
2. A user can view a correct diff between any two generations of the same project.
3. The Developer Settings "Show raw project IDs" toggle works end-to-end and persists across a reload.
4. `README.md` accurately reflects the shipped feature set, current test count, and CI's actual (not aspirational) trigger behavior.
5. Every attempted task passes `lint`/`typecheck`/`test`/`build` individually and is committed before the next begins.
6. `TECH_DEBT.md` and `SCHEMACRAFT_AI_MASTER_CONTEXT.md` are synchronized at closure, not per-task, per this project's standing documentation philosophy.

---

## 16. Recommended Execution Order

1. **S7-004 (README refresh)** first — zero engineering risk, zero dependencies, immediate value, and a good warm-up task that requires re-reading the whole current feature set (useful context for everything after it).
2. **S7-003 (Developer Settings toggle)** — small, fully precedented, independent.
3. **S7-001 (Edit & Regenerate)** — the highest-value task, builds on the same store/navigation pattern just re-confirmed while reading the codebase for S7-004.
4. **S7-002 (Generation Comparison)** — the largest task, sequenced after the smaller ones so any schedule pressure falls on the optional/stretch item rather than this one.
5. **S7-005 (Rate-limit clarity, optional)** — only if capacity remains.
6. **S7-006 (Closure)** — always last.

---

## 17. Definition of Done

- **Release-blocking for Sprint 7 itself:** S7-001, S7-002, S7-003, S7-004, S7-006.
- **Optional, explicitly not release-blocking:** S7-005 — ship it if capacity allows, drop it cleanly (with a one-line note in closure) if not.
- Every release-blocking task: implementation complete, tests added/updated, lint/typecheck/build passing, committed individually, per the standing Sprint Execution Rule.
- `TECH_DEBT.md` and `SCHEMACRAFT_AI_MASTER_CONTEXT.md` synchronized at S7-006 closure to reflect exactly what shipped.
- No application code, tests, or documentation beyond this planning document were touched to produce this roadmap — implementation awaits explicit approval.
