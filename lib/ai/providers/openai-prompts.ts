import "server-only"

import type { ChatCompletionMessageParam } from "openai/resources/chat/completions"

import { buildSharedAstInstructions } from "@/lib/ai/ast-prompt-instructions"
import type { PromptBuilder } from "@/lib/ai/providers/prompt-builder.interface"

// OpenAI-specific prompt construction. Unlike Gemini/Anthropic (which both
// take a separate top-level system-instruction parameter), the Chat
// Completions API has no such parameter -- the system prompt is just the
// first message in the array, with role: "system". Structured output is
// forced via response_format: { type: "json_schema", ... } (see
// openai.ts), the third distinct output-forcing mechanism this codebase
// now supports (Gemini's responseJsonSchema, Anthropic's forced tool
// call, OpenAI's response_format) -- each provider's own small
// prompt-builder file exists exactly to isolate this kind of difference.

/** OpenAI's own request shape: a single message array (system message first). */
export interface OpenAIPrompt {
  messages: ChatCompletionMessageParam[]
}

/**
 * Builds the {@link OpenAIPrompt} for a given `AIGenerationRequest`.
 * `request.extensions` is not currently consumed — same reserved escape
 * hatch as {@link geminiPromptBuilder}/{@link anthropicPromptBuilder}.
 */
export const openaiPromptBuilder: PromptBuilder<OpenAIPrompt> = {
  build(request) {
    return {
      messages: [
        { role: "system", content: buildSharedAstInstructions() },
        { role: "user", content: request.prompt },
      ],
    }
  },
}
