-- profiles.id is a plain UUID primary key in the Drizzle schema because
-- Drizzle's migration generator can't safely reference a table
-- (auth.users) it doesn't manage — attempting to declare that FK there
-- causes drizzle-kit to also try (and fail) to CREATE TABLE auth.users.
-- The real constraint is added here instead. Run after migrations have
-- been applied. Idempotent (safe to re-run).

alter table public.profiles drop constraint if exists profiles_id_auth_users_id_fk;
alter table public.profiles
  add constraint profiles_id_auth_users_id_fk
  foreign key (id) references auth.users (id)
  on delete cascade;

-- Standard Supabase pattern: automatically create a public.profiles row
-- whenever a new auth.users row is created.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data ->> 'full_name',
    new.raw_user_meta_data ->> 'avatar_url'
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();

-- S4-009 (Dashboard-Experience-Specification.md §Recent Projects, "most
-- recently active first"): projects.updated_at previously only changed on
-- a title/description edit, so it couldn't answer "which project was I
-- just generating for." This bumps it whenever a generation is created,
-- giving getProjectsForUser()'s ORDER BY updated_at DESC real meaning.
-- NOT applied by this commit -- requires explicit sign-off before running
-- against any shared Supabase environment (this project's established
-- DB-change discipline, per TECH_DEBT.md TD-001/TD-005).

create or replace function public.touch_project_on_generation_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.projects
  set updated_at = now()
  where id = new.project_id;
  return new;
end;
$$;

drop trigger if exists on_generation_created_touch_project on public.generations;

create trigger on_generation_created_touch_project
  after insert on public.generations
  for each row
  execute function public.touch_project_on_generation_insert();
