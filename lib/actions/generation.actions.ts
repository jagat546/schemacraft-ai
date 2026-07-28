"use server"

import { z } from "zod"

import { requireUser } from "@/lib/auth/require-user"
import {
  deleteGeneration,
  getGeneration,
  getGenerationCountsByProject,
  getProjectGenerations,
  type Generation,
} from "@/lib/repositories/generation.repository"
import type { RepositoryResult } from "@/lib/repositories/types"

export async function getGenerationAction(input: {
  generationId: string
  projectId: string
}): Promise<RepositoryResult<Generation>> {
  await requireUser()

  const parsed = z
    .object({ generationId: z.uuid(), projectId: z.uuid() })
    .safeParse(input)

  if (!parsed.success) {
    return { ok: false, error: "Generation not found." }
  }

  const result = await getGeneration(parsed.data.generationId)

  if (!result.ok) {
    return result
  }

  // A generation that exists but belongs to a different project (of the
  // same user — RLS already keeps other users' rows out entirely) is
  // treated the same as not found, not a separate "wrong project" error.
  if (result.data.projectId !== parsed.data.projectId) {
    return { ok: false, error: "Generation not found." }
  }

  return result
}

export async function getProjectGenerationsAction(input: {
  projectId: string
}): Promise<RepositoryResult<Generation[]>> {
  await requireUser()

  const parsed = z.object({ projectId: z.uuid() }).safeParse(input)

  if (!parsed.success) {
    return { ok: false, error: "Invalid project id." }
  }

  return getProjectGenerations(parsed.data.projectId)
}

export async function getGenerationCountsByProjectAction(): Promise<
  RepositoryResult<Record<string, number>>
> {
  await requireUser()

  return getGenerationCountsByProject()
}

export async function deleteGenerationAction(input: {
  generationId: string
  projectId: string
}): Promise<RepositoryResult<null>> {
  await requireUser()

  const parsed = z
    .object({ generationId: z.uuid(), projectId: z.uuid() })
    .safeParse(input)

  if (!parsed.success) {
    return { ok: false, error: "Generation not found." }
  }

  // Same "wrong project = not found" defense as getGenerationAction: RLS
  // already keeps other users' rows out entirely, this just stops a
  // generationId/projectId mismatch from deleting a row the caller didn't
  // mean to target.
  const existing = await getGeneration(parsed.data.generationId)
  if (!existing.ok) {
    return existing
  }
  if (existing.data.projectId !== parsed.data.projectId) {
    return { ok: false, error: "Generation not found." }
  }

  return deleteGeneration(parsed.data.generationId)
}
