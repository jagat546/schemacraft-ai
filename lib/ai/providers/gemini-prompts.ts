import "server-only"

import type { Content } from "@google/genai"

import { buildSharedAstInstructions } from "@/lib/ai/ast-prompt-instructions"
import type { PromptBuilder } from "@/lib/ai/providers/prompt-builder.interface"

// Gemini-specific prompt construction for AST generation. This replaces
// the old (deleted) lib/ai/prompts.ts, which asked the model to produce
// SQL, Drizzle, JSON, docs, and a Mermaid diagram directly in one
// response — that contract no longer exists. The model's only job now is
// to produce a single CanonicalSchemaAST; every other artifact is
// compiled from it deterministically (see lib/compiler). The new,
// unrelated lib/ai/ast-prompt-instructions.ts (S5-002) deliberately
// avoids that old filename to prevent exactly this kind of confusion.
//
// Lives under lib/ai/providers/ rather than lib/ai/ because *this*
// module's own remaining content (the output-contract framing below) is
// a Gemini-specific implementation detail, unlike the shared instructions
// it now imports — Anthropic's own prompt builder
// (anthropic-prompts.ts) uses a different output-forcing mechanism
// (a forced tool call) and doesn't need this section at all.

function outputContractSection(): string {
  return "Return only the CanonicalSchemaAST JSON object — no explanation, no markdown formatting, no text outside the JSON."
}

function buildSystemPrompt(): string {
  return [buildSharedAstInstructions(), outputContractSection()].join("\n\n")
}

/** Gemini's own request shape: a system instruction plus a `Content[]` message array. */
export interface GeminiPrompt {
  systemInstruction: string
  messages: Content[]
}

/**
 * Full JSDoc per S5-001: builds the {@link GeminiPrompt} for a given
 * {@link AIGenerationRequest}. `request.extensions` is not currently
 * consumed — reserved for future per-request overrides, mirroring
 * `lib/compiler`'s `CompilerOptions.extensions` escape hatch.
 */
export const geminiPromptBuilder: PromptBuilder<GeminiPrompt> = {
  build(request) {
    return {
      systemInstruction: buildSystemPrompt(),
      messages: [{ role: "user", parts: [{ text: request.prompt }] }],
    }
  },
}
