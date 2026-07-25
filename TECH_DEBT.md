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

## TD-003 — No FK-column indexing in generated SQL/Drizzle — RESOLVED

**Where:** `lib/compiler/sql`, `lib/compiler/drizzle`, `lib/compiler/shared/foreign-key-indexes.ts`

**Priority:** Critical

Postgres doesn't auto-index FK columns; every schema this tool generates for its users was missing a standard performance safeguard. Tracked as v0.7.1 Milestone 2b.

**Fix (Sprint 1, S1-001):** every relationship's source columns now get a supporting index in both SQL (`CREATE INDEX`) and Drizzle (`index()` builder) output, via a new shared `resolveForeignKeyIndexes` helper. Dedup is column-set based — a column set already covered by the primary key, a column-level `unique` flag, an explicit AST index, or a table-level unique constraint never gets a redundant second index. 14 new tests (single FK, multiple FK, composite FK, and 6 dedup/regression cases across both compilers).

## TD-004 — Join tables can get a surrogate PK with no uniqueness constraint on the FK pair — RESOLVED

**Where:** `lib/ast/analyzer.ts`

**Priority:** Critical

Directly observed: one "Blog" generation produced `post_tags` with a UUID PK and zero constraint on `(post_id, tag_id)` — duplicate pairs were not prevented at the DB level in schemas this tool generates. Tracked as v0.7.1 Milestone 2c (new analyzer warning, not an error — preserves "AST stays valid, compiler still runs").

**Fix (Sprint 1, S1-002):** new `AnalysisWarningCode.JoinTableMissingUniqueConstraint`. Detection is deliberately conservative to avoid false positives on ordinary multi-FK tables (e.g. `posts` with `author_id`/`editor_id`): a table only qualifies when it has exactly two single-column outgoing relationships and no columns beyond the FK pair, its own primary key, and incidental metadata (`created_at`/`updated_at`). Self-referencing join tables (e.g. `friendships`) are caught the same way, since detection never inspects the target table. 11 new tests, including the `post_tags` fixture directly observed in production, previously pinned in `lib/ast/analyzer.test.ts` as a deliberate "known gap" baseline specifically so it would need this update.

## TD-005 — No Git↔Vercel integration

**Where:** Vercel project configuration

**Priority:** High

Confirmed twice: every `VERCEL_GIT_*` var is empty. Pushes to `main` never deploy; deploys are manual `vercel --prod` only. Tracked as v0.7.1 Milestone 4 — requires explicit user sign-off before enabling, since it's a standing behavior change (every future `main` push would start auto-deploying).

## TD-006 — `getGeneration`/`getProjectGenerations`/`deleteGeneration` implemented but never called — RESOLVED

**Where:** `lib/repositories/generation.repository.ts`, consumed via `lib/actions/generation.actions.ts`, `components/dashboard/{workbench-view,generation-history-view}.tsx`, and `features/history/`

**Priority:** was Critical/High, now closed

**Verified via Sprint 0 runtime verification (S0-005):** `getGenerationAction`/`getProjectGenerationsAction` were already called live by the Developer Workbench route, confirmed by running a real generation and watching it persist and correctly re-render there.

**Fix (Sprint 1, S1-003):** the remaining gap — no `deleteGeneration` caller and no history-*list* screen — is closed. A new `features/history` module (`/dashboard/projects/[id]/history`, reachable from a new icon on `ProjectCard`) lists every generation for a project (newest first), opens any of them into the existing Workbench via `?generation=<id>`, and deletes one via a new `deleteGenerationAction` (the first Server Action wrapping `deleteGeneration`, confirmed via repository-wide search before implementation to not duplicate any existing entry point) behind a confirmation dialog. One residual verification gap, disclosed rather than silently claimed: the original roadmap's Milestone 3 acceptance criteria called for an explicit two-account cross-user isolation test; this was not performed live — the ownership check mirrors `getGenerationAction`'s already-verified pattern, but the two-account scenario itself remains unexercised.

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

## TD-013 — No client-side character-count/limit indicator on the prompt textarea — RESOLVED

**Where:** `features/ai-workspace/components/prompt-editor.tsx`, `features/landing/components/hero-sandbox.tsx`

**Priority:** Low

The server enforces a 4000-character cap (500 for the public sandbox) with a clear rejection message, but there was no client-side feedback until submission was attempted.

