import "server-only"

import Anthropic, {
  APIConnectionTimeoutError,
  APIError,
  APIUserAbortError,
  AuthenticationError,
  RateLimitError,
} from "@anthropic-ai/sdk"
import type { Message, Tool } from "@anthropic-ai/sdk/resources/messages"
import { z } from "zod"

import { getAnthropicClient } from "@/lib/ai/client"
import { anthropicConfig } from "@/lib/ai/config"
import { AIAuthenticationError, AIRateLimitError, AITimeoutError, AIUnknownError } from "@/lib/ai/errors"
import { anthropicResponseParser, ANTHROPIC_AST_TOOL_NAME } from "@/lib/ai/providers/anthropic-parser"
import { anthropicPromptBuilder, type AnthropicPrompt } from "@/lib/ai/providers/anthropic-prompts"
import { AIProviderName, type AIProviderAdapter } from "@/lib/ai/providers/interface"
import type { PromptBuilder } from "@/lib/ai/providers/prompt-builder.interface"
import type { ResponseParser } from "@/lib/ai/providers/response-parser.interface"
import { ExponentialBackoffRetryStrategy, type RetryStrategy } from "@/lib/ai/retry-strategy"
import type { AIGenerationRequest, AIGenerationResponse } from "@/lib/ai/types"
import { canonicalSchemaASTSchema } from "@/lib/ast/schema"

/**
 * Same shape as {@link GeminiProviderDependencies} — the DI seam
 * established by S5-001, reused verbatim for a second provider rather
 * than inventing a parallel convention.
 */
export interface AnthropicProviderDependencies {
  /** Defaults to `getAnthropicClient()`'s lazily-constructed client (`lib/ai/client.ts`). */
  client?: Anthropic
  config?: typeof anthropicConfig
  promptBuilder?: PromptBuilder<AnthropicPrompt>
  responseParser?: ResponseParser<Message>
  retryStrategy?: RetryStrategy
}

// Anthropic has no Gemini-equivalent "responseMimeType: json + schema"
// mode — the reliable way to get schema-constrained structured output
// from Claude is to force a tool call (tool_choice) and read the AST back
// out of the tool_use block's `input`, which the SDK already parses for
// us (unlike Gemini's free-text-then-JSON.parse path). Reuses the exact
// same canonicalSchemaASTSchema Gemini passes as its own responseJsonSchema
// -- one JSON Schema definition, two providers, not two schemas to keep
// in sync.
const AST_TOOL: Tool = {
  name: ANTHROPIC_AST_TOOL_NAME,
  description:
    "Return the designed database schema as a CanonicalSchemaAST matching the provided input schema.",
  input_schema: z.toJSONSchema(canonicalSchemaASTSchema) as Tool["input_schema"],
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Implements {@link AIProviderAdapter} for Anthropic (Claude): builds the
 * prompt via the injected {@link PromptBuilder}, forces a tool call
 * constrained to the `CanonicalSchemaAST` shape, retries transient
 * failures per the injected {@link RetryStrategy}, and parses the result
 * via the injected {@link ResponseParser} -- the same DI/retry/parsing
 * structure `createGeminiProvider` established, reused rather than
 * duplicated (only the SDK call itself and its own error mapping differ).
 */
export function createAnthropicProvider(
  deps: AnthropicProviderDependencies = {}
): AIProviderAdapter {
  const config = deps.config ?? anthropicConfig
  const promptBuilder = deps.promptBuilder ?? anthropicPromptBuilder
  const responseParser = deps.responseParser ?? anthropicResponseParser
  const retryStrategy = deps.retryStrategy ?? new ExponentialBackoffRetryStrategy()

  return {
    name: AIProviderName.Anthropic,

    async generateAST(request: AIGenerationRequest): Promise<AIGenerationResponse> {
      // Resolved here, not above -- see lib/ai/client.ts's comment on why
      // client construction must be deferred to actual use, not factory
      // construction (which happens for every registered provider on
      // every generation, per AIProviderRegistry).
      const client = deps.client ?? getAnthropicClient()
      const prompt = promptBuilder.build(request)

      let attempt = 0
      for (;;) {
        attempt++
        let response: Message
        try {
          response = await client.messages.create(
            {
              model: config.model,
              max_tokens: config.maxTokens,
              system: prompt.system,
              messages: prompt.messages,
              tools: [AST_TOOL],
              tool_choice: { type: "tool", name: ANTHROPIC_AST_TOOL_NAME },
            },
            { timeout: config.requestTimeoutMs }
          )
        } catch (rawError) {
          const error = toAIProviderError(rawError, AIProviderName.Anthropic)
          if (retryStrategy.shouldRetry(error, attempt)) {
            await delay(retryStrategy.getDelayMs(attempt))
            continue
          }
          return { ok: false, error }
        }

        const result = responseParser.parse(response, AIProviderName.Anthropic)
        if (result.ok || !retryStrategy.shouldRetry(result.error, attempt)) {
          return result
        }
        await delay(retryStrategy.getDelayMs(attempt))
      }
    },
  }
}

/**
 * Only interprets the call-level failure (network/auth/rate-limit) —
 * response-envelope interpretation is {@link anthropicResponseParser}'s
 * job. Anthropic's SDK exposes typed error classes directly (unlike
 * Gemini's numeric `.status` field), so this checks `instanceof` rather
 * than a status code. Re-throws anything not recognized as one of the
 * SDK's own error classes, matching `toAIProviderError`'s Gemini
 * counterpart: a genuinely unexpected error is a bug to surface loudly,
 * not a category to silently paper over.
 */
function toAIProviderError(error: unknown, provider: string) {
  if (error instanceof AuthenticationError) {
    return new AIAuthenticationError({
      message: "Server is misconfigured. Please contact the administrator.",
      provider,
      cause: error,
    })
  }
  if (error instanceof RateLimitError) {
    return new AIRateLimitError({
      message: "Too many requests right now. Please try again shortly.",
      provider,
      cause: error,
    })
  }
  if (error instanceof APIConnectionTimeoutError || error instanceof APIUserAbortError) {
    return new AITimeoutError({
      message: "The request timed out or the network failed. Please try again.",
      provider,
      cause: error,
    })
  }
  if (error instanceof APIError) {
    return new AIUnknownError({
      message: "The AI service returned an error. Please try again.",
      provider,
      cause: error,
    })
  }
  throw error
}
