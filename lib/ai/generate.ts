import "server-only"

import { z } from "zod"

import { aiConfig } from "@/lib/config"
import { genAI } from "@/lib/ai/client"
import { buildMessages, SYSTEM_PROMPT } from "@/lib/ai/prompts"
import { generatedSchemaSchema } from "@/types/schema"

export function callGemini(prompt: string) {
  return genAI.models.generateContent({
    model: aiConfig.model,
    contents: buildMessages(prompt),
    config: {
      systemInstruction: SYSTEM_PROMPT,
      maxOutputTokens: aiConfig.maxTokens,
      thinkingConfig: { thinkingBudget: 0 },
      responseMimeType: "application/json",
      responseJsonSchema: z.toJSONSchema(generatedSchemaSchema),
      httpOptions: { timeout: aiConfig.requestTimeoutMs },
    },
  })
}
