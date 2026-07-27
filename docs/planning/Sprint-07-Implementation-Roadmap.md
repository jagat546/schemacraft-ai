# Sprint 7 — Implementation Roadmap (Revised: Private Beta Readiness)

**Status:** Planning only. No application code, migrations, infrastructure, or documentation other than this file was written or modified to produce this revision.
**Author role:** Product Manager / Technical Architect / Senior Staff Engineer (planning-only capacity — implementation deliberately not started).
**Revision context:** This replaces the prior version of this document in full. The prior version optimized for "will a user notice this improvement" in general; this revision re-optimizes for a specific, concrete scenario the prior version wasn't given — **a private beta in 2–3 weeks, with 100 real users** — which changes what counts as priority. README/documentation cleanup/Developer Settings/internal tooling, all P1-adjacent in the prior version, are demoted here per explicit instruction: they do not block beta and a beta user will not notice them. Two things the prior version under-weighted turned out, on this pass, to be more urgent than anything it proposed — see §4.

---

## 1. Executive Summary

The repository is feature-complete for a single-user core loop and passes every automated gate (347 tests, clean lint/typecheck/build). But re-reading it specifically through "100 real strangers are about to use this" surfaced two things the prior planning pass missed because it was optimizing for general product maturity, not launch readiness:

1. **The two SQL functions Sprint 6 shipped (`check_authenticated_rate_limit`, `delete_own_account`) have never been applied to any live database.** This isn't a polish gap — if beta invites go out before this is fixed, **every authenticated generation request fails** the moment the rate-limit RPC call errors (the code fails closed by design), and delete-account silently errors for anyone who tries it. This is the single most severe finding in this document.
2. **There is no route-level loading, error, or not-found handling anywhere in the App Router** (`app/**/loading.tsx`, `error.tsx`, `not-found.tsx` — confirmed absent, all three, by direct search). A hundred real users on real, variable-latency connections will click into the Dashboard, Generator, Workbench, History, or Settings and see either a frozen previous screen or a blank one until the server responds, with zero feedback that anything is happening — and if anything throws unexpectedly, they get Next.js's raw default error screen instead of this product's own error experience. For a private beta, first impressions are the entire point; this is the highest-leverage, lowest-effort fix available.

Given the beta framing, this revision cuts the prior version's task list from five implementation tasks to three, removes everything that doesn't clear the "will a beta user immediately notice and benefit" bar, and moves README/Developer-Settings/diff-view to a Sprint 8 parking lot exactly as instructed.

---

## 2. Beta Readiness Assessment

**Core loop (prompt → 5 artifacts → save → revisit):** Ready. Retry, output-quality (CHECK constraints, realistic sizing), and the full account lifecycle are all shipped and tested.

**Not actually ready despite passing every automated gate:** The automated gates (lint/typecheck/test/build) all pass, and correctly so — they test code correctness, not live-environment readiness. Two live-environment gaps exist that no amount of `npm test` will catch:
- The rate-limit and delete-account SQL functions are code-complete but **not deployed**. `npm test`, `lint`, and `build` all pass without ever calling them for real — this is a live-deployment gap, invisible to the automated suite.
- No live browser/device verification exists for how the app actually feels on a slow connection or a small screen. This document flags it as an open risk (§8) rather than inventing a task to "fix" something not yet confirmed broken.

**Bottom line:** The application is *correct*; it is not yet *deployed and configured correctly for 100 concurrent strangers to use it safely*. Sprint 7 should close the second gap as far as application code can, and this document should make the first gap impossible to miss.

---

## 3. Top User Pain Points (Beta Lens)

Re-ranked specifically for "a brand-new user's first 1–3 sessions during a private beta," not general product maturity:

1. **Perceived unresponsiveness during navigation.** No `loading.tsx` anywhere — clicking Dashboard → Generator → Workbench → History → Settings gives no feedback while the server fetches; on a real (non-localhost) connection this reads as "did my click work?"
2. **A raw framework error screen on any unexpected failure.** No `error.tsx` — an unhandled exception anywhere in a Server Component shows Next.js's default crash UI, not this product's own `ErrorState` pattern, breaking the illusion of a finished product at the worst possible moment.
3. **Hitting the generation rate limit with no sense of when to try again.** S6-004 shipped a correct 60/hour + 10/minute ceiling with a clear rejection message — but "try again later" with no indication of *how much* later is a real point of confusion for someone actively exploring the product for the first time, exactly the population most likely to fire several generations in quick succession.
4. **No low-friction way to iterate on a generation without retyping the whole prompt.** A beta user who generates something close-but-not-quite-right has to remember/reconstruct their own prompt from scratch to try again.

