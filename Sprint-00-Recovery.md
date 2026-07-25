# Sprint 0 — Project Recovery

**This is the Sprint 0 execution record.** It tracks why Sprint 0 exists, what has been done, what remains, and what closes it. For permanent, evergreen project facts (tech stack, architecture, features), see `SCHEMACRAFT_AI_MASTER_CONTEXT.md` — that information is deliberately not repeated here.

**Last updated:** 2026-07-25, after task S0-002B.

---

## 1. Sprint Overview

- **Sprint name:** Sprint 0 — Project Recovery
- **Sprint objective:** Establish a trustworthy, verified engineering baseline — build, TypeScript, lint, tests, workspace state, and project knowledge — before any feature or product work resumes.
- **Sprint philosophy:** Recovery before implementation. Inspect and verify first; fix only what is confirmed broken; document what is discovered rather than assume; never let a task's scope silently expand into unrelated cleanup, refactoring, or new planning. Every task in this sprint has run under an explicit, narrow scope with its own deliverables and acceptance criteria.
- **Current status:** In progress. Three tasks complete (S0-000, S0-001, S0-002A); this document is produced by the fourth (S0-002B). The repository currently builds, typechecks, lints, and tests clean.

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

---

## 4. Remaining Sprint Tasks

The following work was identified during the Recovery Audit (S0-000) as necessary to close Sprint 0, but has **not yet been scheduled as a numbered task or started**. Listed here for tracking; none of it has been performed.

- **Architecture/documentation synchronization.** Reconcile `ARCHITECTURE.md`'s folder-structure section and `docs/planning/v0.7.1-roadmap.md` against the repository's current state, and reconstruct a planning record for the shipped "UX 2.0" work (M1–M9) that currently exists only in commit messages and code comments referencing an "Engineering Spec" not present in the repository.
- **Tech-debt ledger re-verification.** `TECH_DEBT.md` item TD-006 ("history/navigation repository functions implemented but never called") may already be partially resolved by the shipped Developer Workbench route — this needs re-checking against the current codebase and the ledger corrected if stale.
- **Runtime verification pass.** The Recovery Audit's scope called for browser console, server console, React warnings, and hydration checks; these were not performed (audit was static-analysis only) and remain outstanding before Sprint 0 can claim full verification coverage.
- **Minor dependency hygiene.** An unused dependency (`react-hook-form`) and one misplaced dependency (`shadcn`, a CLI tool currently listed under runtime `dependencies` instead of `devDependencies`) were identified in `package.json`; not yet actioned.

---

## 5. Current Repository Health

As of the most recent verification (S0-001, re-confirmed for S0-002A):

| Check | Status |
|---|---|
| Build (`npm run build`) | ✅ Passing |
| TypeScript (`npm run typecheck`) | ✅ Passing, zero errors |
| ESLint (`npm run lint`) | ✅ Passing, zero errors/warnings |
| Tests (`npm test`) | ✅ Passing, 168/168 across 12 files |
| Repository integrity | ✅ Git working tree clean relative to `HEAD`; no unintended tracked-file changes across S0-001 or S0-002A |
| Documentation progress | `SCHEMACRAFT_AI_MASTER_CONTEXT.md` complete and committed; this document completes the second of two previously-empty placeholders. `ARCHITECTURE.md`/`docs/planning/v0.7.1-roadmap.md` reconciliation remains outstanding (§4) |

---

## 6. Known Risks

Carried forward from the Recovery Audit (S0-000); not re-assessed, expanded, or speculated on here:

- **Documentation/continuity gap around "UX 2.0."** Nine shipped milestones reference an "Engineering Spec" that does not exist anywhere in this repository — the rationale behind a substantial slice of the current product exists only in commit messages and code comments.
- **Two self-rated Critical tech-debt items remain unresolved.** `TECH_DEBT.md` TD-003 (no FK-column indexing in generated SQL/Drizzle output) and TD-004 (join tables can get a surrogate PK with no uniqueness constraint) — both affect every schema this tool generates for end users today.
- **No Git↔Vercel auto-deploy integration** (TD-005) — production deploys remain manual (`vercel --prod`).
- **Placeholder/test data visible in the production Supabase account** (TD-015) — not yet cleaned up; requires explicit sign-off before deletion.
- **Possible tech-debt ledger drift** — TD-006 may be stale (§4).

