# Tech Debt

## TD-001 — Generation version allocation race

**Where:** `lib/repositories/generation.repository.ts`, `createGeneration`.

**What it does today:** to assign `version_number`, it runs a `SELECT ... ORDER BY version_number DESC LIMIT 1` to find the latest version for a project, computes `latest + 1`, then `INSERT`s. These are two separate round trips to PostgREST, not one atomic transaction.

**Why this is a race condition:** if two generations are created for the same project concurrently (e.g. a double-submit, or two tabs), both requests can read the same "latest" version before either insert commits, and both then attempt to insert the same `version_number`.

**Why the current implementation is acceptable today:** the table has a `UNIQUE(project_id, version_number)` constraint (`drizzle/migrations/0000_optimal_doctor_strange.sql`). A genuine race does not corrupt data or silently overwrite a version — the second insert fails with Postgres error `23505` (unique_violation), which `createGeneration` catches explicitly and returns as a typed, retryable error (`"This project was updated concurrently. Please try again."`). The failure mode is a clean rejection, not silent data loss. Given generations are created one at a time by a single user through a UI action (not high-frequency concurrent writers), the realistic exposure is low.

**Why it's still debt:** a user who genuinely hits the race gets an error instead of a generation, and has to retry manually. It also doesn't scale to any future scenario with real concurrent writers against the same project (e.g. multiple collaborators, background jobs).

**Recommended fix:** replace the two-step read-then-insert with a single atomic operation on the database side — either:
- a PostgreSQL function (`SECURITY DEFINER` RPC) that does the `SELECT MAX ... FOR UPDATE` (or an `INSERT ... SELECT` with a subquery) and the `INSERT` inside one transaction, called via `supabase.rpc(...)`, or
- transactional SQL executed server-side in a single round trip.

This wasn't implemented in Phase 5 because it requires adding new database-level surface (a stored procedure) beyond what was reviewed/approved for that phase, and the current architecture (Server Action → Repository → Supabase Server Client, no runtime Drizzle per ADR-002) doesn't offer a client-side multi-statement transaction primitive. Worth revisiting before any workload with real concurrent writers per project.

---

## TD-002 — Project selector shows raw UUID, not project title — RESOLVED

**Where:** `features/ai-workspace/components/schema-generator.tsx` (moved from `components/dashboard/schema-generator.tsx`, Project `<Select>`)

**Priority:** Critical

Observed directly in production and local testing — the user sees `513f5d94-9ecf-...` instead of "Testing" etc. Confusing, looks broken.

**Root cause:** `@base-ui/react`'s `Select.Value` resolves its label by matching the current value against items registered by mounted `SelectItem`s. The initial value was set programmatically (first project, auto-selected before the popup was ever opened), so no item was registered yet and it fell back to stringifying the raw value.

**Fix (frontend modularization, Day 3):** an explicit `children` render function on `SelectValue` that looks the title up directly from the `projects` array — Base UI's own documented pattern for this case, not a workaround. See `docs/architecture/frontend-modularization.md` Day 3 entry.

## TD-003 — No FK-column indexing in generated SQL/Drizzle

**Where:** `lib/compiler/sql`, `lib/compiler/drizzle`

**Priority:** Critical

Postgres doesn't auto-index FK columns; every schema this tool generates for its users is missing a standard performance safeguard. Tracked as v0.7.1 Milestone 2b.

## TD-004 — Join tables can get a surrogate PK with no uniqueness constraint on the FK pair

**Where:** AI output + `lib/ast/analyzer.ts` (no check for this shape today)

**Priority:** Critical

Directly observed: one "Blog" generation produced `post_tags` with a UUID PK and zero constraint on `(post_id, tag_id)` — duplicate pairs are not prevented at the DB level in schemas this tool generates. Tracked as v0.7.1 Milestone 2c (new analyzer warning, not an error — preserves "AST stays valid, compiler still runs").

## TD-005 — No Git↔Vercel integration

**Where:** Vercel project configuration

**Priority:** High

Confirmed twice: every `VERCEL_GIT_*` var is empty. Pushes to `main` never deploy; deploys are manual `vercel --prod` only. Tracked as v0.7.1 Milestone 4 — requires explicit user sign-off before enabling, since it's a standing behavior change (every future `main` push would start auto-deploying).

