import type { ChatCompletion } from "openai/resources/chat/completions"
import { describe, expect, it } from "vitest"

import { openaiResponseParser } from "@/lib/ai/providers/openai-parser"

const AST_JSON = '{"astVersion":"1.0.0","tables":[]}'

function fixture(overrides: Partial<ChatCompletion.Choice>): ChatCompletion {
  return {
    model: "gpt-4.1",
    choices: [
      {
        index: 0,
        finish_reason: "stop",
        logprobs: null,
        message: { role: "assistant", content: AST_JSON, refusal: null },
        ...overrides,
      },
    ],
  } as ChatCompletion
}

describe("openaiResponseParser", () => {
  it("parses a normal stop-finished response into a successful AIGenerationResponse", () => {
    const result = openaiResponseParser.parse(fixture({}), "openai")

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.ast).toEqual({ astVersion: "1.0.0", tables: [] })
      expect(result.metadata).toEqual({ provider: "openai", model: "gpt-4.1" })
    }
  })

  it("returns a non-retryable AIContentBlockedError when the message carries a refusal", () => {
    const result = openaiResponseParser.parse(
      fixture({ message: { role: "assistant", content: null, refusal: "I can't help with that." } }),
      "openai"
    )

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error.code).toBe("CONTENT_BLOCKED")
      expect(result.error.retryable).toBe(false)
    }
  })

  it("returns a non-retryable AIContentBlockedError when finish_reason is 'content_filter'", () => {
    const result = openaiResponseParser.parse(fixture({ finish_reason: "content_filter" }), "openai")

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error.code).toBe("CONTENT_BLOCKED")
    }
  })

  it("returns a retryable AIResponseFormatError when finish_reason is 'length'", () => {
    const result = openaiResponseParser.parse(fixture({ finish_reason: "length" }), "openai")

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error.code).toBe("RESPONSE_FORMAT")
      expect(result.error.retryable).toBe(true)
    }
  })

  it("returns a retryable AIResponseFormatError for any other non-stop finish_reason", () => {
    const result = openaiResponseParser.parse(fixture({ finish_reason: "tool_calls" }), "openai")

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error.code).toBe("RESPONSE_FORMAT")
    }
  })

  it("returns a retryable AIResponseFormatError when content is empty", () => {
    const result = openaiResponseParser.parse(
      fixture({ message: { role: "assistant", content: "", refusal: null } }),
      "openai"
    )

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error.code).toBe("RESPONSE_FORMAT")
    }
  })

  it("returns a retryable AIResponseFormatError when content isn't valid JSON", () => {
    const result = openaiResponseParser.parse(
      fixture({ message: { role: "assistant", content: "not json", refusal: null } }),
      "openai"
    )

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error.code).toBe("RESPONSE_FORMAT")
      expect(result.error.cause).toBeInstanceOf(Error)
    }
  })
})
