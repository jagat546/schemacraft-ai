import "server-only"

import { createClient } from "@/lib/supabase/server"
import type { RepositoryResult } from "@/lib/repositories/types"
import type { GeneratedSchema } from "@/types/schema"

// Mirrors the `generations` table in lib/db/schema.ts. Kept in sync by
// hand: runtime queries go through the Supabase client (PostgREST), which
// returns snake_case columns and string timestamps, not Drizzle's
// camelCase/Date-typed inferred model.
export type Generation = {
  id: string
  projectId: string
  versionNumber: number
  prompt: string
  artifacts: GeneratedSchema
  createdAt: string
}

type GenerationRow = {
  id: string
  project_id: string
  version_number: number
  prompt: string
  artifacts: GeneratedSchema
  created_at: string
}

function mapGeneration(row: GenerationRow): Generation {
  return {
    id: row.id,
    projectId: row.project_id,
    versionNumber: row.version_number,
    prompt: row.prompt,
    artifacts: row.artifacts,
    createdAt: row.created_at,
  }
}

export async function createGeneration(input: {
  projectId: string
  prompt: string
  artifacts: GeneratedSchema
}): Promise<RepositoryResult<Generation>> {
  const supabase = await createClient()

  const { data: latest, error: latestError } = await supabase
    .from("generations")
    .select("version_number")
    .eq("project_id", input.projectId)
    .order("version_number", { ascending: false })
    .limit(1)
    .maybeSingle<Pick<GenerationRow, "version_number">>()

  if (latestError) {
    return { ok: false, error: "Could not determine the next version. Please try again." }
  }

  const nextVersion = (latest?.version_number ?? 0) + 1

  const { data, error } = await supabase
    .from("generations")
    .insert({
      project_id: input.projectId,
      version_number: nextVersion,
      prompt: input.prompt,
      artifacts: input.artifacts,
    })
    .select()
    .single<GenerationRow>()

  if (error) {
    // 23505 = unique_violation on (project_id, version_number) — another
    // generation was created for this project between the read above and
    // this insert. Not a fully atomic increment (no runtime Drizzle
    // transaction is available on this path per ADR-002), but the unique
    // constraint guarantees this fails loudly instead of corrupting data.
    if (error.code === "23505") {
      return {
        ok: false,
        error: "This project was updated concurrently. Please try again.",
      }
    }
    return { ok: false, error: "Could not save the generation. Please try again." }
  }

  return { ok: true, data: mapGeneration(data) }
}

export async function getGeneration(generationId: string): Promise<RepositoryResult<Generation>> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("generations")
    .select()
    .eq("id", generationId)
    .maybeSingle<GenerationRow>()

  if (error) {
    return { ok: false, error: "Could not load the generation. Please try again." }
  }

  if (!data) {
    return { ok: false, error: "Generation not found." }
  }

  return { ok: true, data: mapGeneration(data) }
}

export async function getProjectGenerations(
  projectId: string
): Promise<RepositoryResult<Generation[]>> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("generations")
    .select()
    .eq("project_id", projectId)
    .order("version_number", { ascending: false })
    .returns<GenerationRow[]>()

  if (error) {
    return { ok: false, error: "Could not load the project history. Please try again." }
  }

  return { ok: true, data: data.map(mapGeneration) }
}

// Extracted so the aggregation itself is unit-testable without a live
// Supabase connection -- this repo has no existing convention for mocking
// the Supabase client in a repository test (confirmed: no *.test.ts file
// exists anywhere under lib/repositories/ today), so this mirrors the
// project's existing pattern of testing pure logic separately from I/O
// (buildGeneratedArtifacts in lib/services/generation.service.ts is the
// precedent) rather than inventing a new Supabase-mocking harness for one
// small query.
export function countGenerationsByProject(rows: Array<{ project_id: string }>): Record<string, number> {
  const counts: Record<string, number> = {}
  for (const row of rows) {
    counts[row.project_id] = (counts[row.project_id] ?? 0) + 1
  }
  return counts
}

// Lightweight, additive query for the Dashboard's Metrics row (total
// generations) and project Filters ("Has generations" / "Empty") --
// grouped counts aren't expressible through PostgREST directly, so this
// projects just the project_id column (RLS already scopes every row to the
// current user's own projects, no user_id column on `generations` itself)
// and aggregates in-process rather than adding a Postgres function for what
// is, at this project's current scale, a cheap single-column read.
export async function getGenerationCountsByProject(): Promise<RepositoryResult<Record<string, number>>> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("generations")
    .select("project_id")
    .returns<Array<Pick<GenerationRow, "project_id">>>()

  if (error) {
    return { ok: false, error: "Could not load generation counts. Please try again." }
  }

  return { ok: true, data: countGenerationsByProject(data) }
}

export async function deleteGeneration(generationId: string): Promise<RepositoryResult<null>> {
  const supabase = await createClient()

  const { error, count } = await supabase
    .from("generations")
    .delete({ count: "exact" })
    .eq("id", generationId)

  if (error) {
    return { ok: false, error: "Could not delete the generation. Please try again." }
  }

  if (!count) {
    return { ok: false, error: "Generation not found." }
  }

  return { ok: true, data: null }
}
