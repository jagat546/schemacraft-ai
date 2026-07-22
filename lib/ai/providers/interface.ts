import type { CanonicalSchemaAST } from "@/lib/ast/types"

// The contract every AI provider must satisfy. A provider's only
// responsibility is producing a CanonicalSchemaAST from a prompt — it
// never produces SQL, a Drizzle model, sample JSON, or any other
// dialect-specific artifact directly. Turning an AST into a concrete
// artifact is a separate, deterministic step (see lib/compiler).
//
// lib/ai/providers/gemini.ts (geminiProvider) is the current, and only,
// implementation of this interface.

export interface GenerateASTInput {
  prompt: string
  extensions?: Record<string, unknown>
}

export type GenerateASTResult =
  | { ok: true; ast: CanonicalSchemaAST }
  | { ok: false; error: string }

export interface AIProviderAdapter {
  generateAST(input: GenerateASTInput): Promise<GenerateASTResult>
}
