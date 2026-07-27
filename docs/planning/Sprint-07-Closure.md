# Sprint 7 — Private Beta Readiness — Closure

**This is the Sprint 7 execution record.** For permanent, evergreen project facts (tech stack, architecture, features), see `SCHEMACRAFT_AI_MASTER_CONTEXT.md` — not repeated here. Per the approved Sprint 7 scope, this closure is deliberately shorter than Sprint 5/6's own closure documents: README.md and a full documentation rewrite were explicitly out of bounds this sprint (Sprint 8 parking lot).

**Last updated:** 2026-07-27, after task S7-004 (Sprint 7 closure).
**Sprint 7 completion date:** 2026-07-27

---

## 1. Sprint Overview

- **Sprint name:** Sprint 7 — Private Beta Readiness
- **Sprint objective:** Re-evaluate the Sprint 6 roadmap's own general-purpose "Iterative Refinement" outline against a concrete scenario — a private beta in 2–3 weeks with 100 real users — and implement only what clears the bar "will a beta user immediately notice and benefit." README refresh, the Developer Settings toggle, a generation-diff view, and documentation cleanup were all explicitly deferred (none block or are noticed by a beta user).
- **Status:** ✅ **Completed.** All 4 tasks (S7-001 through S7-004) complete. Repository builds, typechecks, lints, and tests clean as of the closing verification run.

## 2. Completed Tasks

- **S7-001 — Route-Level Loading, Error, and Not-Found States** (commit `54c8cbe`). `app/(dashboard)/loading.tsx`, `app/error.tsx`, `app/global-error.tsx`, `app/not-found.tsx` — all purely additive Next.js App Router convention files. Closes the gap found during Sprint 7 planning: no route ever gave navigation feedback, and any unexpected error fell through to Next's default crash screen instead of this product's own `ErrorState`.
- **S7-002 — Edit & Regenerate** (commit `28e935c`). `GenerationHistoryItem` gained an action that carries a past generation's prompt into the Generator via the shared `generation-store`, reusing the exact pattern `OnboardingCard` (S6-007) established.
- **S7-003 — Rate-Limit Rejection Clarity** (commit `25b7d4e`). `check_authenticated_rate_limit()` now returns `jsonb` with a `retry_after_seconds` estimate; `formatRateLimitRetryMessage()` turns it into a clear rejection message. Still prepared-but-unapplied SQL.
- **S7-004 — This closure task.** Full validation re-run; a targeted (not exhaustive) sync of `SCHEMACRAFT_AI_MASTER_CONTEXT.md`; `TECH_DEBT.md` left unchanged (no existing tracked item was resolved by this sprint's tasks).

## 3. Files Changed

- New: `app/(dashboard)/loading.tsx` (+test), `app/error.tsx` (+test), `app/global-error.tsx` (+test), `app/not-found.tsx` (+test), `features/history/components/generation-history-item.test.tsx`.
- Modified: `features/history/components/generation-history-item.tsx`, `supabase/rls.sql`, `lib/repositories/rate-limit.repository.ts` (+test), `lib/actions/generate-schema.ts`, `SCHEMACRAFT_AI_MASTER_CONTEXT.md`.

## 4. Validation Results

| Check | Status |
|---|---|
| Build (`npm run build`) | ✅ Passing — all 12 routes, static/dynamic split unchanged |
| TypeScript (`npm run typecheck`) | ✅ Passing, zero errors |
| ESLint (`npm run lint`) | ✅ Passing, zero errors/warnings |
| Tests (`npm test`) | ✅ Passing — 360/360 across 50 files (up from 347/45 at Sprint 6 closure) |

## 5. Remaining Risks (escalated, not new to this sprint)

1. **The single most urgent item in the repository right now is not a Sprint 7 (or Sprint 8) code task:** `check_authenticated_rate_limit()` and `delete_own_account()` are still unapplied to any live database. Since the rate-limit check fails closed on any RPC error, **authenticated generation is completely broken for every user** until this migration runs against the real Supabase project. This must happen before any beta invite goes out.
2. No live browser/device verification was performed for any Sprint 7 change (no browser available in this environment) — the loading/error/not-found states and the rate-limit message are verified by test and by reading the rendered output, not by a real device/network pass.
3. CI/CD reliability (TD-024/AD-006) remains unresolved and DevOps-owned — restated, not re-litigated.

## 6. Deferred Items (Sprint 8 Parking Lot)

README refresh, the Developer Settings "Show raw project IDs" toggle, generation-comparison/diff view, SQL dialect/naming-convention support (needs a product decision), monetization/billing (needs a product decision), a public API and team/multi-user sharing (Sprint 8 outline candidates, both need decisions first), and the remaining Sprint 9-outline hardening items (native `ENUM`, composite FK Drizzle constraints, CSP, fullscreen animation, remaining keyboard shortcuts, production data cleanup).

## 7. Confirmation

Sprint 7 is complete. All four tasks passed lint/typecheck/test/build individually and were committed before the next began, per the standing Sprint Execution Rule. Sprint 8 has not begun and is not implied by anything in this document — awaiting review and approval.