## TD-006 — `getGeneration`/`getProjectGenerations`/`deleteGeneration` implemented but never called

**Where:** `lib/repositories/generation.repository.ts`

**Priority:** High

Backend-complete, no UI — a history/navigation feature was scaffolded but never finished. Tracked as v0.7.1 Milestone 3.

## TD-007 — Enums compile to `TEXT + CHECK`, not native Postgres `ENUM`

**Where:** `lib/compiler/sql/type-map.ts`, `lib/compiler/drizzle/type-map.ts`

**Priority:** Medium

Deliberate v1 scope cut, documented at the time. Means no DB-level enum type reuse or `ALTER TYPE` support in generated schemas.

## TD-008 — Composite (multi-column) FKs get no physical constraint in Drizzle

**Where:** `lib/compiler/drizzle/render-relations.ts`

**Priority:** Medium

Documented scope cut — a physical constraint needs topological table ordering to do safely. Currently silent: the generated Drizzle model gets a `relations()` entry only, with no warning surfaced to the user that this happened.

## TD-009 — Blanket `VARCHAR(255)` for every "string" column

**Where:** `lib/compiler/sql/type-map.ts`

**Priority:** Low

`email`, `slug`, `password_hash` all get the same arbitrary width in generated schemas regardless of real-world sizing.

## TD-010 — No business-rule `CHECK` constraints beyond enum values

**Where:** `lib/ai/providers/gemini-prompts.ts` + `lib/ast/analyzer.ts`

**Priority:** Medium

Nothing like `price >= 0` gets generated even when obviously implied by the prompt.

## TD-011 — `CLAUDE.md` folder-structure accuracy

**Where:** `CLAUDE.md`

**Priority:** Low — housekeeping only

Previously documented a `src/app/`, `src/components/`, `src/lib/` layout that didn't match the actual root-level `app/`, `components/`, `lib/` layout, and listed "Anthropic SDK" instead of Google Gemini under tech stack. Corrected as part of the v0.7.1 Milestone 1 repository polish pass.

## TD-012 — No CSP configured

**Where:** `next.config.ts` (default scaffold)

**Priority:** Low

Not actively insecure, but a missed hardening layer given the app renders AI-generated content.

## TD-013 — No client-side character-count/limit indicator on the prompt textarea

**Where:** `components/dashboard/prompt-editor.tsx`

**Priority:** Low

The server enforces a 4000-character cap with a clear rejection message, but there's no client-side feedback until submission is attempted.

## TD-014 — `aiConfig.model` is a Google-maintained alias, not a pinned version

**Where:** `lib/config.ts`

**Priority:** Medium (accepted risk)

`gemini-flash-latest` is deliberate — it's the fix for the exact failure mode that blocked the v0.7.0 release (a specific pinned model going overloaded/unavailable). Trade-off: behavior can shift without our control if Google repoints the alias. No mitigation currently planned; accepted explicitly during the v0.7.1 roadmap review.

## TD-015 — Placeholder/test project data visible in the real production account

**Where:** Supabase `projects` table (production)

**Priority:** Medium

"Testing", "dsasasas", "sample test" — QA artifacts from the v0.7.0/v0.7.1 release cycles, not yet cleaned up. Tracked as part of v0.7.1 Milestone 4 acceptance criteria (requires explicit confirmation before deleting production data).

## TD-016 — Project cards on the dashboard are non-interactive

**Where:** `components/dashboard/projects-panel.tsx` (dashboard project cards)

**Priority:** High

Found during the v0.7.1 production end-to-end validation pass: project cards ("Testing", "dsasasas", etc.) render as plain, non-interactive elements — no role, no `tabindex`, no click handler, no `cursor: pointer`. Clicking one does not navigate anywhere, and they are unreachable via keyboard. Users currently have no way to open or manage an existing project from the dashboard. Not yet assigned to a milestone.

## TD-017 — Vercel "Sensitive" environment variables are opaque to CLI inspection

**Where:** Vercel project environment configuration

**Priority:** Low — process note, not a code fix

Not a bug, but there's no documented internal process for verifying/rotating secrets other than functional testing after the fact — this is what made the v0.7.0 production debugging cycle take five rounds. Worth a short internal runbook note, no code change required.
