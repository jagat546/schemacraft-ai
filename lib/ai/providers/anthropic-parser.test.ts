import type { Message } from "@anthropic-ai/sdk/resources/messages"
import { describe, expect, it } from "vitest"

import { ANTHROPIC_AST_TOOL_NAME, anthropicResponseParser } from "@/lib/ai/providers/anthropic-parser"

const AST_INPUT = { astVersion: "1.0.0", tables: [] }

function fixture(overrides: Partial<Message>): Message {
  return {
    model: "claude-sonnet-5",
    stop_reason: "tool_use",
    content: [
      {
        type: "tool_use",
        id: "tool_1",
        name: ANTHROPIC_AST_TOOL_NAME,
        input: AST_INPUT,
        caller: { type: "direct" },
      },
    ],
    ...overrides,
  } as Message
}

describe("anthropicResponseParser", () => {
  it("parses a tool_use response into a successful AIGenerationResponse", () => {
    const result = anthropicResponseParser.parse(fixture({}), "anthropic")

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.ast).toEqual(AST_INPUT)
      expect(result.metadata).toEqual({ provider: "anthropic", model: "claude-sonnet-5" })
    }
  })

  it("returns a non-retryable AIContentBlockedError when stop_reason is 'refusal'", () => {
    const result = anthropicResponseParser.parse(fixture({ stop_reason: "refusal" }), "anthropic")

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error.code).toBe("CONTENT_BLOCKED")
      expect(result.error.retryable).toBe(false)
    }
  })

  it("returns a retryable AIResponseFormatError when stop_reason is 'max_tokens'", () => {
    const result = anthropicResponseParser.parse(fixture({ stop_reason: "max_tokens" }), "anthropic")

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error.code).toBe("RESPONSE_FORMAT")
      expect(result.error.retryable).toBe(true)
    }
  })

  it("returns a retryable AIResponseFormatError for any other non-tool_use stop_reason", () => {
    const result = anthropicResponseParser.parse(fixture({ stop_reason: "end_turn" }), "anthropic")

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error.code).toBe("RESPONSE_FORMAT")
    }
  })

  it("returns a retryable AIResponseFormatError when no matching tool_use block is present", () => {
    const result = anthropicResponseParser.parse(fixture({ content: [] }), "anthropic")

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error.code).toBe("RESPONSE_FORMAT")
    }
  })

  it("ignores a tool_use block for a different tool name", () => {
    const result = anthropicResponseParser.parse(
      fixture({
        content: [
          {
            type: "tool_use",
            id: "tool_2",
            name: "some_other_tool",
            input: {},
            caller: { type: "direct" },
          },
        ],
      }),
      "anthropic"
    )

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error.code).toBe("RESPONSE_FORMAT")
    }
  })
})
