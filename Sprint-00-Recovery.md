# Sprint 0 — Project Recovery

**This is the Sprint 0 execution record.** It tracks why Sprint 0 exists, what has been done, what remains, and what closes it. For permanent, evergreen project facts (tech stack, architecture, features), see `SCHEMACRAFT_AI_MASTER_CONTEXT.md` — that information is deliberately not repeated here.

**Last updated:** 2026-07-25, after task S0-007 (Sprint 0 closure).

**Sprint 0 completion date:** 2026-07-25

---

## 1. Sprint Overview

- **Sprint name:** Sprint 0 — Project Recovery
- **Sprint objective:** Establish a trustworthy, verified engineering baseline — build, TypeScript, lint, tests, workspace state, and project knowledge — before any feature or product work resumes.
- **Sprint philosophy:** Recovery before implementation. Inspect and verify first; fix only what is confirmed broken; document what is discovered rather than assume; never let a task's scope silently expand into unrelated cleanup, refactoring, or new planning. Every task in this sprint has run under an explicit, narrow scope with its own deliverables and acceptance criteria.
- **Current status:** ✅ **Completed** (2026-07-25). All eight Sprint 0 tasks (S0-000 through S0-007) are complete. The repository builds, typechecks, lints, and tests clean as of the closing verification run in S0-007.

---

## 2. Why Sprint 0 Exists

Sprint 0 was created because the project's health was unknown before any further work could safely proceed. Five concrete gaps motivated it, all confirmed during the Recovery Audit (S0-000):

- **Repository recovery.** The working directory contained a build-blocking artifact (an untracked, pre-refactor stray file) that made the project appear broken even though the committed codebase was not.
- **Engineering baseline.** Build, TypeScript, lint, and test status had not been independently verified in this session before Sprint 0 began — they needed to be run and confirmed, not assumed from prior documentation.
- **Documentation recovery.** The two documents this sprint depends on — `SCHEMACRAFT_AI_MASTER_CONTEXT.md` and this file — existed only as empty placeholders, leaving no current, authoritative reference for the project's actual state.
- **Architectural synchronization.** The Recovery Audit found that existing architecture documentation (`ARCHITECTURE.md`, `docs/planning/v0.7.1-roadmap.md`) has drifted out of sync with what has actually shipped — most notably, a nine-part "UX 2.0" initiative referenced throughout recent commits and code comments has no corresponding planning document anywhere in the repository.
- **Verification.** Every claim about repository health needed to be independently reproduced (typecheck/lint/test/build actually run, git tracking actually checked with `git ls-files`), not taken on faith from prior audits or documentation.

---

## 3. Completed Tasks

### S0-000 — Recovery Audit
- **Objective:** Perform a full, read-only, repository-wide inspection covering build, runtime-adjacent static checks, TypeScript, lint, architecture, routing, authentication, dependencies, code quality, and documentation, and produce a prioritized recovery report.
- **Status:** ✅ Complete
- **Outcome:** Repository assessed as fundamentally healthy (strict TypeScript, zero `any`, zero `TODO`/`FIXME`, clean lint, 168 passing tests, enforced feature-module boundaries). Identified one build-blocking issue (an untracked stray file — see S0-001), a documentation-drift gap around the unplanned "UX 2.0" work, and several already-tracked `TECH_DEBT.md` items worth re-flagging. No files were modified — inspection only.

### S0-001 — Workspace Recovery
- **Objective:** Independently verify the Recovery Audit's claim that the reported build failure was caused by an untracked local file, not a repository defect, and remove it only if confirmed.
- **Status:** ✅ Complete
- **Outcome:** Verified via `git ls-files --error-unmatch` that `components/dashboard/schema-generator.tsx` was untracked, reproduced the exact `TS2307` failures it caused, confirmed zero other files imported it, then removed it. Re-ran `npm run typecheck`, `npm run lint`, `npm test`, and `npm run build` — all passed clean afterward. Git working tree confirmed clean with no unintended tracked-file changes.

