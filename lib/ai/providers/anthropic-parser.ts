import "server-only"

import type { Message } from "@anthropic-ai/sdk/resources/messages"

import { AIContentBlockedError, AIResponseFormatError } from "@/lib/ai/errors"
import type { ResponseParser } from "@/lib/ai/providers/response-parser.interface"
import type { AIGenerationResponse } from "@/lib/ai/types"
import type { CanonicalSchemaAST } from "@/lib/ast/types"

/**
 * Name of the forced tool the AST is returned through (see `anthropic.ts`'s
 * request construction, which owns the actual JSON-schema/tool
 * definition) — defined here, not there, so this parser and that request
 * builder share one literal without a circular import between them.
 */
export const ANTHROPIC_AST_TOOL_NAME = "return_canonical_schema_ast"

/**
 * Interprets Anthropic's response *envelope* only (refused, cut off,
 * missing/wrong tool call) — deliberately does not shape-validate the
 * parsed object against `CanonicalSchemaAST`, same division of
 * responsibility as {@link geminiResponseParser}.
 *
 * Anthropic's request forces a tool call (`tool_choice`) rather than
 * asking for free-text JSON, so a successful response's AST comes from a
 * `tool_use` content block's already-parsed `input`, not from
 * `JSON.parse`-ing response text the way Gemini's parser does.
 */
export const anthropicResponseParser: ResponseParser<Message> = {
  parse(response: Message, provider: string): AIGenerationResponse {
    if (response.stop_reason === "refusal") {
      return {
        ok: false,
        error: new AIContentBlockedError({
          message: "The request was declined. Try rephrasing your prompt.",
          provider,
        }),
      }
    }

    if (response.stop_reason === "max_tokens") {
      return {
        ok: false,
        error: new AIResponseFormatError({
          message: "The response was cut off. Try a shorter or simpler prompt.",
          provider,
        }),
      }
    }

    if (response.stop_reason !== "tool_use") {
      return {
        ok: false,
        error: new AIResponseFormatError({
          message: "Received an unexpected response shape. Please try again.",
          provider,
        }),
      }
    }

    const toolUseBlock = response.content.find(
      (block) => block.type === "tool_use" && block.name === ANTHROPIC_AST_TOOL_NAME
    )
    if (!toolUseBlock || toolUseBlock.type !== "tool_use") {
      return {
        ok: false,
        error: new AIResponseFormatError({
          message: "Received an unexpected response shape. Please try again.",
          provider,
        }),
      }
    }

    return {
      ok: true,
      ast: toolUseBlock.input as CanonicalSchemaAST,
      metadata: { provider, model: response.model },
    }
  },
}
