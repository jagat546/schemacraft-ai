/**
 * Per-provider response interpretation, factored out of the provider itself.
 *
 * Interpreting a provider's raw SDK response envelope (blocked/declined,
 * cut off, malformed JSON, or a genuine `CanonicalSchemaAST`) is
 * provider-specific in the same way prompt construction is (see
 * {@link PromptBuilder}) — this interface isolates that logic into one
 * small, independently testable module per provider (e.g.
 * `gemini-parser.ts`), returning the shared, provider-agnostic
 * {@link AIGenerationResponse} shape every caller actually consumes.
 *
 * Deliberately does not shape-validate the parsed AST against
 * `CanonicalSchemaAST` — that remains `validateASTShape`'s job
 * (`lib/ast/validator.ts`), called explicitly by
 * `lib/services/generation.service.ts` as its own pipeline stage, so "the
 * AI call itself failed" and "the AI returned JSON that isn't a valid
 * AST" stay genuinely distinct failure categories.
 */
import type { AIGenerationResponse } from "@/lib/ai/types"

export interface ResponseParser<TResponse> {
  /**
   * Interpret a provider's raw response into the shared response shape.
   * `provider` is the registry name of the calling provider, threaded
   * through so a successful result's `metadata.provider` is set without
   * this parser needing to hard-code it itself.
   */
  parse(response: TResponse, provider: string): AIGenerationResponse
}
