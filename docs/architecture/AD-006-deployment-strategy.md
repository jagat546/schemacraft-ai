# AD-006 — Deployment Strategy (Vercel as Production Platform)

**Status:** Decided (product decision made by the user, 2026-07-27). This document records the decision and the audit that motivated it. No infrastructure files were changed to produce it — see "Ownership Boundary" below.

**Author role:** Application Developer (this sprint's execution role does not own DevOps/infrastructure; see Ownership Boundary).

## Decision

Production platform is **Vercel**. The existing EC2/PM2 GitHub Actions deployment pipeline (`project_cd.yml`) is legacy and should not be extended or relied upon going forward.

This decision was made by the user as part of Sprint 6 planning (S6-002) and is recorded here for traceability. No further product decision is requested by this document.

## Ownership Boundary

Per updated Sprint 6 execution rules, the Application Developer role does not modify `.github/workflows/*`, `next.config.ts`'s deployment-relevant settings, or other infrastructure/CI-CD/production-deployment configuration. This document is an **audit and recommendation only** — every finding below is a discovery from reading the repository, not a change made to it.

## Audit Findings

### 1. CI does not currently run automatically

`.github/workflows/project_ci.yml` is triggered only by `workflow_dispatch` (manual, with a `branch` input defaulting to `main`). There is no `push` or `pull_request` trigger. This means merges to `main` and open pull requests do not automatically get linted, type-checked, tested, or built by CI — someone has to remember to manually run the workflow from the Actions tab.

The repository's original CI file (before an EC2-deployment-oriented restructuring, preserved in history at commit `170aaddb` — see `git show 170aaddb^:.github/workflows/ci.yml`) *did* trigger automatically on `push`/`pull_request` to `main`. That automatic-trigger behavior was lost when `ci.yml` was replaced by `project_ci.yml`/`project_cd.yml`.

### 2. The EC2/PM2 CD pipeline is broken and targets the wrong branch

`.github/workflows/project_cd.yml` is `workflow_dispatch`-only and, when run, looks up a CI run via:

```
gh run list --repo ... --workflow "Project CI" --branch develop/chirag --limit 100 --json databaseId
```

`develop/chirag` is not `main` and does not appear to be an active branch in this repository. As written, this workflow cannot find a matching CI artifact for any current build and would fail (or silently deploy a stale/wrong artifact) if invoked. It then deploys to an EC2 instance via `appleboy/scp-action`/`appleboy/ssh-action`, restarting the app under PM2 (`pm2 start npm --name schemacraft-ai -- start`).

This entire path is inconsistent with the approved Vercel decision and is confirmed non-functional even on its own terms (wrong branch reference).

### 3. `next.config.ts` carries an EC2/self-hosted-Node artifact

```ts
const nextConfig: NextConfig = {
  output: "standalone",
};
```

`output: "standalone"` produces a minimal, self-contained Node server bundle intended for Docker/EC2/self-hosted deployment. Vercel's own build pipeline does not need this setting — it builds and serves Next.js apps directly. It is not harmful to leave in place (Vercel tolerates `output: "standalone"`), but it is a vestige of the EC2/PM2 experiment and is candidate for removal once EC2 is formally retired.

### 4. Master context's deployment description is partially stale

`SCHEMACRAFT_AI_MASTER_CONTEXT.md` (CI/CD and Hosting rows, plus the TD-005 note) already documents that Git↔Vercel auto-deploy is not configured (TD-005) and that the CI file was restructured ahead of Sprint 5. It does **not** yet document findings #1 and #2 above (that CI lost its automatic trigger, and that the CD pipeline is broken/references a stale branch). See TD-024 in `TECH_DEBT.md` for the newly-recorded gap.

## Recommended DevOps Action

These require access this environment does not have (repository Actions settings, Vercel project configuration, EC2 host access) and should be picked up by whoever owns infrastructure:

1. **Restore automatic CI.** Add `push`/`pull_request` triggers (targeting `main`) back to `project_ci.yml`, keeping `workflow_dispatch` as an optional manual trigger. This restores the pre-EC2-experiment behavior.
2. **Retire `project_cd.yml`.** Either delete it (git history preserves it if ever needed for reference) or clearly mark it disabled/archived, since it is non-functional and targets a platform no longer in use.
3. **Confirm or configure Vercel's Git integration** so pushes to `main` deploy automatically (this is the still-open TD-005; this document does not change that item's status, only reaffirms it's the correct direction now that Vercel is the confirmed platform).
4. **Revert `next.config.ts`'s `output: "standalone"`** once EC2 is fully decommissioned, since it no longer serves a purpose.
5. **Update `SCHEMACRAFT_AI_MASTER_CONTEXT.md`'s CI/CD and Hosting rows** once the above are actually implemented, so the doc reflects real state rather than the current partially-stale description.

## Files That Would Change (if a DevOps owner implements the above)

- `.github/workflows/project_ci.yml` — restore `push`/`pull_request` triggers.
- `.github/workflows/project_cd.yml` — remove or archive.
- `next.config.ts` — remove `output: "standalone"`.
- `SCHEMACRAFT_AI_MASTER_CONTEXT.md` — CI/CD and Hosting rows, TD-005 note.

None of these were changed by this document.

## Risks of Not Acting

- Every merge to `main` ships without CI verification unless someone remembers to trigger it manually — a regression can land undetected.
- The dangling EC2/PM2 workflow remains clickable in the Actions tab and, if ever run, fails or misbehaves (wrong branch), which is confusing for anyone who doesn't know its history.

## Outcome

Decision recorded; no code or infrastructure changed. Audit findings folded into `TECH_DEBT.md` (TD-024) for tracking. Sprint 6 proceeds with application-layer tasks (S6-001 onward) per the user's implementation order.
