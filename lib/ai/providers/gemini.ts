import "server-only"

import { ApiError, FinishReason, type GenerateContentResponse } from "@google/genai"
import { z } from "zod"

import { genAI } from "@/lib/ai/client"
import { AST_SYSTEM_PROMPT, buildAstMessages } from "@/lib/ai/providers/gemini-prompts"
import type { AIProviderAdapter, GenerateASTInput, GenerateASTResult } from "@/lib/ai/providers/interface"
import { canonicalSchemaASTSchema } from "@/lib/ast/schema"
import type { CanonicalSchemaAST } from "@/lib/ast/types"
import { aiConfig } from "@/lib/config"

// Implements AIProviderAdapter for Gemini: builds the prompt, requests
// structured JSON constrained to the CanonicalSchemaAST shape, and
// returns it. Generates only an AST — never SQL, a Drizzle model, sample
// JSON, docs, or a diagram directly; those are compiler concerns now
// (lib/compiler), not this provider's.
export const geminiProvider: AIProviderAdapter = {
  async generateAST(input: GenerateASTInput): Promise<GenerateASTResult> {
    let response: GenerateContentResponse
    try {
      response = await genAI.models.generateContent({
        model: aiConfig.model,
        contents: buildAstMessages(input.prompt),
        config: {
          systemInstruction: AST_SYSTEM_PROMPT,
          maxOutputTokens: aiConfig.maxTokens,
          // No thinkingConfig: aiConfig.model is an alias Google can
          // repoint to a model that rejects thinkingConfig entirely
          // (confirmed: "gemini-flash-latest" 400s on thinkingBudget: 0,
          // even 0/"disabled"). Omitting it lets each underlying model use
          // its own default, at the cost of not being able to force
          // thinking off for latency/cost on models that do support it.
          responseMimeType: "application/json",
          responseJsonSchema: z.toJSONSchema(canonicalSchemaASTSchema),
          httpOptions: { timeout: aiConfig.requestTimeoutMs },
        },
      })
    } catch (error) {
      return { ok: false, error: mapGeminiError(error) }
    }

    return parseAstResponse(response)
  },
}

// Only interprets the Gemini response *envelope* (blocked, cut off,
// unparseable JSON) — deliberately does not shape-validate the parsed
// object against CanonicalSchemaAST. That's validateASTShape()'s job,
// called explicitly by generation.service.ts as its own pipeline stage,
// so "the AI call itself failed" (this function, surfaced as an
// AI_ERROR) and "the AI returned JSON that isn't a valid AST" (surfaced
// as INVALID_AST) are genuinely distinct failure categories rather than
// being collapsed into one.
function parseAstResponse(response: GenerateContentResponse): GenerateASTResult {
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

  try {
    const json = JSON.parse(text) as CanonicalSchemaAST
    return { ok: true, ast: json }
  } catch {
    return { ok: false, error: "Received an unexpected response shape. Please try again." }
  }
}

function mapGeminiError(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 401 || error.status === 403) {
      return "Server is misconfigured. Please contact the administrator."
    }
    if (error.status === 429) {
      return "Too many requests right now. Please try again shortly."
    }
    return "The AI service returned an error. Please try again."
  }
  if (error instanceof Error && error.name === "AbortError") {
    return "The request timed out or the network failed. Please try again."
  }
  throw error
}
