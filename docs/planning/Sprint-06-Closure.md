# Sprint 6 — Product Hardening & First-Run Experience — Closure

**This is the Sprint 6 execution record.** It tracks why Sprint 6 exists, what was done, what remains, and what closes it. For permanent, evergreen project facts (tech stack, architecture, features), see `SCHEMACRAFT_AI_MASTER_CONTEXT.md` — that information is deliberately not repeated here.

**Last updated:** 2026-07-27, after task S6-008 (Sprint 6 closure).

**Sprint 6 completion date:** 2026-07-27

---

## 1. Sprint Overview

- **Sprint name:** Sprint 6 — Product Hardening & First-Run Experience
- **Sprint objective:** Close the highest customer-value gaps and technical risks found during the Sprint 6 planning audit (`docs/planning/Sprint-06-Implementation-Roadmap.md`) — a Generator Retry action, business-rule schema output quality, authenticated-user rate limiting, a working delete-account flow, an icon-button touch-target fix, and a first-run onboarding experience — while auditing (not fixing, per updated ownership rules) the deployment/CI-CD ambiguity found in the same planning pass.
- **Sprint philosophy:** One roadmap task at a time, each fully validated (lint/typecheck/test/build) and committed before the next begins, in the user's explicit implementation order (S6-002 → S6-001 → S6-005 → S6-004 → S6-003 → S6-006 → S6-007 → S6-008). Mid-sprint, the execution role's scope was explicitly narrowed to application-development only — `.github/workflows/*` and other infrastructure/CI-CD/production-deployment configuration became out of bounds, to be audited and documented rather than modified. S6-002 was re-scoped to an audit-only task as a direct result.
- **Current status:** ✅ **Completed.** All 8 roadmap tasks (S6-001 through S6-008) are complete. The repository builds, typechecks, lints, and tests clean as of the closing verification run in S6-008.

---

## 2. Why Sprint 6 Exists

Sprint 5 closed with a working, provider-agnostic AI architecture but left a stack of previously-identified gaps unaddressed: TD-022 (no Retry button on a failed generation), TD-020 (icon-only buttons under the 44×44px touch-target minimum), TD-009/TD-010 (blanket `VARCHAR(255)` and no business-rule `CHECK` constraints), a resolved-but-unimplemented delete-account decision (AD-005), and no rate limiting at all on the authenticated generation path (a real cost/abuse exposure, unlike the already-rate-limited public sandbox). A dedicated planning pass (`docs/planning/Sprint-06-Implementation-Roadmap.md`) audited the repository directly — not prior planning docs — and additionally surfaced that CI no longer runs automatically and the legacy EC2/PM2 deploy pipeline is non-functional. Sprint 6 exists to close the highest-value items from that audit, prioritized by the stated philosophy: "will the user notice this in the first 30 seconds?"

---

## 3. Completed Tasks

### S6-002 — Deployment-Strategy Audit (re-scoped: DevOps-owned, audit only)
- **Status:** ✅ Complete (commit `6128e27`).
- **Outcome:** Under the sprint's updated ownership rules, `.github/workflows/*` and other infrastructure files are out of this execution role's scope — a Sprint task that would otherwise require changing them stops short and instead documents why the change is needed, which files would change, and the recommended DevOps action. `docs/architecture/AD-006-deployment-strategy.md` records the audit: `project_ci.yml` triggers only on `workflow_dispatch` (no automatic push/PR verification, lost from the pre-EC2-experiment `ci.yml`), and `project_cd.yml` looks up a CI run on a `develop/chirag` branch filter that doesn't correspond to any active branch — non-functional as written, and targeting EC2/PM2, which conflicts with Vercel as the user's confirmed production platform. `TECH_DEBT.md` TD-024 tracks the finding. No workflow, config, or infra file was changed.