### S0-002A — Master Context Recovery
- **Objective:** Populate `SCHEMACRAFT_AI_MASTER_CONTEXT.md` as the permanent, evergreen project reference (product overview, tech stack, repository structure, architecture, features, principles, status, risks), describing the repository as it exists today only.
- **Status:** ✅ Complete
- **Outcome:** `SCHEMACRAFT_AI_MASTER_CONTEXT.md` written and committed (`7c6a6d7`). Only that file was modified; verified via `git status` before and after.

### S0-002B — Sprint Recovery Documentation
- **Objective:** Populate this document as the Sprint 0 execution record.
- **Status:** ✅ Complete (this document)
- **Outcome:** See remainder of this file.

### S0-003 — UX 2.0 Engineering Specification Recovery
- **Objective:** Reconstruct a factual engineering specification for the shipped "UX 2.0" work (nine milestones with no in-repo planning document), from direct implementation inspection only.
- **Status:** ✅ Complete
- **Outcome:** `docs/specifications/UX-2.0-Engineering-Specification.md` written and committed (`354c637`) — purpose, design goals, screen inventory (7 routes), component inventory (all 7 `features/*` modules), design system, 5 user flows, and verified Known UX Limitations, sourced entirely from reading the implemented code. Closes the documentation gap the Recovery Audit (S0-000) flagged as Critical (C-3).

### S0-004A — Architecture Documentation Synchronization
- **Objective:** Synchronize `ARCHITECTURE.md` with the repository at `HEAD` — folder structure, module boundaries, routing, authentication, testing counts.
- **Status:** ✅ Complete
- **Outcome:** `ARCHITECTURE.md` updated and committed (`dac6476`): removed the reference to a nonexistent file (`dashboard/dashboard-shell.tsx`), documented the full current route tree and all 7 `features/*` modules (including `landing` and `settings`, previously undocumented), corrected the test count (165→168, verified by re-running the suite rather than assumed), and added the previously-undocumented second authentication layer (`requireUser()` in the dashboard layout).

### S0-005 — Runtime Verification
- **Objective:** Live-verify runtime behavior (browser console, server console, routing, authentication, dashboard flows, public sandbox, theme, accessibility, responsiveness) — the gap S0-000's static-analysis-only scope had left open.
- **Status:** ✅ Complete
- **Outcome:** Full live session: dev server + production server startup, a real throwaway account taken through signup → email confirmation → login → project creation → real Gemini generation → persistence → Workbench → Settings → theme toggle → command palette → logout → session termination, plus the public sandbox's own real generation. Browser and server consoles stayed clean throughout — zero blocking issues found. Three minor, non-blocking observations were recorded for triage (see S0-006).

