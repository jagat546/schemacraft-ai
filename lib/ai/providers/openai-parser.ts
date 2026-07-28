import "server-only"

import type { ChatCompletion } from "openai/resources/chat/completions"

import { AIContentBlockedError, AIResponseFormatError } from "@/lib/ai/errors"
import type { ResponseParser } from "@/lib/ai/providers/response-parser.interface"
import type { AIGenerationResponse } from "@/lib/ai/types"
import type { CanonicalSchemaAST } from "@/lib/ast/types"

/**
 * Interprets OpenAI's response *envelope* only (refused, cut off,
 * unparseable JSON) — deliberately does not shape-validate the parsed
 * object against `CanonicalSchemaAST`, same division of responsibility as
 * {@link geminiResponseParser}/{@link anthropicResponseParser}.
 *
 * Non-strict `response_format: json_schema` (see `openai.ts`) guarantees
 * syntactically valid JSON but not full schema conformance — same
 * trade-off Gemini's own `responseJsonSchema` usage already accepts here,
 * with `validateASTShape` (`lib/services/generation.service.ts`) as the
 * real conformance check regardless of provider.
 */
export const openaiResponseParser: ResponseParser<ChatCompletion> = {
  parse(response: ChatCompletion, provider: string): AIGenerationResponse {
    const choice = response.choices[0]
    const message = choice?.message

    if (message?.refusal || choice?.finish_reason === "content_filter") {
      return {
        ok: false,
        error: new AIContentBlockedError({
          message: "The request was declined. Try rephrasing your prompt.",
          provider,
        }),
      }
    }

    if (choice?.finish_reason === "length") {
      return {
        ok: false,
        error: new AIResponseFormatError({
          message: "The response was cut off. Try a shorter or simpler prompt.",
          provider,
        }),
      }
    }

    if (choice?.finish_reason !== "stop") {
      return {
        ok: false,
        error: new AIResponseFormatError({
          message: "Received an unexpected response shape. Please try again.",
          provider,
        }),
      }
    }

    const content = message?.content
    if (!content) {
      return {
        ok: false,
        error: new AIResponseFormatError({
          message: "Received an unexpected response shape. Please try again.",
          provider,
        }),
      }
    }

    try {
      const ast = JSON.parse(content) as CanonicalSchemaAST
      return { ok: true, ast, metadata: { provider, model: response.model } }
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