---

## 7. Sprint Exit Criteria

Sprint 0 may be formally closed when all of the following hold:

1. Build, TypeScript, lint, and test checks all pass cleanly, verified in the same session as closure (not assumed from an earlier task).
2. The working tree and git state are clean, with no untracked or orphaned implementation artifacts.
3. `SCHEMACRAFT_AI_MASTER_CONTEXT.md` and `Sprint-00-Recovery.md` are both complete and current.
4. `ARCHITECTURE.md` and `docs/planning/v0.7.1-roadmap.md` have been reconciled with the repository's actual current state, including the "UX 2.0" work identified in §4.
5. `TECH_DEBT.md` has been re-verified against current code (at minimum, TD-006) so the ledger can be trusted as a Sprint 1 planning input.
6. A runtime verification pass (browser console, server console, React warnings, hydration) has been performed at least once, closing the gap the Recovery Audit's static-analysis scope left open.
7. All Sprint 0 tasks listed in §3/§4 are complete, with no task left partially done or silently dropped.

Sprint 0 is not closed by this document — it remains open pending §4 and the criteria above.

---

## 8. Deferred Work

Work identified during Sprint 0 but explicitly out of Sprint 0's scope, deferred to future work per `TECH_DEBT.md` and `docs/planning/v0.7.1-roadmap.md`:

- **FK-column indexing** in generated SQL and Drizzle output (TD-003).
- **Join-table composite-uniqueness analyzer warning** (TD-004).
- **History/navigation UI verification** — confirming TD-006's current status is Sprint 0 work (§4); any remaining implementation is not.
- **Native Postgres `ENUM` type support**, in place of the current `TEXT + CHECK` compilation (TD-007).
- **Composite (multi-column) FK physical constraints in Drizzle output** (TD-008).
- **Business-rule `CHECK` constraint generation** beyond enum values (TD-010).
- **Git↔Vercel deployment integration** (TD-005) — an operational change requiring explicit sign-off, independent of any code milestone.
- **Production placeholder-project data cleanup** (TD-015) — a one-way data change requiring explicit sign-off.
- Lower-priority polish items already tracked in `TECH_DEBT.md` (VARCHAR sizing, sample-data realism, CSP headers, client-side prompt-length indicator) — none are Sprint 0 scope.

This list reflects only backlog items already tracked in the repository's own documentation. No new items have been added.

---

## 9. Sprint Timeline

```
Recovery Audit (S0-000)
   ↓  full repository inspection; identified the stray-file build
      issue and the documentation gaps this sprint exists to close
Workspace Recovery (S0-001)
   ↓  verified and removed the orphaned file; confirmed build/type
      check/lint/test all pass on a clean working tree
Documentation Recovery (S0-002A, S0-002B)
   ↓  populated SCHEMACRAFT_AI_MASTER_CONTEXT.md (permanent project
      reference) and this document (Sprint 0 execution record)
      ── current position ──
Architecture Synchronization (not yet started)
   ↓  reconcile ARCHITECTURE.md / v0.7.1-roadmap.md with shipped
      "UX 2.0" work; re-verify TECH_DEBT.md TD-006
Verification (not yet started)
   ↓  runtime/browser verification pass; final re-run of build,
      typecheck, lint, and test in one session
Sprint Closure (not yet started)
      confirm all exit criteria (§7) met; Sprint 0 formally closed
```

---

## 10. Next Milestone

Per the repository's own tracked planning documents, the next candidate body of product work is **v0.7.1 Milestone 2 — Critical Bug Fixes** (`docs/planning/v0.7.1-roadmap.md`), covering the two still-open, self-rated Critical items: FK-column indexing (TD-003) and the join-table composite-uniqueness analyzer warning (TD-004). That roadmap document's status line marks Milestones 2 through 5 as "not yet started."

This should be read with the caveat already recorded in §4 and §6: because the shipped "UX 2.0" work (nine milestones) has no corresponding entry anywhere in `docs/planning/`, it is not yet possible to confirm from repository documentation alone whether the v0.7.1 roadmap is still the authoritative next-milestone plan or has been superseded. Resolving that is itself part of Sprint 0's Architecture Synchronization work (§4, §7) — no planning for the next milestone has been performed as part of this task.
