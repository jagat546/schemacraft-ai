import "server-only"

import { createClient } from "@/lib/supabase/server"
import type { RepositoryResult } from "@/lib/repositories/types"

// Mirrors the `projects` table in lib/db/schema.ts. Kept in sync by hand:
// runtime queries go through the Supabase client (PostgREST), which
// returns snake_case columns and string timestamps, not Drizzle's
// camelCase/Date-typed inferred model.
export type Project = {
  id: string
  userId: string
  title: string
  description: string | null
  createdAt: string
  updatedAt: string
}

type ProjectRow = {
  id: string
  user_id: string
  title: string
  description: string | null
  created_at: string
  updated_at: string
}

function mapProject(row: ProjectRow): Project {
  return {
    id: row.id,
    userId: row.user_id,
    title: row.title,
    description: row.description,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export async function createProject(input: {
  title: string
  description?: string
}): Promise<RepositoryResult<Project>> {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { ok: false, error: "You must be signed in to create a project." }
  }

  const { data, error } = await supabase
    .from("projects")
    .insert({ user_id: user.id, title: input.title, description: input.description ?? null })
    .select()
    .single<ProjectRow>()

  if (error) {
    return { ok: false, error: "Could not create the project. Please try again." }
  }

  return { ok: true, data: mapProject(data) }
}

export async function getProjectById(projectId: string): Promise<RepositoryResult<Project>> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("projects")
    .select()
    .eq("id", projectId)
    .maybeSingle<ProjectRow>()

  if (error) {
    return { ok: false, error: "Could not load the project. Please try again." }
  }

  if (!data) {
    return { ok: false, error: "Project not found." }
  }

  return { ok: true, data: mapProject(data) }
}

// No userId parameter: RLS restricts every row to the authenticated
// session, so there is nothing meaningful to accept from the caller.
export async function getProjectsForUser(): Promise<RepositoryResult<Project[]>> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("projects")
    .select()
    .order("created_at", { ascending: false })
    .returns<ProjectRow[]>()

  if (error) {
    return { ok: false, error: "Could not load your projects. Please try again." }
  }

  return { ok: true, data: data.map(mapProject) }
}

export async function updateProject(
  projectId: string,
  updates: { title?: string; description?: string | null }
): Promise<RepositoryResult<Project>> {
  const supabase = await createClient()

  const payload = {
    ...(updates.title !== undefined && { title: updates.title }),
    ...(updates.description !== undefined && { description: updates.description }),
    updated_at: new Date().toISOString(),
  }

  const { data, error } = await supabase
    .from("projects")
    .update(payload)
    .eq("id", projectId)
    .select()
    .maybeSingle<ProjectRow>()

  if (error) {
    return { ok: false, error: "Could not update the project. Please try again." }
  }

  if (!data) {
    return { ok: false, error: "Project not found." }
  }

  return { ok: true, data: mapProject(data) }
}

export async function deleteProject(projectId: string): Promise<RepositoryResult<null>> {
  const supabase = await createClient()

  const { error, count } = await supabase
    .from("projects")
    .delete({ count: "exact" })
    .eq("id", projectId)

  if (error) {
    return { ok: false, error: "Could not delete the project. Please try again." }
  }

  if (!count) {
    return { ok: false, error: "Project not found." }
  }

  return { ok: true, data: null }
}