### S0-006 — Runtime Findings Triage & Technical Debt Synchronization
- **Objective:** Classify each S0-005 runtime finding and synchronize `TECH_DEBT.md` accordingly, without recording tooling limitations as product debt.
- **Status:** ✅ Complete
- **Outcome:** `TECH_DEBT.md` updated and committed (`4f35753`): added `TD-018` (top-bar title fallback on two routes) and `TD-019` (post-signup UX doesn't explain the email-confirmation requirement) as genuine, source-verified debt; closed two findings as browser-automation tooling artifacts with no repository action; updated `TD-006` in place — `getGeneration`/`getProjectGenerations` are now confirmed live-used by the Workbench route (partially resolving the item), while `deleteGeneration` remains confirmed unused.

### S0-007 — Sprint 0 Closure
- **Objective:** Run the final engineering verification, confirm all Sprint 0 exit criteria, and update this document to close the sprint.
- **Status:** ✅ Complete (this update)
- **Outcome:** `npm run typecheck`, `npm run lint`, `npm test` (168/168), and `npm run build` all re-run clean in one session; `git status` confirmed a clean working tree at the start of closure. See §5 and §7 below for the full closing verification and exit-criteria record.

---

## 4. Remaining Sprint Tasks

None. All work identified during the Recovery Audit (S0-000) as necessary to close Sprint 0 has been completed across S0-003 through S0-007. Two items were identified but deliberately **not** actioned within Sprint 0, since every task in this sprint was explicitly scoped to documentation/verification only:

- **`docs/planning/v0.7.1-roadmap.md` was not edited.** S0-004A reconciled `ARCHITECTURE.md` with the current repository and S0-003 recovered the missing UX 2.0 specification, but literally editing the roadmap document itself was out of scope for every Sprint 0 task ("no roadmap changes" appears in each task brief from S0-003 onward). The gap this created — the roadmap still describes pre-UX-2.0 file paths and doesn't mention UX 2.0 at all — is now explicitly disclosed in `ARCHITECTURE.md`'s Frontend Modularization section and in §6/§7 below, rather than left silently unaddressed. Reconciling the roadmap document itself is Sprint 1 (or a dedicated) work, not a Sprint 0 gap.
- **Minor dependency hygiene** (unused `react-hook-form`; `shadcn` listed under runtime `dependencies` instead of `devDependencies`) was never assigned its own Sprint 0 task and was not part of the formal Sprint Exit Criteria (§7). Carried forward as low-priority, non-blocking cleanup — see §8.

---

## 5. Current Repository Health

As of the Sprint 0 closing verification (S0-007, re-run in the same session as this update — not carried forward from an earlier task):

| Check | Status |
|---|---|
| Build (`npm run build`) | ✅ Passing |
| TypeScript (`npm run typecheck`) | ✅ Passing, zero errors |
| ESLint (`npm run lint`) | ✅ Passing, zero errors/warnings |
| Tests (`npm test`) | ✅ Passing, 168/168 across 12 files |
| Repository integrity | ✅ Git working tree clean relative to `HEAD` at the start of S0-007; no unintended tracked-file changes across any Sprint 0 task |
| Documentation progress | `SCHEMACRAFT_AI_MASTER_CONTEXT.md`, this document, `docs/specifications/UX-2.0-Engineering-Specification.md` all complete and committed. `ARCHITECTURE.md` reconciled with the current repository (S0-004A). `TECH_DEBT.md` synchronized against live-verified runtime behavior (S0-006). `docs/planning/v0.7.1-roadmap.md` itself remains unedited by design — see §4 |

---

## 6. Known Risks

Originally carried forward from the Recovery Audit (S0-000); updated at Sprint 0 closure (S0-007) to reflect what subsequent tasks resolved. Not re-assessed or expanded beyond that update — these remain inputs for Sprint 1, not re-litigated here:

- **Documentation/continuity gap around "UX 2.0" — mitigated, not eliminated.** The nine shipped milestones' rationale is now recovered in `docs/specifications/UX-2.0-Engineering-Specification.md` (S0-003), reconstructed from the implementation itself. The original "Engineering Spec" the code comments reference still does not exist anywhere in the repository, and `docs/planning/v0.7.1-roadmap.md` still doesn't mention UX 2.0 at all (§4) — the risk is now documented and bounded rather than silently open, but the underlying gap in the roadmap document itself persists by design (out of Sprint 0's scope).
- ~~Two self-rated Critical tech-debt items remain unresolved (TD-003, TD-004)~~ — **Resolved by Sprint 1 (S1-001, S1-002).** This bullet described Sprint 0's closing state (2026-07-25) — carried to Sprint 1 exactly as planned, and closed there. See `TECH_DEBT.md` for the current, authoritative status of every item.
- **No Git↔Vercel auto-deploy integration** (TD-005) — production deploys remain manual (`vercel --prod`). Unchanged by Sprint 0.
- **Placeholder/test data visible in the production Supabase account** (TD-015) — not yet cleaned up; requires explicit sign-off before deletion. Unchanged by Sprint 0. (Sprint 0's own live-verification work in S0-005 added one more throwaway account/project to this same production account, clearly labeled "Sprint0 Runtime Verification Test" — flagged here for visibility, not treated as new debt, since it's the same accepted pattern TD-015 already tracks.)
- ~~Possible tech-debt ledger drift — TD-006 may be stale~~ — **Resolved by S0-006.** Re-verified against the live-tested Workbench route and corrected in `TECH_DEBT.md`; no longer an open risk.

---

## 7. Sprint Exit Criteria

Evaluated at closure (S0-007):

1. **Build, TypeScript, lint, and test checks all pass cleanly, verified in the same session as closure.** ✅ Met — all four re-run in this session (§5); not assumed from an earlier task.
2. **The working tree and git state are clean, with no untracked or orphaned implementation artifacts.** ✅ Met — `git status` confirmed a clean tree before this closing update began.
3. **`SCHEMACRAFT_AI_MASTER_CONTEXT.md` and `Sprint-00-Recovery.md` are both complete and current.** ✅ Met — both written, committed, and (this document) now current through S0-007.
4. **`ARCHITECTURE.md` and `docs/planning/v0.7.1-roadmap.md` have been reconciled with the repository's actual current state, including the "UX 2.0" work.** ⚠️ **Partially met, by design.** `ARCHITECTURE.md` is fully reconciled (S0-004A) and the UX 2.0 work now has its own recovered specification (S0-003). `docs/planning/v0.7.1-roadmap.md` itself was never edited — every Sprint 0 task from S0-003 onward explicitly excluded roadmap changes from scope. This criterion, as originally written, is not 100% satisfied; the gap is disclosed rather than hidden (§4, §6) and is recommended as Sprint 1's first documentation item, not a Sprint 0 blocker.
5. **`TECH_DEBT.md` has been re-verified against current code (at minimum, TD-006).** ✅ Met — S0-006, plus two new items (TD-018, TD-019) discovered along the way.
6. **A runtime verification pass has been performed at least once.** ✅ Met — S0-005, full live session, zero blocking issues.
7. **All Sprint 0 tasks listed in §3/§4 are complete, with no task left partially done or silently dropped.** ✅ Met — S0-000 through S0-007 all complete (§3); §4's two residual items are explicitly disclosed as deliberately out-of-scope, not silently dropped.

**Sprint 0 status: ✅ Completed 2026-07-25**, with one explicitly-disclosed partial criterion (#4, the roadmap document itself). This was a deliberate scope boundary held consistently across every task in this sprint, not an oversight — recorded here rather than either silently claiming full completion or blocking closure over work that was never in scope to do.

---

## 8. Deferred Work

Work identified during Sprint 0 but explicitly out of Sprint 0's scope, deferred to future work per `TECH_DEBT.md` and `docs/planning/v0.7.1-roadmap.md`:

- ~~**FK-column indexing** in generated SQL and Drizzle output (TD-003).~~ **Resolved, Sprint 1 (S1-001).**
- ~~**Join-table composite-uniqueness analyzer warning** (TD-004).~~ **Resolved, Sprint 1 (S1-002).**
- ~~**History/navigation UI verification** — confirming TD-006's current status is Sprint 0 work (§4); any remaining implementation is not.~~ **Fully resolved, Sprint 1 (S1-003)** — a complete history list/open/delete UI now exists, closing the "remaining implementation" this bullet deferred.
- **Native Postgres `ENUM` type support**, in place of the current `TEXT + CHECK` compilation (TD-007).
- **Composite (multi-column) FK physical constraints in Drizzle output** (TD-008).
- **Business-rule `CHECK` constraint generation** beyond enum values (TD-010).
- **Git↔Vercel deployment integration** (TD-005) — an operational change requiring explicit sign-off, independent of any code milestone.
- **Production placeholder-project data cleanup** (TD-015) — a one-way data change requiring explicit sign-off.
- Lower-priority polish items already tracked in `TECH_DEBT.md` (VARCHAR sizing, sample-data realism, CSP headers, client-side prompt-length indicator) — none are Sprint 0 scope.
- ~~**Top-bar title fallback on the Workbench/Settings routes** (TD-018, added S0-006) and **unclear post-signup email-confirmation messaging** (TD-019, added S0-006)~~ — **Both resolved, Sprint 1 (S1-004).**
- **`docs/planning/v0.7.1-roadmap.md` reconciliation** — recommended as the first Sprint 1 documentation item (§7, criterion 4).
- **Minor dependency hygiene** — remove unused `react-hook-form`; move `shadcn` to `devDependencies`.

This list reflects only backlog items already tracked in the repository's own documentation, plus the two items discovered and added to `TECH_DEBT.md` during Sprint 0 itself (TD-018, TD-019). No speculative items have been added.

---

## 9. Sprint Timeline

```
Recovery Audit (S0-000)
   ↓  full repository inspection; identified the stray-file build
      issue and the documentation gaps this sprint exists to close
Workspace Recovery (S0-001)
   ↓  verified and removed the orphaned file; confirmed build/type
      check/lint/test all pass on a clean working tree
Documentation Recovery (S0-002A, S0-002B, S0-003)
   ↓  populated SCHEMACRAFT_AI_MASTER_CONTEXT.md (permanent project
      reference), this document (Sprint 0 execution record), and
      docs/specifications/UX-2.0-Engineering-Specification.md
      (recovered UX 2.0 spec)
Architecture Synchronization (S0-004A, S0-006)
   ↓  reconciled ARCHITECTURE.md with the current repository;
      re-verified and corrected TECH_DEBT.md (TD-006, plus new
      TD-018/TD-019 found during runtime verification)
Verification (S0-005)
   ↓  full live runtime/browser verification pass — zero blocking
      issues; final re-run of build, typecheck, lint, and test in
      one session (S0-007)
Sprint Closure (S0-007)
   ✅ all exit criteria (§7) met or explicitly disclosed;
      Sprint 0 formally closed 2026-07-25
      ── current position ──
```

---

## 10. Next Milestone

*(Historical, as recommended at Sprint 0's close on 2026-07-25 — see the update below for what actually happened.)*

Per the repository's own tracked planning documents, the next candidate body of product work is **v0.7.1 Milestone 2 — Critical Bug Fixes** (`docs/planning/v0.7.1-roadmap.md`), covering the two still-open, self-rated Critical items: FK-column indexing (TD-003) and the join-table composite-uniqueness analyzer warning (TD-004). That roadmap document's status line marks Milestones 2 through 5 as "not yet started."

This should be read with the caveat recorded in §4, §6, and §7 (exit criterion 4): `docs/planning/v0.7.1-roadmap.md` itself was never edited during Sprint 0 — by design, not oversight — so it still doesn't mention the shipped "UX 2.0" work at all. It remains unconfirmed from repository documentation alone whether this roadmap is still the authoritative next-milestone plan or has been superseded by UX 2.0. Resolving that is recommended as Sprint 1's first documentation item (§4); no planning for the next milestone has been performed as part of Sprint 0.

**Update (Sprint 1 closure, S1-005, 2026-07-26):** this recommendation was followed. Sprint 1 (S1-001 through S1-004) resolved TD-003, TD-004, and TD-006 (Milestones 2b, 2c, and 3), plus TD-013/TD-018/TD-019 as a polish pass, and S1-005 reconciled `docs/planning/v0.7.1-roadmap.md` against what actually shipped — closing the roadmap-accuracy gap this section flagged. See `SCHEMACRAFT_AI_MASTER_CONTEXT.md` §10 and `TECH_DEBT.md` for current, authoritative status.
