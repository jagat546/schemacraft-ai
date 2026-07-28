-- Row Level Security for SchemaCraft AI. Run after migrations have been
-- applied. Idempotent (safe to re-run) via drop-then-create per policy.

-- Baseline table privileges ------------------------------------------------
-- RLS policies only restrict access on top of a base Postgres GRANT; they
-- never substitute for one. These tables were created via a direct
-- drizzle-kit migration (connecting as the postgres role), which does not
-- receive the grants Supabase's Studio auto-applies when a table is
-- created through the dashboard. Without this, every authenticated
-- request is denied before any RLS policy is evaluated.

grant select, insert, update, delete
  on public.profiles, public.projects, public.generations
  to authenticated;

-- profiles --------------------------------------------------------------
-- No insert/delete policies: rows are created by the handle_new_user
-- trigger (triggers.sql) and removed via ON DELETE CASCADE from
-- auth.users — never directly by users.

alter table public.profiles enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
  on public.profiles for select
  using (auth.uid() = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- projects ----------------------------------------------------------------

alter table public.projects enable row level security;

drop policy if exists "projects_select_own" on public.projects;
create policy "projects_select_own"
  on public.projects for select
  using (auth.uid() = user_id);

drop policy if exists "projects_insert_own" on public.projects;
create policy "projects_insert_own"
  on public.projects for insert
  with check (auth.uid() = user_id);

drop policy if exists "projects_update_own" on public.projects;
create policy "projects_update_own"
  on public.projects for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "projects_delete_own" on public.projects;
create policy "projects_delete_own"
  on public.projects for delete
  using (auth.uid() = user_id);

-- generations ---------------------------------------------------------------
-- generations has no user_id column, so ownership is checked by joining
-- back to projects.

alter table public.generations enable row level security;

drop policy if exists "generations_select_own" on public.generations;
create policy "generations_select_own"
  on public.generations for select
  using (
    exists (
      select 1 from public.projects
      where projects.id = generations.project_id
        and projects.user_id = auth.uid()
    )
  );

drop policy if exists "generations_insert_own" on public.generations;
create policy "generations_insert_own"
  on public.generations for insert
  with check (
    exists (
      select 1 from public.projects
      where projects.id = generations.project_id
        and projects.user_id = auth.uid()
    )
  );

drop policy if exists "generations_update_own" on public.generations;
create policy "generations_update_own"
  on public.generations for update
  using (
    exists (
      select 1 from public.projects
      where projects.id = generations.project_id
        and projects.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.projects
      where projects.id = generations.project_id
        and projects.user_id = auth.uid()
    )
  );

drop policy if exists "generations_delete_own" on public.generations;
create policy "generations_delete_own"
  on public.generations for delete
  using (
    exists (
      select 1 from public.projects
      where projects.id = generations.project_id
        and projects.user_id = auth.uid()
    )
  );

-- sandbox_generations -------------------------------------------------
-- Backs the public, unauthenticated landing-page sandbox (M9). Unlike
-- every other table in this file, there is deliberately NO direct grant
-- and NO policy for any role here — not even a select-your-own-rows
-- policy. The only sanctioned access path is the SECURITY DEFINER
-- function below. This is what actually enforces the rate limit; a
-- client-side "select count, then insert if under the limit" from
-- application code would have a check-then-act race under concurrent
-- requests from the same visitor, which is exactly what
-- pg_advisory_xact_lock closes here (it serializes concurrent calls for
-- the same ip_hash; different visitors are never blocked by each other).

alter table public.sandbox_generations enable row level security;

drop function if exists public.check_sandbox_rate_limit(text, integer, integer);
create function public.check_sandbox_rate_limit(
  p_ip_hash text,
  p_max_requests integer,
  p_window_minutes integer
) returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer;
begin
  perform pg_advisory_xact_lock(hashtext(p_ip_hash));

  delete from public.sandbox_generations
  where created_at < now() - (p_window_minutes || ' minutes')::interval;

  select count(*) into v_count
  from public.sandbox_generations
  where ip_hash = p_ip_hash
    and created_at >= now() - (p_window_minutes || ' minutes')::interval;

  if v_count >= p_max_requests then
    return false;
  end if;

  insert into public.sandbox_generations (ip_hash) values (p_ip_hash);
  return true;
end;
$$;

revoke all on function public.check_sandbox_rate_limit(text, integer, integer) from public;
grant execute on function public.check_sandbox_rate_limit(text, integer, integer) to anon, authenticated;

-- generation_rate_limit_events (S6-004) -------------------------------------
-- Authenticated-user generation rate limiting: 60/hour, burst 10/minute
-- (thresholds are passed in by the caller, not hardcoded here, so the
-- application layer owns the actual numbers). Mirrors sandbox_generations'
-- reserve-then-execute pattern above -- same pg_advisory_xact_lock
-- check-then-act race closure, keyed by user_id instead of ip_hash -- but
-- enforces two windows (an hourly ceiling and a short burst ceiling) in
-- one call instead of one.
--
-- Table creation lives in a Drizzle migration (drizzle/migrations/
-- 0002_nappy_raza.sql), not here -- same ownership split as
-- sandbox_generations (ADR-002: Drizzle owns schema/relations/migrations,
-- this file owns triggers/RLS/grants/SECURITY DEFINER functions). An
-- earlier revision of this file created the table inline instead, which
-- was inconsistent with that split and, discovered when actually applying
-- this file for the first time (private-beta readiness pass), failed
-- outright once user_preferences' own missing migration blocked the whole
-- script -- corrected by generating the proper migration for both tables
-- at once rather than patching around it here.

-- Same access model as sandbox_generations: RLS enabled, but no grant and
-- no policy for any role -- the SECURITY DEFINER function below is the
-- only sanctioned access path, so there is no client-reachable table
-- access to bypass the lock/count logic with.
alter table public.generation_rate_limit_events enable row level security;

-- S7-003: returns jsonb, not a plain boolean, so a rejected caller can be
-- told approximately when to retry -- a plain true/false gave the
-- application layer no way to compute that itself (it never sees the
-- underlying event timestamps, by design: the reservation table has no
-- direct grant for any role). retry_after_seconds is the time until the
-- oldest event inside whichever window was actually exceeded ages out of
-- it; null when the request is allowed.
drop function if exists public.check_authenticated_rate_limit(uuid, integer, integer, integer, integer);
create function public.check_authenticated_rate_limit(
  p_user_id uuid,
  p_hourly_max integer,
  p_hourly_window_minutes integer,
  p_burst_max integer,
  p_burst_window_minutes integer
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_hourly_count integer;
  v_burst_count integer;
  v_oldest_in_window timestamptz;
  v_retry_after_seconds integer;
begin
  perform pg_advisory_xact_lock(hashtext(p_user_id::text));

  delete from public.generation_rate_limit_events
  where created_at < now() - (greatest(p_hourly_window_minutes, p_burst_window_minutes) || ' minutes')::interval;

  select count(*) into v_hourly_count
  from public.generation_rate_limit_events
  where user_id = p_user_id
    and created_at >= now() - (p_hourly_window_minutes || ' minutes')::interval;

  if v_hourly_count >= p_hourly_max then
    select min(created_at) into v_oldest_in_window
    from public.generation_rate_limit_events
    where user_id = p_user_id
      and created_at >= now() - (p_hourly_window_minutes || ' minutes')::interval;

    v_retry_after_seconds := greatest(0, ceil(extract(
      epoch from (v_oldest_in_window + (p_hourly_window_minutes || ' minutes')::interval - now())
    )))::integer;

    return jsonb_build_object('allowed', false, 'retry_after_seconds', v_retry_after_seconds);
  end if;

  select count(*) into v_burst_count
  from public.generation_rate_limit_events
  where user_id = p_user_id
    and created_at >= now() - (p_burst_window_minutes || ' minutes')::interval;

  if v_burst_count >= p_burst_max then
    select min(created_at) into v_oldest_in_window
    from public.generation_rate_limit_events
    where user_id = p_user_id
      and created_at >= now() - (p_burst_window_minutes || ' minutes')::interval;

    v_retry_after_seconds := greatest(0, ceil(extract(
      epoch from (v_oldest_in_window + (p_burst_window_minutes || ' minutes')::interval - now())
    )))::integer;

    return jsonb_build_object('allowed', false, 'retry_after_seconds', v_retry_after_seconds);
  end if;

  insert into public.generation_rate_limit_events (user_id) values (p_user_id);
  return jsonb_build_object('allowed', true, 'retry_after_seconds', null);
end;
$$;

revoke all on function public.check_authenticated_rate_limit(uuid, integer, integer, integer, integer) from public;
grant execute on function public.check_authenticated_rate_limit(uuid, integer, integer, integer, integer) to authenticated;

-- delete_own_account (S6-003, per AD-005) -----------------------------------
-- Executes AD-005's accepted recommendation: hard delete, immediate, no
-- grace period, via a SECURITY DEFINER function scoped to auth.uid() --
-- never a caller-supplied ID, which is the entire security property
-- standing between "delete your own account" and "delete anyone's
-- account." Every dependent row (profiles, projects, generations,
-- user_preferences once applied) cascades away in the same statement's
-- transaction via the existing ON DELETE CASCADE chain -- no separate
-- per-table cleanup is needed or performed here. Deliberately NOT YET
-- APPLIED to any live database -- same "prepare but don't apply"
-- discipline as every other schema-adjacent change in this project, and
-- AD-005's own explicitly disclosed verification gap: this has not been
-- smoke-tested against a live Supabase instance in this environment.

drop function if exists public.delete_own_account();
create function public.delete_own_account() returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from auth.users where id = auth.uid();
end;
$$;

revoke all on function public.delete_own_account() from public;
grant execute on function public.delete_own_account() to authenticated;

-- user_preferences (S4-010B) -------------------------------------------------
-- NOT YET APPLIED -- see lib/db/schema.ts's userPreferences comment. Lazily
-- created: no row exists until a user saves a preference for the first
-- time, so only select/insert/update are needed (no signup trigger, no
-- delete policy -- the row cascades away with the owning profile).

grant select, insert, update on public.user_preferences to authenticated;

alter table public.user_preferences enable row level security;

drop policy if exists "user_preferences_select_own" on public.user_preferences;
create policy "user_preferences_select_own"
  on public.user_preferences for select
  using (auth.uid() = user_id);

drop policy if exists "user_preferences_insert_own" on public.user_preferences;
create policy "user_preferences_insert_own"
  on public.user_preferences for insert
  with check (auth.uid() = user_id);

drop policy if exists "user_preferences_update_own" on public.user_preferences;
create policy "user_preferences_update_own"
  on public.user_preferences for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