**Explicitly not in this list, per the beta lens:** a stale README (no beta user reads it), a "coming soon" Developer Settings toggle (cosmetic, not blocking), documentation sync (internal), generation-diff view (requires a user to already have 2+ generations of the same project — a second-session feature, not a first-impression one).

---

## 4. Launch Blockers

These are not Sprint 7 tasks (no application code needs to be written for the first one; the second is outside this execution role's ownership) — they are listed here because they are more urgent than anything in §6, and this document would be dishonest if it buried them.

1. **P0 — Apply the two prepared SQL functions to the live Supabase project before any beta invite goes out.** `supabase/rls.sql`'s `check_authenticated_rate_limit()`/`generation_rate_limit_events` (S6-004) and `delete_own_account()` (S6-003) are reviewed, version-controlled, and committed — but not applied to any live database (this environment has no live Supabase credentials, consistent with this project's standing disclosure). **Concrete, verified impact if this is skipped:** `checkAuthenticatedGenerationRateLimit()` calls the RPC; if the function doesn't exist, the call errors; `resolveRateLimitOutcome()` fails closed on any error (by design, to avoid silently bypassing the limiter); `generate-schema.ts` returns `RATE_LIMIT_UNAVAILABLE` for every single authenticated generation request. **In plain terms: if this migration isn't applied, no beta user can generate a schema at all**, not "rate limiting won't work" — the feature fails closed, and closed means "nobody gets through." This is not a Sprint 7 code task because the code is already correct and already committed; the action needed is running already-reviewed SQL against the real database, which requires credentials this environment doesn't have. **This is the single highest-priority item in this entire document.**
2. **P0 for a real beta — CI/CD reliability (TD-024/AD-006).** DevOps-owned, out of this execution role's scope per standing ownership rules. Restated here because it remains true: CI has no automatic trigger, and the CD workflow is non-functional. A team about to onboard 100 real users needs a working, verified deploy path; this document cannot resolve it but will not omit it either.
3. **P1 for beta confidence, not strictly blocking — a live pass on the Workbench/Generator/Dashboard on an actual mobile viewport and a throttled connection.** Nothing in this repository confirms this was ever verified with a real device; nothing confirms it's broken either. Listed as an open risk (§8), not invented as a task, since there is no concrete defect to fix yet — only an unknown to close before invites go out.

---

## 5. Revised Sprint 7 Goals

**Objective:** Make the core loop feel resilient and responsive under real, imperfect network conditions, and remove the two sharpest points of first-session confusion (unclear rate-limit rejections, no way to iterate on a prompt) — while leaving every non-user-facing item (README, Developer Settings, documentation sync, generation-diff) for after beta feedback starts coming in.

**Business value:** A private beta's entire purpose is collecting signal from real users; a beta that feels broken (frozen navigation, raw crash screens, confusing rejections) generates noise about *polish* instead of signal about the *product*, wasting the beta's actual purpose.

**User value:** Every click gives immediate feedback; an unexpected error looks like part of the product, not a crash; hitting a rate limit tells you when to come back; iterating on a schema doesn't mean retyping it from memory.

**Acceptance criteria (sprint-level):** Every primary authenticated route has a loading state and is covered by a root-level error boundary; a rate-limited rejection tells the user approximately when they can retry; a past generation's prompt can be carried into the Generator for editing; every task passes lint/typecheck/test/build individually and is committed before the next begins; the two launch-blocking SQL functions' un-applied status is escalated, visibly, as this document's top finding (§4), not silently deferred.

**Estimated effort:** 3 implementation tasks + 1 lightweight closure task — smaller than both prior Sprint 7 drafts, reflecting a deliberately narrow, beta-focused scope.

---

## 6. Revised Sprint 7 Tasks

