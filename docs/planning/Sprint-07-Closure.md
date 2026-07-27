# Sprint 7 — Private Beta Readiness — Closure

**This is the Sprint 7 execution record.** For permanent, evergreen project facts (tech stack, architecture, features), see `SCHEMACRAFT_AI_MASTER_CONTEXT.md` — not repeated here. Per the approved Sprint 7 scope, this closure is deliberately shorter than Sprint 5/6's own closure documents: README.md and a full documentation rewrite were explicitly out of bounds this sprint (Sprint 8 parking lot).

**Last updated:** 2026-07-27, after task S7-004 (Sprint 7 closure), following a post-closure correctness fix to S7-002 (see §2).
**Sprint 7 completion date:** 2026-07-27

---

## 1. Sprint Summary

- **Sprint name:** Sprint 7 — Private Beta Readiness
- **Sprint objective:** Re-evaluate the Sprint 6 roadmap's own general-purpose "Iterative Refinement" outline against a concrete scenario — a private beta in 2–3 weeks with 100 real users — and implement only what clears the bar "will a beta user immediately notice and benefit." README refresh, the Developer Settings toggle, a generation-diff view, and documentation cleanup were all explicitly deferred (none block or are noticed by a beta user).
- **Status:** ✅ **Completed.** All 4 tasks (S7-001 through S7-004) complete, plus one post-closure regression fix to S7-002 found by re-checking it against a more detailed acceptance-criteria pass. Repository builds, typechecks, lints, and tests clean as of the final verification run in this document.

## 2. Implemented Tasks

