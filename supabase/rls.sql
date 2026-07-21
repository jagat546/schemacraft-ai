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
