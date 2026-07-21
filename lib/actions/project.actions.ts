"use server"

import { z } from "zod"

import { requireUser } from "@/lib/auth/require-user"
import {
  createProject,
  deleteProject,
  getProjectsForUser,
  updateProject,
  type Project,
} from "@/lib/repositories/project.repository"
import type { RepositoryResult } from "@/lib/repositories/types"

const titleSchema = z
  .string()
  .trim()
  .min(1, "Title is required.")
  .max(200, "Title must be 200 characters or fewer.")

const descriptionSchema = z
  .string()
  .trim()
  .max(2000, "Description must be 2000 characters or fewer.")
  .optional()

function firstIssueMessage(error: z.ZodError): string {
  return error.issues[0]?.message ?? "Invalid input."
}

export async function createProjectAction(input: {
  title: string
  description?: string
}): Promise<RepositoryResult<Project>> {
  await requireUser()

  const parsed = z
    .object({ title: titleSchema, description: descriptionSchema })
    .safeParse(input)

  if (!parsed.success) {
    return { ok: false, error: firstIssueMessage(parsed.error) }
  }

  return createProject(parsed.data)
}

export async function renameProjectAction(input: {
  projectId: string
  title: string
}): Promise<RepositoryResult<Project>> {
  await requireUser()

  const parsed = z
    .object({ projectId: z.uuid(), title: titleSchema })
    .safeParse(input)

  if (!parsed.success) {
    return { ok: false, error: firstIssueMessage(parsed.error) }
  }

  return updateProject(parsed.data.projectId, { title: parsed.data.title })
}

export async function deleteProjectAction(input: {
  projectId: string
}): Promise<RepositoryResult<null>> {
  await requireUser()

  const parsed = z.object({ projectId: z.uuid() }).safeParse(input)

  if (!parsed.success) {
    return { ok: false, error: firstIssueMessage(parsed.error) }
  }

  return deleteProject(parsed.data.projectId)
}

export async function getProjectsAction(): Promise<RepositoryResult<Project[]>> {
  await requireUser()

  return getProjectsForUser()
}