- **S7-001 — Route-Level Loading, Error, and Not-Found States** (commit `54c8cbe`). `app/(dashboard)/loading.tsx`, `app/error.tsx`, `app/global-error.tsx`, `app/not-found.tsx` — all purely additive Next.js App Router convention files. Closes the gap found during Sprint 7 planning: no route ever gave navigation feedback, and any unexpected error fell through to Next's default crash screen instead of this product's own `ErrorState`.
- **S7-002 — Edit & Regenerate** (commit `28e935c`, corrected by `12169ae`). `GenerationHistoryItem` gained an action that carries a past generation's prompt into the Generator via the shared `generation-store`, reusing the exact pattern `OnboardingCard` (S6-007) established. **Post-closure fix (`12169ae`):** the initial implementation only carried the prompt forward, not the project — `project-store`'s selection persists across the whole client session and was never synced to the generation's own project, so a user editing a generation from a project other than whatever was last selected could land on the Generator with the wrong project active and silently save the new version under it. `handleEditAndRegenerate` now also calls `selectProject(projectId)`, satisfying the task's own "existing project remains selected" acceptance criterion.
- **S7-003 — Rate-Limit Rejection Clarity** (commit `25b7d4e`). `check_authenticated_rate_limit()` now returns `jsonb` with a `retry_after_seconds` estimate; `formatRateLimitRetryMessage()` turns it into a clear rejection message. Still prepared-but-unapplied SQL.
- **S7-004 — This closure task** (commit `f3a2e04`, refreshed by this update). Full validation re-run; a targeted (not exhaustive) sync of `SCHEMACRAFT_AI_MASTER_CONTEXT.md`; `TECH_DEBT.md` left unchanged (no existing tracked item was resolved by this sprint's tasks).

## 3. Files Changed

- **New:** `app/(dashboard)/loading.tsx` (+test), `app/error.tsx` (+test), `app/global-error.tsx` (+test), `app/not-found.tsx` (+test), `features/history/components/generation-history-item.test.tsx`, `docs/planning/Sprint-07-Closure.md`.
- **Modified:** `features/history/components/generation-history-item.tsx`, `supabase/rls.sql`, `lib/repositories/rate-limit.repository.ts` (+test), `lib/actions/generate-schema.ts`, `SCHEMACRAFT_AI_MASTER_CONTEXT.md`.

## 4. Architecture Decisions

None. This sprint deliberately touched no AST, compiler, or provider architecture — every task extended an existing pattern rather than introducing one:
- S7-001 uses only Next.js's own built-in App Router file conventions (no new abstraction).
- S7-002 reuses `generation-store` and `project-store` exactly as they already existed — no new store, no new navigation mechanism, no second generation workflow.
- S7-003 extends the existing `check_authenticated_rate_limit()` SQL function's return shape (boolean → jsonb) rather than introducing a new function or table.

## 5. Tests Added

| File | Tests |
|---|---|
| `app/(dashboard)/loading.test.tsx` | 1 |
| `app/error.test.tsx` | 3 |
| `app/global-error.test.tsx` | 2 |
| `app/not-found.test.tsx` | 1 |
| `features/history/components/generation-history-item.test.tsx` | 3 (expanded from 1 during the S7-002 post-closure fix — added a project-selection regression test and an existing-actions-unaffected check) |
| `lib/repositories/rate-limit.repository.test.ts` | 9 total in the file after S7-003 (up from 4) |

Net: **+15 tests** this sprint (347 → 362).

## 6. Validation Results

Final re-run, after the S7-002 post-closure fix:

| Check | Status |
|---|---|
| Build (`npm run build`) | ✅ Passing — all 12 routes, static/dynamic split unchanged |
| TypeScript (`npm run typecheck`) | ✅ Passing, zero errors |
| ESLint (`npm run lint`) | ✅ Passing, zero errors/warnings |
| Tests (`npm test`) | ✅ Passing — **362/362** across **50 files** (up from 347/45 at Sprint 6 closure) |
| Working tree | Clean |
| Stray TODO/FIXME/HACK comments | None found (repository-wide search) |
| Stray `console.log` debug statements | None found (`console.error` in `app/error.tsx`/`global-error.tsx` is intentional error-logging, not debug code) |
| Dead imports / unused variables | None — ESLint's `no-unused-vars` is part of the clean lint run above |

## 7. Known Risks

1. **The single most urgent item in the repository right now is not a Sprint 7 (or Sprint 8) code task:** `check_authenticated_rate_limit()` and `delete_own_account()` are still unapplied to any live database. Since the rate-limit check fails closed on any RPC error, **authenticated generation is completely broken for every user** until this migration runs against the real Supabase project. This must happen before any beta invite goes out.
2. No live browser/device verification was performed for any Sprint 7 change (no browser available in this environment) — the loading/error/not-found states and the rate-limit message are verified by test and by reading the rendered output, not by a real device/network pass.
3. CI/CD reliability (TD-024/AD-006) remains unresolved and DevOps-owned — restated, not re-litigated.

## 8. Deferred Backlog (Sprint 8 Parking Lot)

README refresh, the Developer Settings "Show raw project IDs" toggle, generation-comparison/diff view, SQL dialect/naming-convention support (needs a product decision), monetization/billing (needs a product decision), a public API and team/multi-user sharing (Sprint 8 outline candidates, both need decisions first), and the remaining Sprint 9-outline hardening items (native `ENUM`, composite FK Drizzle constraints, CSP, fullscreen animation, remaining keyboard shortcuts, production data cleanup).

## 9. Repository Health

- ✅ Clean working tree at closure.
- ✅ No unfinished TODOs anywhere in the codebase.
- ✅ No accidental debug code (`console.log`, commented-out blocks, etc.).
- ✅ No dead imports (ESLint's unused-import/unused-variable rules pass clean).
- ✅ No TypeScript errors or suppressions introduced this sprint.
- `TECH_DEBT.md` is unchanged from Sprint 6 closure — this sprint's tasks didn't resolve any tracked item, and didn't introduce any new one either (the S7-002 fix corrected a same-sprint regression before it ever reached a closed state, so it was never tracked as debt).

## 10. Sprint Statistics

- **Tasks completed:** 4 planned (S7-001–S7-004) + 1 post-closure fix (to S7-002).
- **Commits:** 5 (`54c8cbe`, `28e935c`, `25b7d4e`, `f3a2e04`, `12169ae`).
- **Tests added:** +15 (347 → 362); test files +5 (45 → 50).
- **Files touched:** 6 new source files, 4 new test files (for S7-001) + 1 new test file (S7-002) + 1 closure doc; 5 existing files modified across S7-002/S7-003/S7-004.
- **Net application-code risk surface:** zero AST/compiler/provider changes; the largest single change was S7-003's SQL function return-shape revision (still unapplied to any live database).

## 11. Lessons Learned

- **Re-verifying a "complete" task against a fresh, more detailed acceptance-criteria pass caught a real bug** (S7-002's missing project-selection sync) that a first implementation pass, general test coverage, and a full green validation gate had all missed — none of those check a cross-store interaction that was never exercised by the original test's scenario (only one project was ever in play). Worth remembering: passing tests confirm what the tests actually assert, not the full acceptance-criteria surface a later, more specific spec can reveal.
- **Escalating a launch-blocking finding *outside* the sprint's own task list** (the unapplied SQL functions, §7 item 1) turned out to be more valuable than anything actually built this sprint — a reminder that a planning/closure document's job includes surfacing what *isn't* a code task at all, not just accounting for what is.
- **Scoping a sprint explicitly against a concrete deployment scenario** (100 real users, 2–3 weeks out) produced a meaningfully different and better-prioritized task list than the same repository audited for general "product maturity" did the first time — the beta framing correctly demoted README/dev-settings work that had looked reasonable under a looser standard.

## 12. Definition of Done — Verification

- [x] S7-001 implemented, tested, committed.
- [x] S7-002 implemented, tested, committed — including the post-closure correctness fix.
- [x] S7-003 implemented, tested, committed.
- [x] S7-004 (this task): full validation passes on the merged state; documentation synced only where Sprint 7 changed reality (`SCHEMACRAFT_AI_MASTER_CONTEXT.md`); `TECH_DEBT.md` correctly left untouched; this closure document created.
- [x] No README rewrite, no Developer Settings work, no generation-diff view, no unrelated refactoring — all correctly out of scope and deferred to §8.
- [x] Every task passed lint/typecheck/test/build individually and was committed before the next began, per the standing Sprint Execution Rule.

**Sprint 7 is complete.** Sprint 8 has not begun and is not implied by anything in this document — awaiting review and approval.
