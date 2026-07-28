/**
 * Provider-agnostic request/response contract for AI schema generation.
 *
 * Every {@link AIProviderAdapter} implementation speaks this shape at its
 * boundary, regardless of the underlying SDK (Gemini today; Anthropic/
 * OpenAI later) — provider-specific request/response shapes never leak
 * past `lib/ai/providers/*`.
 */
import type { AIProviderError } from "@/lib/ai/errors"
import type { CanonicalSchemaAST } from "@/lib/ast/types"

/** Input to an {@link AIProviderAdapter}'s `generateAST` call. */
export interface AIGenerationRequest {
  /** The user's natural-language schema description. */
  prompt: string
  /**
   * Provider- or feature-specific extension data that doesn't belong in
   * the core contract (e.g. a future per-request model override). Opaque
   * to everything except the specific provider that understands a given
   * key — mirrors the same escape hatch `lib/compiler`'s
   * `CompilerOptions.extensions` already uses for the same reason.
   */
  extensions?: Record<string, unknown>
}

/** Non-functional metadata about how a successful generation was produced. */
export interface AIGenerationMetadata {
  /** Registry name of the provider that served this request (e.g. `"gemini"`). */
  provider: string
  /** The specific model identifier the provider used. */
  model: string
}

/** Result of an {@link AIProviderAdapter}'s `generateAST` call. */
export type AIGenerationResponse =
  | { ok: true; ast: CanonicalSchemaAST; metadata: AIGenerationMetadata }
  | { ok: false; error: AIProviderError }
