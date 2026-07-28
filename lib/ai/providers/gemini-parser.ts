import "server-only"

import { FinishReason, type GenerateContentResponse } from "@google/genai"

import { AIContentBlockedError, AIResponseFormatError } from "@/lib/ai/errors"
import type { ResponseParser } from "@/lib/ai/providers/response-parser.interface"
import type { AIGenerationResponse } from "@/lib/ai/types"
import type { CanonicalSchemaAST } from "@/lib/ast/types"

/**
 * Interprets Gemini's response *envelope* only (blocked, cut off,
 * unparseable JSON) — deliberately does not shape-validate the parsed
 * object against `CanonicalSchemaAST`. See {@link ResponseParser}'s own
 * doc comment for why that stays a separate pipeline stage.
 */
export const geminiResponseParser: ResponseParser<GenerateContentResponse> = {
  parse(response: GenerateContentResponse, provider: string): AIGenerationResponse {
    if (response.promptFeedback?.blockReason) {
      return {
        ok: false,
        error: new AIContentBlockedError({
          message: "The request was declined. Try rephrasing your prompt.",
          provider,
        }),
      }
    }

    const finishReason = response.candidates?.[0]?.finishReason
    if (finishReason === FinishReason.MAX_TOKENS) {
      return {
        ok: false,
        error: new AIResponseFormatError({
          message: "The response was cut off. Try a shorter or simpler prompt.",
          provider,
        }),
      }
    }
    if (finishReason && finishReason !== FinishReason.STOP) {
      return {
        ok: false,
        error: new AIContentBlockedError({
          message: "The request was declined. Try rephrasing your prompt.",
          provider,
        }),
      }
    }

    const text = response.text
    if (!text) {
      return {
        ok: false,
        error: new AIResponseFormatError({
          message: "Received an unexpected response shape. Please try again.",
          provider,
        }),
      }
    }

    try {
      const ast = JSON.parse(text) as CanonicalSchemaAST
      return {
        ok: true,
        ast,
        metadata: { provider, model: response.modelVersion ?? "unknown" },
      }
    } catch (cause) {
      return {
        ok: false,
        error: new AIResponseFormatError({
          message: "Received an unexpected response shape. Please try again.",
          provider,
          cause,
        }),
      }
    }
  },
}
