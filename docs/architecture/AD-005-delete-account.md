# AD-005 — Delete Account Implementation Mechanism

**Status:** Proposed. No code changes accompany this record — decision only, per Sprint 5 task S5-002 Phase 1.
**Raised by:** S4-010B (Account Settings Part 2), which deliberately left delete-account unimplemented rather than resolve this unilaterally. See `features/account-settings/components/account-settings.tsx`'s own code comment and `TECH_DEBT.md`/`SCHEMACRAFT_AI_MASTER_CONTEXT.md`'s "delete-account implementation mechanism" open item.
**Consumed by (future):** A dedicated implementation task (recommended: `S5-00X`, sequenced whenever the product wants this shipped — not blocking S5-002's Anthropic provider work, which has no dependency on this decision).

---

## Problem

`Dashboard-Experience-Specification.md` §Account Settings requires an Account section exposing "delete-account (destructive — see Error Experience / confirmation pattern in Design System 2.0 §10 Dialogs)." No implementation exists. Supabase Auth has no anon/authenticated-key-callable "delete my own account" RPC — every account-lifecycle mutation this app performs today (`lib/actions/auth.ts`) uses the standard `createClient()` SSR client (anon key + user's own session cookie), which can sign a user in/out and change their own password, but cannot delete their own `auth.users` row. That requires either a Supabase **service-role** client (a credential this codebase has never provisioned — confirmed via `.env.example`, which documents exactly four variables, none of them a service-role key) or a **`SECURITY DEFINER` Postgres function** scoped to `auth.uid()`.

This ADR resolves: which mechanism, what happens to a deleted user's data, whether deletion is immediate or delayed, and what's required before implementation can begin.

## Audit Findings

Full account/data audit performed directly against the current schema and code (not assumed from documentation):

- **`lib/db/schema.ts`** — the entire relevant table chain already cascades: `profiles.id → auth.users.id ON DELETE CASCADE` (added by hand in `supabase/triggers.sql`, since Drizzle can't manage a Supabase-owned table), `projects.user_id → profiles.id ON DELETE CASCADE`, `generations.project_id → projects.id ON DELETE CASCADE`, and `user_preferences.user_id → profiles.id ON DELETE CASCADE` (prepared, not yet applied — S4-010B). **Deleting the `auth.users` row alone is sufficient to cascade-delete every one of a user's projects, generations, and preferences.** No manual per-table cleanup code is needed for any of these four tables.
- **`sandbox_generations`** has no FK to any user table at all (`ip_hash`-keyed, anonymous-visitor rate limiting only) — genuinely unrelated to account deletion, confirmed by reading its own schema comment and `supabase/rls.sql`'s section for it.
- **Storage:** grepped the entire repository for any Supabase Storage usage (`storage.`, `createBucket`, `.storage`) — none exists. `profiles.avatarUrl` is a plain text URL column (populated from OAuth provider metadata at signup, if present), not a reference to any file this app stores. **There is no file-storage cleanup concern for account deletion.**
- **RLS (`supabase/rls.sql`):** `profiles` deliberately has no `delete` policy for any role — its own comment states rows are "removed via `ON DELETE CASCADE` from `auth.users` — never directly by users." This confirms the schema was already designed with exactly this ADR's eventual mechanism in mind: deletion happens by removing the `auth.users` row, not by a user directly deleting their `profiles` row.
- **`lib/supabase/server.ts`** — the sole Supabase client factory used anywhere in this app wraps the anon key via `@supabase/ssr`'s `createServerClient`. No service-role client exists in this codebase today, in any file.
- **`lib/actions/auth.ts`** — `signOutAllSessionsAction()` (S4-006, `scope: "global"`) already revokes every refresh token for a user. This is directly reusable as part of a delete flow's defense-in-depth, not something this ADR needs to reinvent.
- **Existing "prepare but don't apply" precedent:** two prior schema-adjacent changes this project (S4-009's recency trigger, S4-010B's `user_preferences` table + RLS) were written as version-controlled SQL and explicitly **not** run against any live database, pending human sign-off — the same discipline this ADR's recommendation follows.
- **Existing `SECURITY DEFINER` precedent:** `supabase/triggers.sql`'s `handle_new_user()` and `supabase/rls.sql`'s `check_sandbox_rate_limit()` are both already `SECURITY DEFINER` functions performing privileged operations a plain `authenticated`-role grant couldn't. A third, similarly-scoped function is a consistent extension of an already-proven pattern in this exact codebase, not a new category of risk.

---

## Soft Delete vs. Hard Delete

**Recommended: hard delete, immediate, no grace period, for the initial implementation.**

Considered and rejected as the *default*: a "soft delete" flag (e.g. `profiles.deleted_at`) with data retained and merely hidden. Rejected because:
- It does not, by itself, satisfy GDPR's right to erasure (Article 17) — data that still physically exists and is queryable is not erased, regardless of an application-level filter hiding it.
- Every read query touching `profiles`/`projects`/`generations` (`getProjectsForUser`, `getCurrentUser`, the RLS policies themselves) would need a `deleted_at IS NULL` filter added — a much larger blast radius across the repository layer than the mechanism below, for a benefit (recoverability) that can be achieved more cheaply.

A **grace period before hard deletion** (soft-delete-then-purge, the pattern GitHub/Vercel/most SaaS products use) is a legitimate future enhancement, deliberately **not** recommended for the initial implementation, because it requires new infrastructure this project doesn't have today: a new `profiles.deletion_requested_at` column, login-time gating logic to block/redirect an account pending deletion, and a scheduled job (Vercel Cron or `pg_cron`) to perform the actual purge after N days — none of which exists, and none of which is required to ship a correct, safe, GDPR-compliant delete-account feature. If the product later wants an "undo window" for account deletion, that's a separate, additive decision layered on top of this one, not a blocker to it.

The safety net for an immediate hard delete is a strong **confirmation step** at the UI layer (typing the account's email, or the literal word "delete," into a confirmation dialog before the action is enabled — a heavier pattern than the 5-second undo toast used for generation deletion, Sprint 4/S4-013, since account deletion is categorically higher-stakes and, under this recommendation, not undoable at all once confirmed). This is a UI-implementation detail for the eventual task that builds it, not decided further here.

## What Happens to Projects?

Cascade-deleted automatically. `projects.user_id → profiles.id ON DELETE CASCADE`, and `profiles.id → auth.users.id ON DELETE CASCADE` — deleting the `auth.users` row deletes every project the user owns, in the same database operation, with no separate application-level "delete all projects for this user" step.

## What Happens to Generations?

Cascade-deleted automatically, one level further down the same chain: `generations.project_id → projects.id ON DELETE CASCADE`. Every generation belonging to every one of the user's projects is removed as part of the same cascading operation. `user_preferences` (once applied) cascades the same way.

## GDPR / Privacy Implications

- **Right to erasure (Article 17):** an immediate hard delete (this ADR's recommendation) satisfies this directly — no soft-deleted PII lingers in the live database. `profiles.email`/`fullName`/`avatarUrl` (the actual PII in this schema) are gone the instant the delete completes.
- **Right to portability:** not this ADR's concern to solve, but worth noting it's already substantially covered — Sprint 4's "Export all" zip bundle (S4-013) already lets a user download every artifact from any generation before deleting their account. No new export mechanism is required by this decision.
- **Backups:** Supabase's automated backups (retention window depends on the project's plan) will still contain a deleted user's data for some period after deletion — this is an infrastructure-level fact no application code can change, and should be disclosed honestly in whatever privacy policy this product eventually publishes (no privacy policy exists in this repository today — flagged as a gap, out of scope for this ADR to author).
- **Sandbox data:** `sandbox_generations` rows are never linked to a real account (IP-hash only, already a one-way hash) — no action needed for them under any account-deletion flow.
- **Audit trail:** deliberately **not recommended** for the initial implementation. A separate "account deletions log" table (user-id hash + timestamp, retained after the user's own data is gone, for support/dispute purposes) is a reasonable *future* addition some products keep, but it's new scope this ADR doesn't require to be GDPR-compliant or safe — noted here so it isn't silently forgotten, not built now.

## Foreign-Key Strategy

No FK changes required. Every table in the deletion's blast radius (`profiles`, `projects`, `generations`, and `user_preferences` once applied) already cascades from `auth.users` via the chain audited above. This is precisely why the hard-delete-via-cascade approach is recommended over any soft-delete scheme: the schema was already built for it (see `profiles`' own RLS comment, quoted above), and no repository/query-layer changes are needed anywhere in `lib/repositories/`.

## Supabase Auth Deletion Flow

Two candidate mechanisms, both technically capable of removing the `auth.users` row (which is the one action that triggers the entire cascade):

**Option 1 — `SECURITY DEFINER` Postgres function (recommended).**
A new function, `public.delete_own_account()`, callable via `supabase.rpc("delete_own_account")` using the app's existing anon-key client (no new credential). Internally: `delete from auth.users where id = auth.uid()`. Scoping the `WHERE` clause to `auth.uid()` (never a caller-supplied user ID) is the critical security property — this makes it structurally impossible for an authenticated user to delete any account but their own, regardless of what the client sends. Directly analogous to this codebase's own `handle_new_user()` and `check_sandbox_rate_limit()` functions — a proven, already-reviewed pattern here, not a new category of risk.
*Caveat, disclosed rather than assumed:* Supabase's own internal auth-schema bookkeeping tables (`auth.identities`, `auth.sessions`, `auth.refresh_tokens`, `auth.mfa_factors`, and similar) are understood to cascade from `auth.users` via Supabase's own schema design, which is why deleting directly from `auth.users` is a documented community pattern for exactly this use case — but this has **not been verified against a live Supabase instance in this environment** (no credentials are available here, consistent with every other DB-touching decision this project has made). This should be smoke-tested against a real (non-production) Supabase project before this function is treated as verified, not assumed correct from schema design alone.

**Option 2 — Service-role client + `supabase.auth.admin.deleteUser(userId)`.**
Supabase's officially documented, fully-supported Admin API for this exact operation — guaranteed to correctly handle every internal auth-schema table, including ones this project doesn't have visibility into, across Supabase platform versions. Requires provisioning a new `SUPABASE_SERVICE_ROLE_KEY` secret (added to `.env.example`, local `.env`, and Vercel's environment variables) and a new, deliberately narrow server-only client module (mirroring `lib/ai/client.ts`'s existing "one small server-only module wrapping a sensitive client" pattern) — this key must never be imported anywhere reachable from client code. A genuinely more future-proof choice, at the cost of a new secret this environment cannot provision or test today (no Supabase project access here), and a slightly larger blast radius (a new credential to protect, versus a new SQL function this project already has two precedents for).

**Recommendation: Option 1**, for this project's specific circumstances — no new secret to provision (this environment has no Supabase credentials to add one with anyway), directly consistent with two already-proven `SECURITY DEFINER` functions in this same codebase, and deployable via the exact "prepared SQL, human runs it after review" pattern already established for `rls.sql`/`triggers.sql`. Option 2 is documented here as the more conservative, officially-supported alternative if the eventual implementer's risk tolerance differs — this is a real trade-off, not a close call resolved by default, and is recorded so it isn't re-litigated from scratch later.

## Transaction Boundaries

Whichever option is chosen, the actual deletion is a single atomic operation at the database level: one `DELETE FROM auth.users WHERE id = ...` (issued either directly by the `SECURITY DEFINER` function or internally by Supabase's Admin API), with every dependent row across `profiles`/`projects`/`generations`/`user_preferences` removed by cascade as part of that same statement's transaction. There is no multi-step application-level orchestration ("delete generations, then projects, then profile, then auth user") and therefore no partial-failure state to guard against — either the whole cascade commits, or none of it does.

The Server Action wrapping this call should, after a successful RPC/Admin-API response, explicitly terminate the current session (reusing `signOutAllSessionsAction`'s `scope: "global"` sign-out, or equivalent) and redirect to a "your account has been deleted" confirmation page — defense in depth, since a session's JWT could otherwise remain client-side until natural expiry even though the underlying user no longer exists.

## Recovery Policy

**None, under this ADR's recommendation.** Once the confirmation step is completed and the delete succeeds, the account and all associated data are gone from the live database with no in-product undo — consistent with choosing immediate hard delete over a grace period (see above). The only remaining recovery path is Supabase's own infrastructure-level backup/point-in-time-recovery, which is an operational, human-initiated action outside this product's UI, not something to design a feature around. If the product later wants a self-service "undo my account deletion" window, that requires adopting the grace-period model explicitly deferred above — a separate decision, not a variant of this one.

## Risks

- **Verification gap:** the `SECURITY DEFINER` function's interaction with Supabase's internal auth-schema tables has not been tested against a live instance in this environment (disclosed above, not glossed over). Mitigation: smoke-test in a non-production Supabase project before this is considered production-ready.
- **Security-critical scoping:** the function must use `auth.uid()` internally and must **never** accept a user-ID parameter from the caller — this is the entire security property standing between "delete your own account" and "delete anyone's account." Any implementation of this ADR must be reviewed specifically for this property, not just for whether it compiles/runs.
- **No audit trail:** if a deletion is later disputed (e.g., "I didn't mean to do that," a support request, or a legal inquiry), there is no record beyond Supabase's own infrastructure logs. Accepted as a reasonable trade-off for the initial implementation (see GDPR section); revisit if support volume or compliance requirements demand it.
- **Irreversibility combined with UI risk:** since there's no grace period, a UI bug that fires the delete action unintentionally (e.g. a double-submit, or a confirmation dialog that's too easy to click through) has no safety net once the RPC succeeds. Mitigation is entirely at the UI-implementation layer (strong, deliberate-friction confirmation) — flagged here so the eventual implementation task treats that UI as seriously as the backend mechanism.
- **Backups retain data temporarily** — disclosed under GDPR above; not a code risk, but should be reflected in any privacy policy this product publishes.

## Recommended Implementation

1. **`supabase/rls.sql`** *(new section, appended)* — `public.delete_own_account()`, a `SECURITY DEFINER` function scoped to `auth.uid()`, granted `execute` to `authenticated` only. Written as version-controlled SQL and **not applied** to any live database by this ADR — same explicit-sign-off discipline as every other schema-adjacent change this project has made (S4-009, S4-010B), and for the same reason: no live Supabase credentials exist in this environment.
2. **`lib/actions/auth.ts`** *(future change)* — a new `deleteAccountAction()`: calls `supabase.rpc("delete_own_account")`, then signs out globally, then returns a result the UI redirects on (matching this file's existing `AuthActionResult` pattern).
3. **`features/account-settings/components/account-settings.tsx`** *(future change)* — replace the current "deliberately not implemented" comment with a real, high-friction confirmation dialog (type the account email, or "delete," to enable the destructive action) calling `deleteAccountAction()`.
4. **No changes** to `lib/db/schema.ts`, any repository, or any RLS policy on `profiles`/`projects`/`generations`/`user_preferences` — the cascade chain already does everything needed.

None of this is implemented by this ADR. Per this task's own instructions, no production code accompanies this record.

---

**Outcome of this record:** Recommend proceeding with **hard delete via a `SECURITY DEFINER` Postgres function (`delete_own_account`, scoped to `auth.uid()`), immediate (no grace period), leaning entirely on the already-existing FK cascade chain.** This decision is straightforward enough to unblock Phase 2 without further user input — it requires no new secrets, no new infrastructure, and no schema changes beyond one new SQL function that is not applied by this ADR. Implementation itself (the SQL, the Server Action, the confirmation UI) is deferred to its own future task, consistent with every other prepared-but-unapplied database change this project has made.