### S7-001 — Route-Level Loading, Error, and Not-Found States
- **Priority:** **P1** (the highest-priority task in this sprint — closest to a true launch blocker of anything actually buildable as application code this sprint).
- **User value:** Every navigation gives immediate visual feedback instead of an unexplained pause; an unexpected error shows this product's own recovery UI instead of a raw framework crash screen; a bad/stale URL shows a helpful, branded page instead of Next's default 404.
- **Business value:** For a private beta specifically, this is the highest-leverage fix available — it's the difference between "feels like a real product" and "feels unfinished," for every single user, on their very first click, regardless of what they're testing.
- **Scope:** Add `app/(dashboard)/loading.tsx` (and per-route-segment loading files for `dashboard/generator`, `dashboard/projects/[id]/workbench`, `dashboard/projects/[id]/history`, `dashboard/projects/[id]/settings`, `dashboard/settings` if a single shared one doesn't fit every route's layout well) using a lightweight, generic skeleton — reuse the existing `OutputSkeleton`/shimmer visual language rather than inventing a new loading pattern. Add a root `app/error.tsx` (and `app/global-error.tsx` for errors in the root layout itself) rendering this product's existing `ErrorState` pattern with a "Back to Dashboard" recovery action. Add a root `app/not-found.tsx` in the same visual language.
- **Files expected to change:** New `app/(dashboard)/loading.tsx` (and siblings as needed), new `app/error.tsx`, `app/global-error.tsx`, `app/not-found.tsx`. No existing route or Server Action logic changes — this is purely additive, Next.js-convention-based UI.
- **Acceptance criteria:** Navigating to any primary authenticated route shows an immediate loading state before content is ready (verifiable by artificially delaying a data fetch in dev and confirming a skeleton renders, not a blank/frozen screen); a deliberately-thrown error in a test route renders the product's own `ErrorState`, not Next's default; visiting a non-existent path under `/dashboard` renders the branded not-found page.
- **Dependencies:** None — purely additive, touches no existing file.
- **Estimated effort:** S–M (mechanical, framework-convention-based; the only judgment call is how many route segments need their own loading skeleton vs. sharing one).