**Fix (Sprint 1, S1-004):** both prompt textareas now show a live `{count} / {max}` counter; the authenticated Generator's textarea also gained a `maxLength={4000}` so it can never exceed the server's own cap in the first place (the sandbox's textarea already had `maxLength={500}`).

## TD-014 — `aiConfig.model` is a Google-maintained alias, not a pinned version

**Where:** `lib/config.ts`

**Priority:** Medium (accepted risk)

`gemini-flash-latest` is deliberate — it's the fix for the exact failure mode that blocked the v0.7.0 release (a specific pinned model going overloaded/unavailable). Trade-off: behavior can shift without our control if Google repoints the alias. No mitigation currently planned; accepted explicitly during the v0.7.1 roadmap review.

## TD-015 — Placeholder/test project data visible in the real production account

**Where:** Supabase `projects` table (production)

**Priority:** Medium

"Testing", "dsasasas", "sample test" — QA artifacts from the v0.7.0/v0.7.1 release cycles, not yet cleaned up. Tracked as part of v0.7.1 Milestone 4 acceptance criteria (requires explicit confirmation before deleting production data).

## TD-016 — Project cards on the dashboard are non-interactive — RESOLVED

**Where:** `features/projects/components/project-card.tsx` (moved from `components/dashboard/projects-panel.tsx`)

**Priority:** High

Found during the v0.7.1 production end-to-end validation pass: project cards ("Testing", "dsasasas", etc.) render as plain, non-interactive elements — no role, no `tabindex`, no click handler, no `cursor: pointer`. Clicking one does not navigate anywhere, and they are unreachable via keyboard.

**Root cause:** the click/select behavior was simply never wired up. `project-store` (added in the frontend modularization's Day 1) already existed as the shared source of truth for "which project is active," and the AI Workspace's project selector already read from it — the dashboard cards just never wrote to it.

**Fix (frontend modularization, Day 6):** `ProjectCard` is now a real interactive element — `role="button"`, `tabIndex={0}`, `onClick`/`onKeyDown` (Enter/Space), `aria-pressed`, and a visible selected-state ring — that calls `project-store`'s `selectProject(id)`. Selecting a card immediately updates the AI Workspace's own project dropdown, since both read the same store. This does not add a project detail page or navigation route (none exists yet, and building one is outside this milestone's scope) — it makes the existing "which project is my next generation for" mechanism reachable from the dashboard's card grid, not just the dropdown. See `docs/architecture/frontend-modularization.md` Day 6 entry.

## TD-017 — Vercel "Sensitive" environment variables are opaque to CLI inspection

**Where:** Vercel project environment configuration

**Priority:** Low — process note, not a code fix

Not a bug, but there's no documented internal process for verifying/rotating secrets other than functional testing after the fact — this is what made the v0.7.0 production debugging cycle take five rounds. Worth a short internal runbook note, no code change required.

## TD-018 — Top-bar page title falls back to "SchemaCraft AI" on the Workbench and Project Settings routes — RESOLVED

**Where:** `features/shell/components/page-title.tsx`

**Priority:** Low

**Verified via Sprint 0 runtime verification (S0-005):** `NAV_ITEMS` only lists `/dashboard` and `/dashboard/generator`; `PageTitle` looks up the current route in that list and falls back to the app name when no entry matches. Confirmed live on `/dashboard/projects/[id]/workbench` and `/dashboard/projects/[id]/settings` — both showed "SchemaCraft AI" in the top bar instead of "Workbench" / "Project Settings".

**Fix (Sprint 1, S1-004):** `PageTitle` now resolves per-project routes by path suffix (`/workbench` → "Workbench", `/settings` → "Project Settings", `/history` → "History") in addition to the exact `NAV_ITEMS` match, since the dynamic `[id]` segment rules out an exact match for these routes. Deliberately kept separate from `NAV_ITEMS` itself, which remains scoped to sidebar destinations only, so `AppSidebar`'s active-state highlighting is unaffected. The new `/history` route (S1-003) is covered by the same fix.

## TD-019 — Post-signup UX gives no explanation of the email-confirmation requirement — RESOLVED

**Where:** `lib/actions/auth.ts` (`signUp`), `components/auth/signup-form.tsx`

**Priority:** Low

**Verified via Sprint 0 runtime verification (S0-005):** `signUp()` called `redirect("/dashboard")` unconditionally on success, without checking whether a session was actually established. When the Supabase project requires email confirmation (as this project's does), no session existed yet, so `proxy.ts` immediately redirected the still-unauthenticated request back to `/login` with no explanation shown. The block itself was correct and not a security gap — this was purely a missing success-state message.

**Fix (Sprint 1, S1-004):** `signUp()` now checks `data.session` and returns `{ ok: true, requiresConfirmation: true }` instead of redirecting when no session was established; `SignupForm` shows "Account created — check your email to confirm it before signing in." for that case.
