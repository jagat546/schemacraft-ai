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
