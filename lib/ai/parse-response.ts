import "server-only"

import { FinishReason, type GenerateContentResponse } from "@google/genai"

import { generatedSchemaSchema, type GeneratedSchema } from "@/types/schema"

export type GenerateSchemaResult =
  | { ok: true; data: GeneratedSchema }
  | { ok: false; error: string }

export function parseGenerateSchemaResponse(
  response: GenerateContentResponse
): GenerateSchemaResult {
  if (response.promptFeedback?.blockReason) {
    return { ok: false, error: "The request was declined. Try rephrasing your prompt." }
  }

  const finishReason = response.candidates?.[0]?.finishReason
  if (finishReason === FinishReason.MAX_TOKENS) {
    return { ok: false, error: "The response was cut off. Try a shorter or simpler prompt." }
  }
  if (finishReason && finishReason !== FinishReason.STOP) {
    return { ok: false, error: "The request was declined. Try rephrasing your prompt." }
  }

  const text = response.text
  if (!text) {
    return { ok: false, error: "Received an unexpected response shape. Please try again." }
  }

  let json: unknown
  try {
    json = JSON.parse(text)
  } catch {
    return { ok: false, error: "Received an unexpected response shape. Please try again." }
  }

  const parsed = generatedSchemaSchema.safeParse(json)
  if (!parsed.success) {
    return { ok: false, error: "Received an unexpected response shape. Please try again." }
  }

  return { ok: true, data: parsed.data }
}
