import "server-only"

import { ApiError, type GenerateContentResponse, type GoogleGenAI } from "@google/genai"
import { z } from "zod"

import { getGenAIClient } from "@/lib/ai/client"
import { aiConfig } from "@/lib/ai/config"
import { AIAuthenticationError, AIRateLimitError, AITimeoutError, AIUnknownError } from "@/lib/ai/errors"
import { geminiPromptBuilder, type GeminiPrompt } from "@/lib/ai/providers/gemini-prompts"
import { geminiResponseParser } from "@/lib/ai/providers/gemini-parser"
import { AIProviderName, type AIProviderAdapter } from "@/lib/ai/providers/interface"
import type { PromptBuilder } from "@/lib/ai/providers/prompt-builder.interface"
import type { ResponseParser } from "@/lib/ai/providers/response-parser.interface"
import { ExponentialBackoffRetryStrategy, type RetryStrategy } from "@/lib/ai/retry-strategy"
import { canonicalSchemaASTSchema } from "@/lib/ast/schema"
import type { AIGenerationRequest, AIGenerationResponse } from "@/lib/ai/types"

/**
 * Constructor dependencies for {@link createGeminiProvider}, every one
 * optional and defaulted — the dependency-injection seam S5-001 exists
 * to establish. A test (or a future caller needing different behavior,
 * e.g. no retries) constructs its own instance with overrides instead of
 * this module exporting a single hard-wired singleton.
 */
export interface GeminiProviderDependencies {
  /** Defaults to `getGenAIClient()`'s lazily-constructed client (`lib/ai/client.ts`). */
  client?: GoogleGenAI
  /** Defaults to `aiConfig` (`lib/ai/config.ts`). */
  config?: typeof aiConfig
  /** Defaults to {@link geminiPromptBuilder}. */
  promptBuilder?: PromptBuilder<GeminiPrompt>
  /** Defaults to {@link geminiResponseParser}. */
  responseParser?: ResponseParser<GenerateContentResponse>
  /**
   * Defaults to a 3-attempt {@link ExponentialBackoffRetryStrategy}.
   * Only ever retries errors the error class itself marks `retryable`
   * (rate limits, timeouts, malformed responses) — see `lib/ai/errors.ts`.
   * This is a deliberate, disclosed behavior addition over the
   * pre-S5-001 implementation, which never retried anything.
   */
  retryStrategy?: RetryStrategy
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Implements {@link AIProviderAdapter} for Gemini: builds the prompt via
 * the injected {@link PromptBuilder}, requests structured JSON
 * constrained to the `CanonicalSchemaAST` shape, retries transient
 * failures per the injected {@link RetryStrategy}, and parses the result
 * via the injected {@link ResponseParser}. Generates only an AST — never
 * SQL, a Drizzle model, sample JSON, docs, or a diagram directly; those
 * are compiler concerns (`lib/compiler`), not this provider's.
 */
export function createGeminiProvider(deps: GeminiProviderDependencies = {}): AIProviderAdapter {
  const config = deps.config ?? aiConfig
  const promptBuilder = deps.promptBuilder ?? geminiPromptBuilder
  const responseParser = deps.responseParser ?? geminiResponseParser
  const retryStrategy = deps.retryStrategy ?? new ExponentialBackoffRetryStrategy()

  return {
    name: AIProviderName.Gemini,

    async generateAST(request: AIGenerationRequest): Promise<AIGenerationResponse> {
      // Resolved here, not above: constructing the real client validates
      // credentials for some SDKs (see lib/ai/client.ts's own comment) --
      // this must only happen once a generation actually runs through
      // this specific provider, never merely because it was registered.
      const client = deps.client ?? getGenAIClient()
      const prompt = promptBuilder.build(request)

      let attempt = 0
      for (;;) {
        attempt++
        let response: GenerateContentResponse
        try {
          response = await client.models.generateContent({
            model: config.model,
            contents: prompt.messages,
            config: {
              systemInstruction: prompt.systemInstruction,
              maxOutputTokens: config.maxTokens,
              // No thinkingConfig: config.model is an alias Google can
              // repoint to a model that rejects thinkingConfig entirely
              // (confirmed: "gemini-flash-latest" 400s on thinkingBudget: 0,
              // even 0/"disabled"). Omitting it lets each underlying model
              // use its own default, at the cost of not being able to
              // force thinking off for latency/cost on models that do
              // support it.
              responseMimeType: "application/json",
              responseJsonSchema: z.toJSONSchema(canonicalSchemaASTSchema),
              httpOptions: { timeout: config.requestTimeoutMs },
            },
          })
        } catch (rawError) {
          const error = toAIProviderError(rawError, AIProviderName.Gemini)
          if (retryStrategy.shouldRetry(error, attempt)) {
            await delay(retryStrategy.getDelayMs(attempt))
            continue
          }
          return { ok: false, error }
        }

        const result = responseParser.parse(response, AIProviderName.Gemini)
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
 * response-envelope interpretation (blocked, cut off, unparseable) is
 * {@link geminiResponseParser}'s job. Re-throws anything not recognized
 * as a Gemini `ApiError` or an `AbortError`, matching this function's
 * pre-S5-001 behavior exactly: a genuinely unexpected error is a bug to
 * surface loudly, not a category to silently paper over.
 */
function toAIProviderError(error: unknown, provider: string) {
  if (error instanceof ApiError) {
    if (error.status === 401 || error.status === 403) {
      return new AIAuthenticationError({
        message: "Server is misconfigured. Please contact the administrator.",
        provider,
        cause: error,
      })
    }
    if (error.status === 429) {
      return new AIRateLimitError({
        message: "Too many requests right now. Please try again shortly.",
        provider,
        cause: error,
      })
    }
    return new AIUnknownError({
      message: "The AI service returned an error. Please try again.",
      provider,
      cause: error,
    })
  }
  if (error instanceof Error && error.name === "AbortError") {
    return new AITimeoutError({
      message: "The request timed out or the network failed. Please try again.",
      provider,
      cause: error,
    })
  }
  throw error
}
