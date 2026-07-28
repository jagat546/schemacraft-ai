/**
 * The contract every AI provider must satisfy.
 *
 * A provider's only responsibility is producing a `CanonicalSchemaAST`
 * from a prompt — it never produces SQL, a Drizzle model, sample JSON,
 * or any other dialect-specific artifact directly. Turning an AST into a
 * concrete artifact is a separate, deterministic step (see
 * `lib/compiler`).
 *
 * Implementations live under `lib/ai/providers/` (`gemini.ts` is the
 * first) and are constructed via a factory function (e.g.
 * `createGeminiProvider`), never instantiated directly by callers —
 * register a constructed instance with `AIProviderRegistry`
 * (`lib/ai/provider-registry.ts`) instead of importing a concrete
 * provider module elsewhere in the app.
 */
import type { AIGenerationRequest, AIGenerationResponse } from "@/lib/ai/types"

export interface AIProviderAdapter {
  /**
   * Registry key for this provider (e.g. `"gemini"`) — see
   * {@link AIProviderName} for the full set of known names. Used by
   * {@link AIProviderRegistry} for lookup and included in a successful
   * response's `metadata.provider`.
   */
  readonly name: string
  /** Produce a `CanonicalSchemaAST` from the given request. */
  generateAST(request: AIGenerationRequest): Promise<AIGenerationResponse>
}

/**
 * Known provider registry names, as a const object rather than a TS
 * `enum` — matches this codebase's existing convention
 * (`lib/compiler/types.ts`'s `CompilerId`). Only `Gemini` has an actual
 * implementation today; the others are reserved names for S5-002/S5-003
 * so every provider's key is defined in one place from the start.
 */
export const AIProviderName = {
  Gemini: "gemini",
  Anthropic: "anthropic",
  OpenAI: "openai",
} as const
export type AIProviderName = (typeof AIProviderName)[keyof typeof AIProviderName]