### S6-001 — Generator Retry Button
- **Status:** ✅ Complete (commit `a5d9d76`).
- **Outcome:** `GenerationStatus`'s error branch now renders an `ErrorState` with a `kind: "retry"` action instead of a plain message, wired by `SchemaGenerator` to the exact same `handleGenerate` function the Generate button already calls — no new submission logic, no `generation-store.ts`/`use-generate-schema.ts` changes needed, since the prompt was already preserved on failure. The Generator spec's former "partial-streaming failure" bullet (already established in TD-022 as architecturally impossible given the pipeline's one-atomic-call design) was removed from `Generator-Experience-Specification.md` and `User-Journey-Maps.md` Journey 5 rather than ever attempted. Closes TD-022.

### S6-005 — Schema Output Quality: Business-Rule CHECK Constraints and Realistic VARCHAR Sizing
- **Status:** ✅ Complete (commit `e6c8d75`).
- **Outcome:** `ColumnNode` gained an optional `maxLength` field (only meaningful for `type: "string"`), defaulting to each compiler's existing 255 width when unset so no current output changes for AI responses that omit it. Both compilers (`lib/compiler/sql/type-map.ts`, `lib/compiler/drizzle/type-map.ts`) now use it. The AST and both compilers already fully supported table-level `check` constraints structurally (`tableConstraintNodeSchema`, rendered by both compilers) — the actual gap was prompt guidance, not architecture. `lib/ai/ast-prompt-instructions.ts`'s `buildSharedAstInstructions()` (read by all three providers) now asks for a non-negative `CHECK` constraint on numeric columns unambiguously representing a price/amount/quantity/age, and a realistic `maxLength` per string column (small for identifier-like values, larger for display names, `"text"` instead of a large `maxLength` for genuine free text) — deliberately scoped to unambiguous cases only, not general-purpose business-rule inference. Closes TD-009/TD-010.

### S6-004 — Authenticated-User Generation Rate Limiting
- **Status:** ✅ Complete (commit `d99f96d`).
- **Outcome:** 60 generations/hour, burst 10 requests/minute, per the approved decision. A new `check_authenticated_rate_limit()` `SECURITY DEFINER` Postgres function reuses the public sandbox's proven `pg_advisory_xact_lock` check-then-act pattern (`check_sandbox_rate_limit` is the direct precedent), keyed by `user_id` instead of `ip_hash` and enforcing both windows in one call via a new `generation_rate_limit_events` table. `lib/repositories/rate-limit.repository.ts` wraps the RPC call and extracts `resolveRateLimitOutcome()` as pure, independently testable logic (mirroring `countGenerationsByProject`'s existing convention). `generate-schema.ts` checks it before the AI call, failing closed (denying the generation) if the rate limiter itself is unreachable. No `GenerationService` public API changes. Prepared but not applied to any live database.

### S6-003 — Delete-Account Implementation
- **Status:** ✅ Complete (commit `762219c`).
- **Outcome:** Executes AD-005's already-accepted recommendation exactly, with no re-litigation of soft-vs-hard-delete or the `SECURITY DEFINER`-vs-service-role choice. `delete_own_account()` — a `SECURITY DEFINER` function scoped to `auth.uid()` (never a caller-supplied ID) — deletes the `auth.users` row, cascading every one of the user's `profiles`/`projects`/`generations`/`user_preferences` rows away in the same transaction via the existing FK chain. `deleteAccountAction` (`lib/actions/auth.ts`) calls it, then signs out globally. `AccountSettings` replaces its former "deliberately not implemented" placeholder with a high-friction confirmation dialog requiring the account's email or the literal word "delete" before the destructive action is reachable. Prepared but not applied to any live database — AD-005's own disclosed live-instance smoke-test gap remains open.

### S6-006 — Icon-Only Button Touch-Target Audit
- **Status:** ✅ Complete (commit `916618d`).
- **Outcome:** Every icon-only `Button` size variant (`icon-xs`/`icon-sm`/`icon`/`icon-lg`) in `components/ui/button.tsx` now carries an invisible `::before` pseudo-element sized to 44×44px and centered on the button — a single, shared fix reaching every consumer at once, expanding the clickable region without changing the visible button size. Per the audit's own disclosed concern about overlapping hit-slops in tightly-packed clusters, every cluster of two-or-more adjacent icon-only buttons (`OutputActions`, the Workbench generation nav, `SplitPaneCanvas`'s collapse chevrons, `MermaidCanvas`'s zoom controls) had its gap widened one step up the design system's spacing scale to reduce (not necessarily eliminate) overlap between neighbors. Standalone icon buttons needed no spacing change. Closes TD-020.

