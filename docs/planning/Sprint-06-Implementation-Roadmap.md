# Sprint 6 — Planning & Product Backlog

**Task ID:** S6-000
**Status:** Planning deliverable. No application code, no other documentation changed by this pass.
**Author role:** Senior Staff Engineer / Product-minded Tech Lead, implementation planning.
**Source of truth:** A direct repository audit performed for this document — `SCHEMACRAFT_AI_MASTER_CONTEXT.md`, `TECH_DEBT.md`, `docs/planning/Sprint-05-Closure.md`, `docs/planning/v0.7.1-roadmap.md`, every file under `docs/specifications/` and `docs/architecture/`, and direct inspection of `.github/workflows/*`, `next.config.ts`, `.vercel/project.json`, `README.md`, `package.json`, and the relevant source files named throughout. Where the repository disagreed with what prior planning documents assumed, the repository won — see §0 below for the two findings that fall in that category.

---

## 0. Findings That Override Prior Assumptions

Two things are true today that no existing document states, discovered only by reading the actual files rather than trusting `SCHEMACRAFT_AI_MASTER_CONTEXT.md`'s own (now-stale-in-this-one-respect) deployment description:

1. **CI no longer runs automatically.** `.github/workflows/ci.yml` (lint → typecheck → test → build on every push/PR to `main`) was replaced — by work outside this project's own Sprint 4/5 execution, merged into `main` at the start of Sprint 5's second session — with `.github/workflows/project_ci.yml`, whose only trigger is `workflow_dispatch` (a manual "Run workflow" button with a branch-name input). **There is currently no automatic test/lint/typecheck/build gate on any push or pull request.** This is a real regression from the state Sprint 0 through Sprint 5 were built and verified under.
2. **A second, undocumented deployment pipeline exists, targeting a different platform than what's documented.** `.github/workflows/project_cd.yml` (also `workflow_dispatch`-only) deploys to a self-hosted **EC2 instance via SCP/SSH + PM2** (`pm2 start npm -- start`), not Vercel. It is also, independently, **hardcoded to only look for CI build artifacts from the `develop/chirag` branch** (`gh run list --branch develop/chirag`) — a build produced from `main`, or from any Sprint 4/5/6 work, would never be found by this CD workflow as currently written. Meanwhile `.vercel/project.json` still exists, `next.config.ts` has `output: "standalone"` (a self-hosted-Node setting, not something Vercel deployments need), and `README.md` still advertises a live Vercel demo URL. **The project currently has two inconsistent, both-broken deployment stories, not one working one.** This is addressed as S6-002 below, and is exactly the kind of decision this document defers to a short ADR rather than resolving unilaterally (see that task).

Both findings are treated as this sprint's highest-leverage "technically required" work — see the Prioritization philosophy in §"Task Breakdown" for why they're included despite being invisible to an end user in their first 30 seconds.

---

## 1. Repository Audit

Organized exactly per the 11 categories requested. Each line is either a direct file citation or an explicit "confirmed absent" — no item here is carried over from an old plan without being re-checked against the current repository.

### 1. Completed features
Natural-language schema generation (SQL/Drizzle/JSON/Markdown/Mermaid from one Canonical AST); multi-provider AI architecture (Gemini default, Anthropic/OpenAI implemented and registered, S5-001–004); authentication (signup/login/logout, password reset, sign-out-all-sessions, session-expiration recovery); project CRUD with search/filters/quick actions/recency ordering; Generation History with undoable delete; a Monaco-powered Workbench (fullscreen, command palette, prev/next nav, session-persisted layout); a full Account Settings screen (appearance, keyboard shortcuts reference, accessibility overrides, account management); a public marketing site with an unauthenticated rate-limited sandbox; bundled "Export all" zip download; dark/light/system theming.

