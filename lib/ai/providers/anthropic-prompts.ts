import "server-only"

import type { MessageParam } from "@anthropic-ai/sdk/resources/messages"

import { buildSharedAstInstructions } from "@/lib/ai/ast-prompt-instructions"
import type { PromptBuilder } from "@/lib/ai/providers/prompt-builder.interface"

// Anthropic-specific prompt construction. Unlike Gemini (which asks for
// raw JSON text via responseMimeType + a free-text parse), this provider
// forces structured output via Anthropic's tool-use mechanism (see
// anthropic.ts's AST_TOOL_NAME/AST_TOOL_INPUT_SCHEMA and its
// tool_choice) — the model doesn't need to be told "return only JSON,
// no markdown" the way Gemini's prompt does, because the tool call
// itself is the output contract. Only the shared database-design
// instructions (lib/ai/ast-prompt-instructions.ts) are reused; the
// output-forcing framing genuinely differs per provider's own mechanism,
// which is why each provider still has its own small prompt-builder file.

/** Anthropic's own request shape: a system string plus a `MessageParam[]` conversation. */
export interface AnthropicPrompt {
  system: string
  messages: MessageParam[]
}

/**
 * Builds the {@link AnthropicPrompt} for a given `AIGenerationRequest`.
 * `request.extensions` is not currently consumed — same reserved escape
 * hatch as {@link geminiPromptBuilder}.
 */
export const anthropicPromptBuilder: PromptBuilder<AnthropicPrompt> = {
  build(request) {
    return {
      system: buildSharedAstInstructions(),
      messages: [{ role: "user", content: request.prompt }],
    }
  },
}
