"use server"

import { ApiError } from "@google/genai"

import { callGemini } from "@/lib/ai/generate"
import { parseGenerateSchemaResponse, type GenerateSchemaResult } from "@/lib/ai/parse-response"

export async function generateSchema(prompt: string): Promise<GenerateSchemaResult> {
  const trimmed = prompt.trim()
  if (!trimmed) {
    return { ok: false, error: "Prompt can't be empty." }
  }

  try {
    const response = await callGemini(trimmed)
    return parseGenerateSchemaResponse(response)
  } catch (error) {
    if (error instanceof ApiError) {
      if (error.status === 401 || error.status === 403) {
        return { ok: false, error: "Server is misconfigured. Please contact the administrator." }
      }
      if (error.status === 429) {
        return { ok: false, error: "Too many requests right now. Please try again shortly." }
      }
      return { ok: false, error: "The AI service returned an error. Please try again." }
    }
    if (error instanceof Error && error.name === "AbortError") {
      return { ok: false, error: "The request timed out or the network failed. Please try again." }
    }
    throw error
  }
}