### 2. Partially completed features
- **Delete-account** — decision resolved (`docs/architecture/AD-005-delete-account.md`), zero implementation (no SQL function, no Server Action, no UI). See S6-003.
- **AI provider architecture** — three providers implemented and centrally selectable, but no UI/account-level control exists to actually pick one, and neither `ANTHROPIC_API_KEY` nor `OPENAI_API_KEY` is provisioned anywhere. Fully inert beyond Gemini today.
- **Failure recovery** — prompt preservation on failure works; no Retry button exists (TD-022). See S6-001.
- **Accessibility audit (S4-016)** — structural/ARIA automated coverage exists (`jest-axe`); contrast was never verified with real rendering, and touch targets (TD-020) are confirmed under the 44×44px minimum.
- **CI/CD** — exists as workflow files, but neither runs automatically nor deploys anywhere reliably today. See §0.

### 3. Technical debt
Full inventory lives in `TECH_DEBT.md` (23 items, TD-001 through TD-023; TD-002/003/004/006/013/016/018/019 resolved). Still open and re-verified against the current repository during this audit: TD-001 (generation version-allocation race, accepted risk), TD-005 (no Git↔Vercel integration — now superseded in practice by §0's finding 2, since there's a second, also-broken pipeline), TD-007 (enums as `TEXT + CHECK`), TD-008 (composite FK, `relations()` only), TD-009 (blanket `VARCHAR(255)`), TD-010 (no business-rule `CHECK` constraints), TD-012 (no CSP), TD-014 (accepted, informational), TD-015 (placeholder production data), TD-017 (Vercel secret-verification process gap — arguably moot pending S6-002's decision), TD-020 (touch targets), TD-021 (Fullscreen animation), TD-022 (Retry — promoted to S6-001), TD-023 (two Workbench shortcuts).

### 4. Architecture improvements
The provider/compiler/repository patterns remain sound (re-confirmed, not just assumed) — `AIProviderAdapter`, `SchemaCompiler<TOutput>`, and `RepositoryResult<T>` are each applied uniformly with no special-casing. The one real architectural gap found this audit: **no per-authenticated-user rate limiting or usage tracking on `generate-schema.ts`** — the public sandbox has IP-hash-based limiting (`check_sandbox_rate_limit`), but the authenticated path (unbounded AI-provider cost exposure) has none at all. See S6-004.

### 5. Missing product features
No iterative schema refinement (every generation starts from scratch — a user cannot say "add a `reviews` table to what I already have" without re-describing the whole schema); no diff/comparison view between two generations in History (versions are listed, never compared); no public/programmatic API; no team or multi-user project sharing; no first-run onboarding beyond the prompt-suggestion chips (S4-011); no in-app usage/cost visibility for the (currently unused) non-Gemini providers.

### 6. UX gaps
No onboarding tour for a first-time authenticated user (Prompt Suggestions exist, but nothing orients a user to Projects/History/Workbench/Settings the first time they land); `README.md`'s own feature list is stale relative to what's actually shipped (Workbench, Account Settings, Monaco, export bundling, multi-provider architecture are all unmentioned) — a documentation gap with real onboarding/marketing consequence, not just internal housekeeping.

### 7. AI pipeline gaps
No Retry on failure (TD-022, promoted); no per-user rate limiting/cost ceiling (new finding, §4 above); no iterative refinement (§5); Anthropic/OpenAI fully built but unreachable by any real user path.

### 8. Authentication gaps
Email/password only — no OAuth/social login, no MFA (neither is necessarily wrong for this product's stage, but worth naming as a gap, not an oversight); delete-account has no implementation (§2); no per-account audit log of security-relevant events (password change, sign-out-all-sessions) beyond what Supabase's own dashboard shows.

### 9. Deployment gaps
See §0 — this is the most significant finding of this entire audit. Two non-working, mutually inconsistent deployment pipelines exist simultaneously, CI has no automatic trigger, and the CD workflow has a hardcoded branch filter that would prevent it from ever finding an artifact built from `main`.

### 10. Testing gaps
329 tests across 40 files (Vitest, verified by direct run during this audit), covering compilers/analyzer/AST validation, AI-provider architecture (S5-001–004), and structural/ARIA accessibility (`jest-axe`). Gaps: zero live-provider integration tests (a deliberate, documented choice, not an oversight — Gemini/Anthropic/OpenAI calls are slow/costly/non-deterministic); zero end-to-end/browser tests anywhere in the repository (every "live verification" claim across Sprint 0–5 was a manual session, several explicitly flagged as un-performed due to no credentials in this environment); color-contrast is unverified (jsdom has no real stylesheet).

### 11. Documentation gaps
`README.md` is stale (see §6); `SCHEMACRAFT_AI_MASTER_CONTEXT.md`'s deployment description doesn't reflect §0's findings (out of scope to fix here per this task's own constraints — flagged, not corrected); no `CONTRIBUTING.md` or license file exists; no public API documentation (none needed today, since no public API exists).

---

## 2. Sprint Goal

Close the highest-leverage gap between what Sprint 4/5 shipped and what a real user or operator actually experiences: restore a trustworthy, automatic verification/deployment pipeline (currently broken in a way no one has visibly noticed yet), give a failed generation a real recovery path, resolve the delete-account feature from decision to shipped, protect the product from unbounded AI cost on the authenticated path, and measurably improve the one thing users judge the product by most directly — the quality of the schema itself.

## 3. User Value

- A user whose first generation fails gets a one-click way to try again, instead of hunting for the Generate button again (S6-001).
- A user who wants to leave can actually delete their account and data (S6-003) — closes a real trust/compliance gap.
- A user reviewing their generated schema sees business-rule `CHECK` constraints and sensibly-sized columns instead of an arbitrary blanket `VARCHAR(255)` (S6-005) — directly visible in the artifact the product exists to produce.
- A new user gets oriented in their first session instead of landing on an empty dashboard with no guidance (S6-007).
- Every user (not just power users) can actually tap/click every icon-only control reliably, including on touch devices (S6-006).
- Indirectly, every user benefits from S6-002 and S6-004: a codebase that's still verified on every change, and a product that isn't exposed to unbounded cost from a single account, are both preconditions for the product remaining reliable and available at all.

## 4. Success Criteria

- `npm run lint`/`typecheck`/`test`/`build` all pass on every task's own branch before merge, and running automatically again on every push/PR by the end of S6-002.
- A failed generation can be retried without retyping the prompt, verified both by a unit test and (where credentials allow) a live check.
- `delete_own_account()` exists as reviewed, version-controlled SQL (not yet applied without explicit sign-off, matching this project's established DB-change discipline) and the Account Settings UI calls it behind a high-friction confirmation.
- An authenticated user hitting a defined generation-rate ceiling gets a clear, actionable message, not a silent failure or unbounded API cost.
- At least business-rule `CHECK` constraints (obvious cases: non-negative numeric columns implied by the prompt) and realistic `VARCHAR` sizing ship in generated SQL/Drizzle output, each covered by compiler tests.
- Icon-only controls in at least the highest-traffic clusters (Workbench toolbar, Output actions) meet the 44×44px effective hit-area minimum without overlapping a neighbor.
- A first-time authenticated user sees some form of contextual orientation (exact mechanism decided within S6-007, not pre-decided here).

## 5. Dependencies

- **S6-002 (CI/CD) has no code dependency on anything else in this sprint** and should be sequenced first or in parallel — every other task benefits from an automatic verification gate existing again before it merges.
- **S6-005 (output quality) and S6-006 (touch targets) both depend on nothing except the existing, already-tested compiler/UI-primitive layers.**
- **S6-003 (delete-account) depends on AD-005 only** (already resolved) — no dependency on any other Sprint 6 task.
- **S6-001 (Retry) and S6-004 (rate limiting) both touch the Generator's own action/store layer** and should not be branched simultaneously against the same files without coordination, though neither blocks the other technically.
- **S6-007 (onboarding) is the most product-open-ended task** — its own first step is deciding the mechanism (tour vs. empty-state copy vs. checklist), not assumed here.

## 6. Risks

- **§0's deployment finding is a real, currently-live risk, not a hypothetical one** — if a deploy were attempted today via either existing workflow, CD would silently fail to find its artifact (wrong branch filter) even if CI were manually triggered successfully first. This should be surfaced to whoever owns deployment before any other Sprint 6 work assumes "the app can be deployed" as a working precondition.
- **Rate-limiting the authenticated path (S6-004) risks false positives against legitimate heavy users** if the ceiling is set naively — needs a deliberate, disclosed threshold decision, not a guess.
- **Output-quality changes (S6-005) touch the SQL/Drizzle compilers**, which have strong existing determinism tests — any change must preserve byte-identical-output-for-identical-input, verified by the existing test suite, not just "looks right."
- **Delete-account (S6-003)** is, by AD-005's own design, irreversible once implemented and triggered — the implementation task must not relax AD-005's own "hard delete, `SECURITY DEFINER` scoped to `auth.uid()`, never a caller-supplied ID" constraints for convenience.
- **No live Supabase/Vercel/EC2 credentials are available in this environment** (an established, repeated fact across Sprints 0–5) — any task requiring live infrastructure verification (S6-002's actual deploy test, S6-003's SQL application, live browser/contrast checks) will hit the same disclosed limitation prior sprints did, and should be planned for accordingly rather than assumed away.

## 7. Exit Criteria

Sprint 6 is done when: every task below is implemented, individually validated (lint/typecheck/test/build), and committed; the CI/CD decision (S6-002) is resolved via a short ADR and at least automatic CI triggers are restored (the CD/deployment-target question may remain a disclosed, deferred decision if it turns out to require infrastructure access this environment doesn't have); `TECH_DEBT.md` and `SCHEMACRAFT_AI_MASTER_CONTEXT.md` are synchronized to reflect what shipped; a `Sprint-06-Closure.md` exists following the established pattern; and no task claims live-environment verification it could not actually perform, per this project's own established disclosure discipline.

---

## Task Breakdown

**Prioritization philosophy, stated once, applied throughout:** *"Will the user notice this in the first 30 seconds?"* Engineering-invisible work is deliberately ranked below user-visible value, with one explicit exception: work that's a precondition for shipping *anything* safely (S6-002's CI restoration) is treated as required regardless of visibility, per the brief's own "unless it blocks a feature" carve-out — an unverified, undeployable codebase blocks every future feature equally.

### S6-001 — Generator Retry Button
- **Purpose:** Close TD-022's core gap — a failed generation currently has no recovery action beyond the user re-clicking Generate from scratch (which does still work, since the prompt is preserved — but nothing tells the user that, or offers it directly).
- **Files expected to change:** `features/compiler/components/generation-status.tsx` (render a Retry action in the error branch), `features/ai-workspace/hooks/use-generate-schema.ts` (expose a retry entry point reusing the existing submission path), possibly `lib/stores/generation-store.ts` (no new state shape expected, existing `prompt`/`error` fields should suffice).
- **Implementation strategy:** Reuse the exact same submission function the Generate button already calls, with the store's already-preserved `prompt` — this is "wire an existing code path to a new button," not new generation logic. Do not attempt the spec's "partial-streaming failure" bullet (TD-022 already established this is architecturally impossible given the one-atomic-call pipeline); the Failure Recovery spec section should be corrected to drop that bullet as part of this task, not left contradicting shipped behavior indefinitely.
- **Acceptance criteria:** A failed generation shows a visible Retry action; clicking it resubmits the exact preserved prompt without requiring retyping; a second failure shows the same recovery path again (not a dead end after one retry).
- **Validation steps:** Unit test on the retry wiring (store state before/after); `lint`/`typecheck`/`test`/`build`; manual verification deferred and disclosed if no live AI credentials are available when this is implemented.
- **Estimated complexity:** S — reuses existing, working code paths; the risk is almost entirely in not over-scoping it back into the impossible partial-recovery behavior.
- **Dependencies:** None.

### S6-002 — Restore Automatic CI and Resolve the Deployment-Target Ambiguity
- **Purpose:** Close §0's two findings — no automatic verification exists today, and two inconsistent, both-currently-broken deployment pipelines exist simultaneously.
- **Files expected to change:** `.github/workflows/project_ci.yml` (add `push`/`pull_request` triggers alongside the existing `workflow_dispatch`, or restore a dedicated always-on workflow); `.github/workflows/project_cd.yml` (fix or replace the hardcoded `--branch develop/chirag` filter); a new `docs/architecture/AD-006-deployment-strategy.md`.
- **Implementation strategy:** **This task's first step is a short ADR, not code** — mirroring how AD-004/AD-005 handled genuine architectural forks. The ADR must resolve, with the same audit-first discipline this document itself used: is Vercel or the EC2/PM2 pipeline the actual intended production target (both currently exist, neither is confirmed working); if EC2/PM2, fix the branch-filter bug and decide the correct trigger branch; if Vercel, decide whether to formally retire `project_cd.yml` or keep it for a different purpose. Restoring automatic CI triggers on `project_ci.yml` is low-risk and should proceed regardless of the deployment-target decision's outcome, since it doesn't touch deployment at all.
- **Acceptance criteria:** Every push/PR to `main` runs lint/typecheck/test/build automatically again, with no manual trigger required; the ADR states a clear, singular recommendation for the deployment target; the CD workflow (whichever one is kept) can actually locate an artifact built from `main`.
- **Validation steps:** A test push/PR demonstrates the restored automatic trigger; `lint`/`typecheck`/`test`/`build` all still pass under the new/restored workflow; an actual end-to-end deploy verification is explicitly disclosed as unperformed if this environment still lacks the relevant infrastructure credentials when this task is executed, rather than claimed.
- **Estimated complexity:** M — the ADR and the CI-trigger fix are both small; the CD fix's complexity depends entirely on the ADR's outcome, which isn't known yet.
- **Dependencies:** None — can start immediately, in parallel with everything else.

### S6-003 — Delete-Account Implementation
- **Purpose:** Execute AD-005's already-accepted recommendation — the decision exists, the code doesn't.
- **Files expected to change:** `supabase/rls.sql` (new `delete_own_account()` `SECURITY DEFINER` function, prepared but not applied to any live database without explicit sign-off, per this project's established discipline for schema-adjacent changes), `lib/actions/auth.ts` (new `deleteAccountAction`), `features/account-settings/components/account-settings.tsx` (replace the existing "deliberately not implemented" comment with a real, high-friction confirmation dialog).
- **Implementation strategy:** Exactly as AD-005 specifies — no re-litigating soft-delete-vs-hard-delete or the `SECURITY DEFINER`-vs-service-role choice; this task implements the accepted decision, it doesn't revisit it. The confirmation UI should require typing the account's email or the word "delete," matching the severity `Design-System-2.0.md` §10 already establishes for destructive dialogs, since this is categorically higher-stakes than the undo-toast pattern used for generation deletion.
- **Acceptance criteria:** The SQL function exists, version-controlled, scoped to `auth.uid()` only (never a caller-supplied ID — this is the one property that must be reviewed most carefully); `deleteAccountAction` calls it via `supabase.rpc()`, then signs out globally and redirects; the UI requires explicit high-friction confirmation before the action is even reachable.
- **Validation steps:** Unit tests on the Server Action's own logic (mocked RPC call); `lint`/`typecheck`/`test`/`build`; the SQL function itself smoke-tested against a real (non-production) Supabase project before being considered verified, exactly as AD-005 itself already flags as an open verification gap — not newly invented here.
- **Estimated complexity:** M — the mechanism is fully decided already; the remaining work is implementation plus the review rigor a genuinely irreversible action deserves.
- **Dependencies:** AD-005 only (already resolved).

### S6-004 — Authenticated-User Generation Rate Limiting
- **Purpose:** Close the cost/abuse exposure found during this audit — the authenticated generation path has zero rate limiting, unlike the public sandbox.
- **Files expected to change:** `lib/actions/generate-schema.ts`, a new repository or extension of the existing rate-limit pattern (`supabase/rls.sql`'s `check_sandbox_rate_limit` is the direct precedent to reuse the *shape* of, not the sandbox's own table), `lib/services/generation.service.ts` if the check belongs at that layer instead.
- **Implementation strategy:** Reuse the sandbox's own `pg_advisory_xact_lock`-based check-then-act pattern (already proven to correctly avoid a race under concurrent requests) rather than inventing a new one — the only real decision is the threshold itself (requests per window), which should be a deliberate, disclosed number based on realistic legitimate usage, not guessed silently.
- **Acceptance criteria:** An authenticated user exceeding the defined threshold gets a clear, actionable rejection message (not a silent failure, not an opaque 500); legitimate single-session usage is never falsely blocked at whatever threshold is chosen.
- **Validation steps:** Unit tests on the pure rate-check logic (mirroring `countGenerationsByProject`'s existing "extract pure logic for testability" convention); `lint`/`typecheck`/`test`/`build`.
- **Estimated complexity:** M — the pattern to reuse already exists and is proven; the new work is applying it to a second table/action and choosing a defensible threshold.
- **Dependencies:** None.

### S6-005 — Schema Output Quality: Business-Rule `CHECK` Constraints and Realistic `VARCHAR` Sizing
- **Purpose:** TD-009 and TD-010, bundled — both are directly visible in the artifact a user is looking at, unlike almost anything else in this backlog, and both touch the same prompt-guidance-plus-type-map layer.
- **Files expected to change:** `lib/ai/ast-prompt-instructions.ts` (shared prompt guidance — CHECK-constraint hints, sizing hints — reused by all three providers, not duplicated per S5-002's own established convention), `lib/ast/schema.ts`/`lib/ast/types.ts` if the AST needs a new field to carry a CHECK expression or a column-length hint, `lib/compiler/sql/type-map.ts`, `lib/compiler/drizzle/type-map.ts`.
- **Implementation strategy:** Start with the obvious, low-ambiguity cases only (a numeric column named/described as a price, quantity, or age gets a non-negative CHECK; a short identifier-like string column — slug, code — gets a smaller width than a free-text description column) rather than attempting general-purpose business-rule inference, which risks false constraints the analyzer can't verify are actually intended.
- **Acceptance criteria:** A generation for a prompt with an obvious non-negative-quantity column produces a `CHECK` constraint in SQL output; string columns get materially different, more realistic widths than a single blanket 255 for every case; both changes preserve the compilers' existing determinism guarantee (same AST in, byte-identical output out).
- **Validation steps:** New compiler tests (hand-written expected-output assertions, per this project's own established testing-strategy decision — never snapshots); `lint`/`typecheck`/`test`/`build`; a live-provider check to confirm the prompt guidance actually changes model output is a nice-to-have, not a gate, per this project's own "no live-provider calls in CI" decision.
- **Estimated complexity:** L — touches AI prompt guidance (non-deterministic effect, needs real-model verification eventually) plus two compilers' type-mapping logic.
- **Dependencies:** None, but should not be branched simultaneously with any other compiler-touching work.

### S6-006 — Icon-Only Button Touch-Target Audit and Fix
- **Purpose:** TD-020's own "dedicated pass" recommendation, finally scheduled rather than indefinitely deferred.
- **Files expected to change:** `components/ui/button.tsx` (hit-slop mechanism for `icon-xs`/`icon-sm`), plus spacing adjustments wherever a cluster is currently too tight for a safe hit-slop expansion (`features/workbench/components/output-actions.tsx`, `SplitPaneCanvas`'s collapse chevrons, others TD-020 already names).
- **Implementation strategy:** Audit every icon-button cluster's actual spacing first (this is the step TD-020 itself says was skipped under S4-016's time pressure) — for each cluster, either widen the gap enough to safely add uniform padding-based hit-slop, or size the hit-slop per-cluster to the available space, never overlapping a neighbor.
- **Acceptance criteria:** Every audited icon-only control has a 44×44px effective hit area (verified via actual DOM inspection/measurement, not just class-name inspection, per Design System 2.0's own standard); no two adjacent controls' expanded hit areas overlap.
- **Validation steps:** A visual/manual check per cluster (documented per-cluster, not a single blanket claim) is required here — hit-slop correctness is not something a unit test alone can verify; `lint`/`typecheck`/`test`/`build`.
- **Estimated complexity:** M — mechanically simple per cluster, but the audit itself (every cluster in the app) is the real work TD-020 already flagged as non-trivial.
- **Dependencies:** None.

### S6-007 — First-Run Onboarding for New Authenticated Users
- **Purpose:** The single highest "first 30 seconds" opportunity found in this audit that isn't already tracked as debt — a new user lands on the dashboard today with only Prompt Suggestion chips (inside the Generator, not the Dashboard) to orient them.
- **Files expected to change:** Likely `components/dashboard/dashboard-overview.tsx` and/or a new `features/onboarding/` module — not fully pre-specified, since the mechanism itself is this task's own first decision.
- **Implementation strategy:** This task's own first step is choosing the mechanism (a dismissible empty-state callout on first login, a short numbered checklist, or a lightweight guided-tour overlay) — not pre-decided here, since each has different implementation cost and this document's own philosophy is to avoid guessing at product decisions. Whichever is chosen, it must never block or gate the existing "create project → generate" path, only supplement it, per this project's own "no training-wheels mode that later has to be turned off" principle already stated in `Generator-Experience-Specification.md` §First-Time Onboarding.
- **Acceptance criteria:** A first-time authenticated user sees some form of contextual orientation toward the Generator/Projects/History/Workbench, dismissible and never shown again once dismissed or once the user has created a first generation.
- **Validation steps:** Component tests for whatever mechanism is chosen; `lint`/`typecheck`/`test`/`build`; a manual first-run walkthrough, disclosed as unperformed live if no authenticated test session is available in this environment when implemented.
- **Estimated complexity:** M–L, depending on the mechanism chosen in its own first step.
- **Dependencies:** None, but benefits from being sequenced after S6-001 (Retry) if both touch the Generator's own surface, to avoid rebasing friction.

### S6-008 — Sprint 6 Closure
- **Purpose:** The same closure pattern every prior sprint (Sprint 0, 4, 5) has used — full validation, doc sync, a closure record.
- **Files expected to change:** `TECH_DEBT.md`, `SCHEMACRAFT_AI_MASTER_CONTEXT.md`, a new `docs/planning/Sprint-06-Closure.md`.
- **Implementation strategy:** Mirror `Sprint-05-Closure.md`'s own structure exactly.
- **Acceptance criteria:** Full CI-mirrored validation passes on the merged state; `TECH_DEBT.md` reflects every item this sprint resolved (TD-020, TD-022, and the deployment-related items) and any new debt knowingly incurred; the master context's deployment section is finally corrected to match §0's findings and whatever S6-002 resolved.
- **Validation steps:** `lint`/`typecheck`/`test`/`build`.
- **Estimated complexity:** S.
- **Dependencies:** All other Sprint 6 tasks.

---

## Priority Matrix

| Priority | Tasks | Why |
|---|---|---|
| **Critical** | S6-002 (CI/CD) | Technically required regardless of user-visibility — every other change (this sprint's and beyond) currently ships with zero automatic verification and an unreliable/ambiguous deploy path. The one exception to the "30 seconds" rule, exactly as that philosophy itself anticipates. |
| **High** | S6-001 (Retry), S6-005 (output quality) | Both directly visible to a user within their first real interaction with the product's core value (submitting a prompt, inspecting the result). |
| **Medium** | S6-003 (delete-account), S6-004 (rate limiting), S6-006 (touch targets), S6-007 (onboarding) | Real user/business value, but each affects a narrower slice of usage (settings, high-volume/abuse cases, touch/mobile users, first-run-only) rather than every user's core loop every time. |
| **Low** | *(none carried into Sprint 6 itself — see Future Roadmap)* | Everything lower-value than the above (TD-007/008/012/021/023, provider-selection UI) is deliberately pushed out, per the stated philosophy, rather than diluting this sprint. |

## Recommended Execution Order

1. **S6-002** first (or in parallel with everything else) — nothing else should be considered "safely shipped" without it, and it has no dependency on any other task.
2. **S6-001** and **S6-005** next — the two highest-value, most self-contained user-facing improvements; can run in parallel with each other if branched carefully (different files).
3. **S6-004** and **S6-003** — both are contained, decision-already-made implementation tasks; sequence either order.
4. **S6-006** — benefits from the codebase being otherwise stable (fewer new icon-button clusters appearing mid-audit).
5. **S6-007** last among the feature tasks — its own mechanism decision benefits from seeing S6-001's Retry UX land first, since both live on the same Generator surface.
6. **S6-008** — closure, always last.

## Estimated Sprint Duration

Eight tasks, one S, five M, one L, one closure — comparable in shape to Sprint 5 (5 tasks) but roughly 60% larger, and smaller than Sprint 4's 17-task sprint. At this project's own established cadence (one task at a time, fully validated and committed before the next begins), a realistic estimate is **6–9 focused implementation sessions** — S6-005 (L) and S6-002 (ADR-first, then implementation) are the two tasks most likely to run longer than their nominal size suggests.

## Biggest Technical Risks

1. **§0's deployment ambiguity is a live, currently-unresolved production risk**, not a backlog item — if anyone attempted a deploy today via either existing workflow, it would very likely fail silently or partially (wrong artifact-branch filter) without S6-002 landing first.
2. **S6-005's compiler changes carry real regression risk** against the compilers' own determinism guarantee — the existing test suite is the safety net, but any prompt-guidance change also has an inherently non-deterministic component (the AI model's actual behavior) that unit tests alone can't fully verify.
3. **No live infrastructure credentials exist in this environment** for several tasks' full verification (S6-002's actual deploy, S6-003's SQL smoke-test, any live-browser/contrast check) — every prior sprint hit this same wall and disclosed it rather than claiming false verification; Sprint 6 should expect and plan for the same, not be surprised by it.

## Biggest Product Risks

1. **Delete-account (S6-003) is irreversible by design (per AD-005)** — a bug in the `SECURITY DEFINER` function's `auth.uid()` scoping would be a severe, hard-to-recover security incident (a user deleting another user's account), not a cosmetic bug. This deserves review proportionate to that stakes, not the same review bar as a UI polish task.
2. **Rate limiting (S6-004) risks alienating legitimate power users** if the threshold is set without real usage data to justify it — an overly aggressive limit directly damages the exact "developer tool that respects the user's time" positioning this product has built toward all along.
3. **Onboarding (S6-007) risks becoming the "training wheels that never come off"** this project's own specs explicitly warn against (`Generator-Experience-Specification.md` §First-Time Onboarding) if its own first decision (which mechanism) isn't held to that same discipline.

## Recommendation for What Should Become Version 1.0

Version 1.0 should be defined as: **the current feature set, plus Sprint 6 in full, with the deployment story resolved and demonstrably working end-to-end via a real deploy (not just workflow files that exist).** Concretely, that means: natural-language generation with all five artifacts, a working multi-provider AI foundation (even if only Gemini is user-facing at 1.0), the Workbench, Account Settings including working delete-account, a real Retry path, authenticated-user rate limiting, improved schema output quality (CHECK constraints + sizing), and touch-target-compliant accessibility — shipped behind a CI/CD pipeline that is verified, not assumed, to work. Explicitly **not** required for 1.0, and better suited to the Sprint 7–9 outline below: iterative schema refinement, a public API, team/multi-user collaboration, a user-facing provider picker, and native `ENUM`/composite-FK/CSP polish. The distinguishing line: 1.0 is "the core single-user generation product is complete, trustworthy, and deployable" — not "every conceivable feature exists."

---

## Future Roadmap (Outline Only — No Implementation Plans)

### Sprint 7 — Iterative Refinement & Schema Evolution
High-level theme: let a user evolve an existing generation instead of starting over every time. Candidate scope: "add/modify a table" style follow-up prompts against an existing AST; a diff view between two generations in History; native `ENUM` reconsideration (TD-007) and composite FK physical constraints (TD-008), since both become more valuable once schemas are edited rather than only generated once. Genuinely new AI-prompting and AST-merge design work, not a continuation of Sprint 6's shape.

### Sprint 8 — Platform & Access Expansion
High-level theme: let the product be used by more than one person, and by more than the web UI. Candidate scope: a decision on team/multi-user project sharing (permissions model needed first); a public, authenticated API for programmatic generation (API keys, its own rate-limiting story building on S6-004's foundation); a user/account-level AI-provider picker now that S5-004's selection mechanism and Sprint 6's cost controls exist to make that safe to expose.

### Sprint 9 — Hardening, Compliance & Polish
High-level theme: the remaining lower-visibility items deliberately deferred out of Sprint 6. Candidate scope: CSP headers (TD-012); Workbench Fullscreen animation (TD-021) and remaining keyboard shortcuts (TD-023); production placeholder-data cleanup (TD-015, human-gated); a real privacy policy addressing AD-005's own disclosed backup-retention note; a formal accessibility contrast audit via real browser tooling (closing the gap `test/a11y.test.tsx` itself discloses it can't cover in jsdom).
