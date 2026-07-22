"use server"

import { z } from "zod"

import { requireUser } from "@/lib/auth/require-user"
import {
  generateAndPersistSchema,
  type GenerateAndPersistResult,
} from "@/lib/services/generation.service"

export type GenerateSchemaResult =
  | GenerateAndPersistResult
  | { status: "INVALID_INPUT"; error: string }

const inputSchema = z.object({
  prompt: z
    .string()
    .trim()
    .min(1, "Prompt can't be empty.")
    .max(4000, "Prompt is too long. Please keep it under 4000 characters."),
  projectId: z.uuid(),
})

export async function generateSchema(
  prompt: string,
  projectId: string
): Promise<GenerateSchemaResult> {
  await requireUser()

  const parsed = inputSchema.safeParse({ prompt, projectId })
  if (!parsed.success) {
    return { status: "INVALID_INPUT", error: parsed.error.issues[0]?.message ?? "Invalid input." }
  }

  return generateAndPersistSchema(parsed.data)
}
