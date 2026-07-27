"use server"

import { z } from "zod"

import { getSessionResult } from "@/lib/auth/session-result"
import { checkAuthenticatedGenerationRateLimit } from "@/lib/repositories/rate-limit.repository"
import {
  generateAndPersistSchema,
  type GenerateAndPersistResult,
} from "@/lib/services/generation.service"

export type GenerateSchemaResult =
  | GenerateAndPersistResult
  | { status: "INVALID_INPUT"; error: string }
  | { status: "SESSION_EXPIRED" }
  | { status: "RATE_LIMITED"; error: string }
  | { status: "RATE_LIMIT_UNAVAILABLE"; error: string }

const inputSchema = z.object({
  prompt: z
    .string()
    .trim()
    .min(1, "Prompt can't be empty.")
    .max(4000, "Prompt is too long. Please keep it under 4000 characters."),
  projectId: z.uuid(),
})

// Uses getSessionResult() (AD-004), not requireUser(): a redirect here
// would navigate the user away from the Generator mid-action, discarding
// whatever they'd typed. The client (useGenerateSchema) renders
// SESSION_EXPIRED as its own state instead, preserving the prompt.
export async function generateSchema(
  prompt: string,
  projectId: string
): Promise<GenerateSchemaResult> {
  const session = await getSessionResult()
  if (session.status === "SESSION_EXPIRED") {
    return { status: "SESSION_EXPIRED" }
  }

  const parsed = inputSchema.safeParse({ prompt, projectId })
  if (!parsed.success) {
    return { status: "INVALID_INPUT", error: parsed.error.issues[0]?.message ?? "Invalid input." }
  }

  // S6-004: checked before the (expensive) AI call, same reasoning as the
  // project-ownership check below it in generateAndPersistSchema.
  const rateLimitOutcome = await checkAuthenticatedGenerationRateLimit(session.user.id)
  if (rateLimitOutcome === "RATE_LIMITED") {
    return {
      status: "RATE_LIMITED",
      error: "You've reached the generation limit for now. Please try again later.",
    }
  }
  if (rateLimitOutcome === "UNAVAILABLE") {
    return {
      status: "RATE_LIMIT_UNAVAILABLE",
      error: "Couldn't verify your generation limit right now. Please try again shortly.",
    }
  }

  return generateAndPersistSchema(parsed.data)
}
