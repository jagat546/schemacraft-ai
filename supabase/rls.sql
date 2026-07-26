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
