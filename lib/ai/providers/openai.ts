import "server-only"

import OpenAI, {
  APIConnectionTimeoutError,
  APIError,
  APIUserAbortError,
  AuthenticationError,
  RateLimitError,
} from "openai"
import type { ChatCompletion } from "openai/resources/chat/completions"
import { z } from "zod"

import { getOpenAIClient } from "@/lib/ai/client"
import { openaiConfig } from "@/lib/ai/config"
import { AIAuthenticationError, AIRateLimitError, AITimeoutError, AIUnknownError } from "@/lib/ai/errors"
import { openaiResponseParser } from "@/lib/ai/providers/openai-parser"
import { openaiPromptBuilder, type OpenAIPrompt } from "@/lib/ai/providers/openai-prompts"
import { AIProviderName, type AIProviderAdapter } from "@/lib/ai/providers/interface"
import type { PromptBuilder } from "@/lib/ai/providers/prompt-builder.interface"
import type { ResponseParser } from "@/lib/ai/providers/response-parser.interface"
import { ExponentialBackoffRetryStrategy, type RetryStrategy } from "@/lib/ai/retry-strategy"
import type { AIGenerationRequest, AIGenerationResponse } from "@/lib/ai/types"
import { canonicalSchemaASTSchema } from "@/lib/ast/schema"

/**
 * Same shape as {@link GeminiProviderDependencies}/{@link AnthropicProviderDependencies}
 * -- the DI seam established by S5-001, reused verbatim for a third
 * provider rather than inventing another parallel convention.
 */
export interface OpenAIProviderDependencies {
  /** Defaults to `getOpenAIClient()`'s lazily-constructed client (`lib/ai/client.ts`). */
  client?: OpenAI
  config?: typeof openaiConfig
  promptBuilder?: PromptBuilder<OpenAIPrompt>
  responseParser?: ResponseParser<ChatCompletion>
  retryStrategy?: RetryStrategy
}

// OpenAI's Structured Outputs (response_format: json_schema) is the third
// distinct output-forcing mechanism this codebase now supports (Gemini's
// responseJsonSchema, Anthropic's forced tool call). Non-strict (no
// `strict: true`): strict mode only supports a restricted JSON-Schema
// subset (every property required, additionalProperties: false
// everywhere), which canonicalSchemaASTSchema's optional fields don't
// satisfy without a schema-specific transform -- non-strict still
// constrains output via the same schema Gemini/Anthropic both reuse, and
// validateASTShape (lib/services/generation.service.ts) is the real
// conformance gate regardless of provider.
const AST_RESPONSE_FORMAT = {
  type: "json_schema" as const,
  json_schema: {
    name: "canonical_schema_ast",
    schema: z.toJSONSchema(canonicalSchemaASTSchema) as Record<string, unknown>,
  },
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Implements {@link AIProviderAdapter} for OpenAI: builds the prompt via
 * the injected {@link PromptBuilder}, requests schema-constrained JSON via
 * `response_format`, retries transient failures per the injected
 * {@link RetryStrategy}, and parses the result via the injected
 * {@link ResponseParser} -- the same DI/retry/parsing structure
 * `createGeminiProvider`/`createAnthropicProvider` established, reused
 * rather than duplicated (only the SDK call itself and its own error
 * mapping differ).
 */
export function createOpenAIProvider(deps: OpenAIProviderDependencies = {}): AIProviderAdapter {
  const config = deps.config ?? openaiConfig
  const promptBuilder = deps.promptBuilder ?? openaiPromptBuilder
  const responseParser = deps.responseParser ?? openaiResponseParser
  const retryStrategy = deps.retryStrategy ?? new ExponentialBackoffRetryStrategy()

  return {
    name: AIProviderName.OpenAI,

    async generateAST(request: AIGenerationRequest): Promise<AIGenerationResponse> {
      // Resolved here, not above -- see lib/ai/client.ts's comment on why
      // client construction must be deferred to actual use, not factory
      // construction (which happens for every registered provider on
      // every generation, per AIProviderRegistry). This is the provider
      // where deferring actually matters: OpenAI's own client constructor
      // throws immediately when no API key is configured.
      const client = deps.client ?? getOpenAIClient()
      const prompt = promptBuilder.build(request)

      let attempt = 0
      for (;;) {
        attempt++
        let response: ChatCompletion
        try {
          response = await client.chat.completions.create(
            {
              model: config.model,
              max_completion_tokens: config.maxTokens,
              messages: prompt.messages,
              response_format: AST_RESPONSE_FORMAT,
            },
            { timeout: config.requestTimeoutMs }
          )
        } catch (rawError) {
          const error = toAIProviderError(rawError, AIProviderName.OpenAI)
          if (retryStrategy.shouldRetry(error, attempt)) {
            await delay(retryStrategy.getDelayMs(attempt))
            continue
          }
          return { ok: false, error }
        }

        const result = responseParser.parse(response, AIProviderName.OpenAI)
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
 * response-envelope interpretation is {@link openaiResponseParser}'s job.
 * OpenAI's SDK exposes typed error classes directly (same shape as
 * Anthropic's), so this checks `instanceof` rather than a status code.
 * Re-throws anything not recognized as one of the SDK's own error
 * classes, matching `toAIProviderError`'s Gemini/Anthropic counterparts:
 * a genuinely unexpected error is a bug to surface loudly, not a category
 * to silently paper over.
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