### S6-007 — First-Run Onboarding for New Authenticated Users
- **Status:** ✅ Complete (commit `99d9ae3`).
- **Outcome:** A dismissible Dashboard card per the approved decision: example prompts (reusing `PromptSuggestions` as-is), a templates entry point, a "Generate your first schema" CTA, and a documentation link (to the public landing page, per explicit product direction — no in-app docs/help destination exists yet). A single static card, not a guided tour/coach-marks/walkthrough overlay, consistent with the Generator spec's own "training wheels that never come off" warning. Picking an example prompt sets the Generator's existing `generation-store` prompt and navigates to `/dashboard/generator`, reusing the store rather than inventing a query-param mechanism. Dismissal is cookie-backed (`lib/onboarding/dismissed-cookie.ts`), the same guaranteed-no-DB-dependency pattern as the existing accessibility-preferences cookie — fires on explicit dismiss and automatically once a real generation completes (`generate-schema.ts`'s `SUCCESS`/`GENERATED_NOT_SAVED` outcomes).

### S6-008 — Sprint 6 Closure
- **Status:** ✅ Complete (this task).
- **Outcome:** Full validation (`lint`, `typecheck`, `test`, `build`) re-run clean on the fully-merged state (347/347 tests, 45 files). `TECH_DEBT.md` synchronized (TD-009, TD-010, TD-020, TD-022 marked resolved with their fixes described; TD-024 added for the S6-002 audit finding). `SCHEMACRAFT_AI_MASTER_CONTEXT.md` synchronized (executive summary, technology stack, repository structure, architecture overview, current features, known risks, current sprint summary). This document written.

---

## 4. Remaining Sprint Tasks

None. All 8 roadmap tasks are complete.

---

## 5. Current Repository Health

As of the Sprint 6 closing verification (S6-008, re-run in the same session as this document):

| Check | Status |
|---|---|
| Build (`npm run build`) | ✅ Passing — Turbopack, all 12 routes generated, static/dynamic split unchanged from pre-Sprint-6 |
| TypeScript (`npm run typecheck`) | ✅ Passing, zero errors |
| ESLint (`npm run lint`) | ✅ Passing, zero errors/warnings |
| Tests (`npm test`) | ✅ Passing, 347/347 across 45 files |
| Repository integrity | Branch `feature/sprint-6-application` (renamed from an earlier, DevOps-scoped branch name once S6-002 was re-scoped to audit-only), built on top of `5f1df43` (the Sprint 6 roadmap commit, itself on `main`) |
| Documentation progress | `SCHEMACRAFT_AI_MASTER_CONTEXT.md` synchronized; `TECH_DEBT.md` updated (TD-009, TD-010, TD-020, TD-022 resolved; TD-024 added); `docs/architecture/AD-006-deployment-strategy.md` in place; `AD-005-delete-account.md` updated to Implemented; this document written |

---

## 6. Known Risks

Updated at Sprint 6 closure to reflect what was resolved and what's newly disclosed:

- **The deployment-target ambiguity found in S6-002's audit is real and unresolved** — CI still requires a manual trigger, and the EC2/PM2 CD pipeline is non-functional and conflicts with Vercel as the confirmed platform. This is DevOps-owned infrastructure work, explicitly out of this sprint's execution scope; `docs/architecture/AD-006-deployment-strategy.md` records concrete recommended actions for whoever owns that surface.
- **Two new prepared-but-unapplied SQL functions** (`check_authenticated_rate_limit()`/`generation_rate_limit_events`, S6-004; `delete_own_account()`, S6-003) still need a live, non-production Supabase smoke test before being considered fully verified — this environment has no live Supabase credentials, consistent with every other DB-touching decision this project has made.
- **No live browser/pixel verification of the S6-006 touch-target fix was performed** — the 44px hit-slop is verified by reading the resulting computed CSS and by the full validation gate passing, not by an actual click-precision test in a real browser.
- **Anthropic and OpenAI remain implemented but unusable in any real environment** — unchanged by Sprint 6, since no task this sprint touched AI-provider credentials or selection UI.
- All Sprint 4/5 residual risks not touched by Sprint 6 (TD-005, TD-015, TD-021, TD-023, the two Sprint-4-era prepared-but-unapplied database changes, the contrast-verification and live-browser-verification gaps) are unchanged — see `SCHEMACRAFT_AI_MASTER_CONTEXT.md` §9 and `TECH_DEBT.md` for the full, current list.

The full, unabridged risk and issue inventory lives in `TECH_DEBT.md`; this section is a summary, not a replacement for it.

---

## 7. Sprint Exit Criteria

Evaluated at closure (S6-008):

1. **Build, TypeScript, lint, and test checks all pass cleanly on the fully-merged state.** ✅ Met — all four re-run in this session (§5).
2. **A failed generation can be retried without retyping the prompt.** ✅ Met — S6-001, verified by a unit test on the retry wiring; a live check was not performed (no authenticated session available in this environment).
3. **`delete_own_account()` exists as reviewed, version-controlled SQL, and Account Settings calls it behind a high-friction confirmation.** ✅ Met — S6-003, per AD-005 exactly. Not yet applied to any live database, matching this project's established DB-change discipline.
4. **An authenticated user hitting the generation-rate ceiling gets a clear, actionable message.** ✅ Met — S6-004, fails closed with a distinct, user-facing message rather than a silent failure or unbounded cost.
5. **Business-rule CHECK constraints and realistic VARCHAR sizing ship in generated SQL/Drizzle output, covered by compiler tests.** ✅ Met — S6-005.
6. **Icon-only controls meet the 44×44px effective hit-area minimum without (materially) overlapping a neighbor.** ✅ Met — S6-006, with the overlap-reduction caveat disclosed in §6 above (a live pixel-precision check was not performed).
7. **A first-time authenticated user sees some form of contextual orientation.** ✅ Met — S6-007, a dismissible onboarding card.
8. **`TECH_DEBT.md` and `SCHEMACRAFT_AI_MASTER_CONTEXT.md` synchronized; a Sprint 6 closure note added.** ✅ Met — §5/§6 above, and this document.

**Sprint 6 status: ✅ Completed 2026-07-27**, with the deployment-target ambiguity (§0 of the Sprint 6 roadmap) explicitly carried forward as DevOps-owned work rather than resolved by this sprint — a deliberate scope boundary, not a missed criterion, since no Sprint 6 exit criterion required it to be fixed by this execution role.

---

## 8. Deferred Work

Work identified during Sprint 6 but explicitly out of its scope, deferred to future work:

- **Restoring automatic CI and resolving the EC2/PM2 vs. Vercel deployment ambiguity** — DevOps-owned; `docs/architecture/AD-006-deployment-strategy.md` records the recommended actions.
- **Live, non-production Supabase smoke tests** for `delete_own_account()` and `check_authenticated_rate_limit()` — both prepared, neither applied, consistent with this project's standing discipline for schema-adjacent changes.
- **A UI/account-level mechanism for AI provider selection** beyond the `DEFAULT_AI_PROVIDER` environment variable (carried over from Sprint 5, untouched this sprint).
- **Git↔Vercel auto-deploy integration** (TD-005, carried over, DevOps-owned).
- All pre-existing, lower-priority items already tracked in `TECH_DEBT.md` and not touched by Sprint 6 (TD-005, TD-015, TD-021, TD-023).

---

## 9. Sprint Timeline

```
Deployment Audit (S6-002)
   ↓  AD-006 records the Vercel decision + CI/CD findings -- no
      infra files changed, per updated ownership rules
Generator Retry (S6-001)
   ↓  Retry action wired to the existing submission path; closes TD-022
Output Quality (S6-005)
   ↓  maxLength field + CHECK-constraint/sizing prompt guidance;
      closes TD-009/TD-010
Rate Limiting (S6-004)
   ↓  check_authenticated_rate_limit() reuses the sandbox's proven
      pg_advisory_xact_lock pattern
Delete Account (S6-003)
   ↓  delete_own_account() + deleteAccountAction + confirmation UI,
      executing AD-005 exactly
Touch Targets (S6-006)
   ↓  44px hit-slop on every icon-only Button variant; closes TD-020
Onboarding (S6-007)
   ↓  Dismissible Dashboard card, cookie-backed, auto-dismisses on
      first real generation
Closure (S6-008)
   ✅ all exit criteria (§7) met; Sprint 6 formally closed 2026-07-27
      ── current position ──
```

---

## 10. Next Milestone

Sprint 6 was the last sprint scoped in `docs/planning/Sprint-06-Implementation-Roadmap.md`. No Sprint 7 scope has been started, planned, or implied by anything in this document or in `SCHEMACRAFT_AI_MASTER_CONTEXT.md` — per this sprint's own standing execution instructions, Sprint 6's closure is where this body of work stops. The roadmap's own "Future Roadmap (Outline Only)" section sketches Sprint 7 (Iterative Refinement & Schema Evolution) and Sprint 8 (Platform & Access Expansion) at a high level, with no implementation plan for either. Candidate next-milestone inputs are: the DevOps-owned deployment-ambiguity fix (AD-006), the two live-Supabase smoke tests deferred in §8, and whatever product direction is set outside this document.
