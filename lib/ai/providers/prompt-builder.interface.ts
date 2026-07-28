/**
 * Per-provider prompt construction, factored out of the provider itself.
 *
 * Each provider's request shape is genuinely different (Gemini's
 * `Content[]` message array vs. a future Anthropic/OpenAI messages
 * array) — this interface exists so that difference is isolated to one
 * small, independently testable module per provider (e.g.
 * `gemini-prompts.ts`) instead of being inlined into the provider's own
 * `generateAST` method alongside the actual API call.
 */
import type { AIGenerationRequest } from "@/lib/ai/types"

export interface PromptBuilder<TPrompt> {
  /** Build the provider-specific prompt payload for the given request. */
  build(request: AIGenerationRequest): TPrompt
}
