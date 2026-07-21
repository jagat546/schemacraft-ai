import "server-only"

import { ApiError } from "@google/genai"

import { callGemini } from "@/lib/ai/generate"
import { parseGenerateSchemaResponse } from "@/lib/ai/parse-response"
import { createGeneration } from "@/lib/repositories/generation.repository"
import { getProjectById } from "@/lib/repositories/project.repository"
import type { GeneratedSchema } from "@/types/schema"

export type GenerateAndPersistResult =
  | { status: "SUCCESS"; data: GeneratedSchema; generationId: string }
  | { status: "GENERATED_NOT_SAVED"; data: GeneratedSchema; error: string }
  | { status: "PROJECT_NOT_FOUND"; error: string }
  | { status: "INVALID_RESPONSE"; error: string }
  | { status: "AI_ERROR"; error: string }

export async function generateAndPersistSchema(input: {
  prompt: string
  projectId: string
}): Promise<GenerateAndPersistResult> {
  // Ownership check happens before the (expensive) AI call, and produces
  // an explicit user-facing message rather than letting the eventual
  // persist step fail on an RLS/FK violation the caller can't interpret.
  const projectResult = await getProjectById(input.projectId)
  if (!projectResult.ok) {
    return { status: "PROJECT_NOT_FOUND", error: "Project not found." }
  }

  let parseResult
  try {
    const response = await callGemini(input.prompt)
    parseResult = parseGenerateSchemaResponse(response)
  } catch (error) {
    if (error instanceof ApiError) {
      if (error.status === 401 || error.status === 403) {
        return {
          status: "AI_ERROR",
          error: "Server is misconfigured. Please contact the administrator.",
        }
      }
      if (error.status === 429) {
        return {
          status: "AI_ERROR",
          error: "Too many requests right now. Please try again shortly.",
        }
      }
      return { status: "AI_ERROR", error: "The AI service returned an error. Please try again." }
    }
    if (error instanceof Error && error.name === "AbortError") {
      return {
        status: "AI_ERROR",
        error: "The request timed out or the network failed. Please try again.",
      }
    }
    throw error
  }

  if (!parseResult.ok) {
    return { status: "INVALID_RESPONSE", error: parseResult.error }
  }

  const persistResult = await createGeneration({
    projectId: input.projectId,
    prompt: input.prompt,
    artifacts: parseResult.data,
  })

  if (!persistResult.ok) {
    return { status: "GENERATED_NOT_SAVED", data: parseResult.data, error: persistResult.error }
  }

  return { status: "SUCCESS", data: parseResult.data, generationId: persistResult.data.id }
}