### S7-002 — Rate-Limit Rejection Clarity
- **Priority:** **P1** (upgraded from the prior version's "optional/P2" — a beta with 100 actively-exploring real users makes hitting the 10/minute burst ceiling a realistic, not edge-case, event).
- **User value:** A rate-limited user knows approximately when to come back instead of wondering if something broke or if they're locked out permanently.
- **Business value:** Directly reduces beta support-channel noise ("is the app down?" / "why can't I generate?") during exactly the window when the team most needs signal about the product, not about a confusing error message.
- **Scope:** Have `check_authenticated_rate_limit()` (and its repository wrapper) return enough information to compute an approximate retry time (e.g., seconds until the oldest counted request ages out of whichever window was hit), surfaced in the existing rejection message.
- **Files expected to change:** `supabase/rls.sql` (`check_authenticated_rate_limit`'s return shape — still prepared-but-unapplied SQL, so this is a same-category change, not a new risk category), `lib/repositories/rate-limit.repository.ts`, `lib/actions/generate-schema.ts`'s rejection message.
- **Acceptance criteria:** A rate-limited rejection includes an approximate wait time, not just "please try again later."
- **Dependencies:** None on other Sprint 7 tasks. Depends on the same launch-blocking migration-application step as §4 item 1 to ever take effect live — building this now means it's ready the moment that migration lands, not an extra round-trip later.
- **Estimated effort:** S.

### S7-003 — Edit & Regenerate: Carry a Past Generation's Prompt Forward
- **Priority:** **P1** (carried over from the prior version, unchanged reasoning — still the most concretely-achievable "let a user iterate instead of starting over" improvement, and still something an engaged beta user will hit within their first few generations).
- **User value:** A user who wants to adjust a schema they already generated can do so directly, without reconstructing the original prompt from memory.
- **Business value:** More second/third generations per user during the beta window means more real usage signal per user, which is the actual point of a private beta.
- **Scope:** Add an "Edit & Regenerate" action to a past generation in `features/history/components/generation-history-item.tsx`. Clicking it sets `useGenerationStore`'s `prompt` to that generation's stored prompt and navigates to `/dashboard/generator` — reusing exactly the pattern `OnboardingCard` (S6-007) already established, not inventing a new mechanism.
- **Files expected to change:** `features/history/components/generation-history-item.tsx`; a small shared helper only if the same logic is needed in a second location (do not create one speculatively for a single call site).
- **Acceptance criteria:** Clicking "Edit & Regenerate" navigates to the Generator with that generation's exact original prompt pre-filled and editable; submitting creates a new version through the unmodified existing pipeline.
- **Dependencies:** None.
- **Estimated effort:** S.

### S7-004 — Sprint 7 Closure (Scoped Down for Beta Timeline)
- **Priority:** P2 (still necessary as a gate, but deliberately minimal per the "don't over-invest in documentation before beta" instruction).
- **User value:** None directly — this is the validation gate, not a feature.
- **Business value:** Confirms the beta-bound state is actually green before invites go out.
- **Scope:** Full `lint`/`typecheck`/`test`/`build` on the merged state. A short `TECH_DEBT.md` entry for whatever this sprint closes. **Explicitly do not** perform a full `SCHEMACRAFT_AI_MASTER_CONTEXT.md` rewrite or touch `README.md` — both are Sprint 8 Parking Lot items per explicit instruction. A closure note may be as short as confirming green gates and listing what shipped; it does not need Sprint 5/6's full closure-document ceremony this time.
- **Files expected to change:** `TECH_DEBT.md` (minimal); optionally a short `docs/planning/Sprint-07-Closure.md` if the team wants a record, but this is not required to be as extensive as prior sprints' closure docs.
- **Acceptance criteria:** All four gates pass on the merged state.
- **Dependencies:** S7-001, S7-002, S7-003 all complete.
- **Estimated effort:** S.

---

## 7. Sprint 8 Parking Lot

Everything below is real, was considered, and is explicitly **not** in Sprint 7 because it fails the "will a beta user immediately notice and benefit" test, per direct instruction to deprioritize these unless they block beta — none of them do:

- **README refresh.** No beta user reads the GitHub README. Real value, zero beta-launch urgency.
- **Developer Settings "Show raw project IDs" toggle.** Cosmetic completion of a "coming soon" badge; blocks nothing.
- **Generation Comparison (diff view).** Genuinely useful, but requires a user to already have 2+ generations of the same project — a second-session-or-later feature, not a first-impression one. Revisit once beta usage data shows people are actually accumulating multiple versions per project.
- **`TECH_DEBT.md`'s TD-023/TD-024 ordering bug** (a documentation-formatting slip found during the prior audit pass). Trivial, non-user-facing, fold into whichever future task next touches that file.
- **SQL dialect / naming-convention support.** Still blocked on a product decision that hasn't been made (§9 of the prior version's reasoning still holds).
- **Monetization/billing, public API, team sharing, provider-selection UI.** All still blocked on product/business decisions not made, per the prior version's assessment — unchanged by the beta framing.
- **Native `ENUM` reconsideration, composite FK Drizzle constraints, CSP headers, Workbench fullscreen animation, remaining keyboard shortcuts, production placeholder-data cleanup, a formal contrast audit.** All previously deferred to a "Sprint 9-ish" hardening pass; the beta framing doesn't change that — none of these are things a first-time beta user will hit or notice.

---

## 8. Risks

- **The single biggest risk to this entire beta is organizational, not technical: if the §4 migration-application step is skipped or forgotten, the authenticated generation path is completely broken for every user the moment beta starts.** This risk is not mitigated by anything in Sprint 7's task list — it requires a human with live Supabase credentials to run the already-reviewed SQL before invites go out. Flagging this as loudly as this document can is the most valuable thing this revision does.
- **Mobile/real-device experience is an unverified unknown, not a confirmed defect.** No live browser or device testing has been performed in this environment (no browser available here) or disclosed anywhere in the repository as having been performed elsewhere. Recommend a quick manual pass (a real phone, a throttled-network dev-tools pass) on the Dashboard/Generator/Workbench before invites go out — cheap insurance, not a Sprint 7 code task, since there's no confirmed defect to fix yet.
- **S7-001's loading states are only as good as where they're placed** — a loading skeleton on a route that resolves in 50ms adds a flash of loading UI that's arguably worse than nothing. Mitigate by only adding `loading.tsx` to routes with a real server round-trip (all of the authenticated dashboard routes qualify — every one awaits at least one Supabase call).
- **S7-002 depends on the same un-applied migration as §4** to ever take effect for real — building it now is still correct (it's ready the moment the migration lands, avoiding a second round of changes later), but it cannot be verified live in this environment either.
- **None of Sprint 7's three tasks touch the AST, compiler, or provider architecture** — the lowest-architectural-risk possible shape for a sprint scheduled directly before a real user beta.

---

## 9. Definition of Done

- **Release-blocking for Sprint 7 itself:** S7-001, S7-002, S7-003, S7-004.
- **Escalated, not scheduled as a Sprint 7 task, and more urgent than all four combined:** applying the two prepared SQL functions to the live Supabase project (§4, item 1) — this must happen before beta invites go out, regardless of Sprint 7's own completion status.
- Every release-blocking task: implementation complete (where applicable), tests added/updated, lint/typecheck/build passing, committed individually, per the standing Sprint Execution Rule.
- No README rewrite, no Developer Settings work, no full master-context sync, and no generation-diff view are part of this sprint — all explicitly deferred to Sprint 8 per §7.
- **Final check, answered directly:** would this still be the roadmap with only one sprint left before 100 real beta users arrive? Yes — every task left in §6 is something a first-time user will directly feel (a responsive, resilient core loop; a clear rate-limit message; a way to iterate without retyping), and every item that didn't clear that bar was moved to §7 rather than kept out of caution.
