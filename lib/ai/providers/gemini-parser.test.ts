import { FinishReason, type GenerateContentResponse } from "@google/genai"
import { describe, expect, it } from "vitest"

import { geminiResponseParser } from "@/lib/ai/providers/gemini-parser"

function fixture(overrides: Partial<GenerateContentResponse>): GenerateContentResponse {
  return {
    candidates: [{ finishReason: FinishReason.STOP }],
    text: '{"astVersion":"1.0.0","tables":[]}',
    ...overrides,
  } as GenerateContentResponse
}

describe("geminiResponseParser", () => {
  it("parses a normal STOP-finished response into a successful AIGenerationResponse", () => {
    const result = geminiResponseParser.parse(fixture({}), "gemini")

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.ast).toEqual({ astVersion: "1.0.0", tables: [] })
      expect(result.metadata.provider).toBe("gemini")
    }
  })

  it("uses the response's modelVersion when present", () => {
    const result = geminiResponseParser.parse(fixture({ modelVersion: "gemini-2.5-flash" }), "gemini")

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.metadata.model).toBe("gemini-2.5-flash")
    }
  })

  it("falls back to 'unknown' when modelVersion is absent", () => {
    const result = geminiResponseParser.parse(fixture({}), "gemini")

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.metadata.model).toBe("unknown")
    }
  })

  it("returns a non-retryable AIContentBlockedError when the prompt was blocked", () => {
    const result = geminiResponseParser.parse(
      fixture({ promptFeedback: { blockReason: "SAFETY" } as never }),
      "gemini"
    )

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error.code).toBe("CONTENT_BLOCKED")
      expect(result.error.retryable).toBe(false)
    }
  })

  it("returns a retryable AIResponseFormatError when the response was cut off (MAX_TOKENS)", () => {
    const result = geminiResponseParser.parse(
      fixture({ candidates: [{ finishReason: FinishReason.MAX_TOKENS }] }),
      "gemini"
    )

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error.code).toBe("RESPONSE_FORMAT")
      expect(result.error.retryable).toBe(true)
    }
  })

  it("returns a non-retryable AIContentBlockedError for any other non-STOP finish reason", () => {
    const result = geminiResponseParser.parse(
      fixture({ candidates: [{ finishReason: FinishReason.SAFETY }] }),
      "gemini"
    )

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error.code).toBe("CONTENT_BLOCKED")
    }
  })

  it("returns a retryable AIResponseFormatError when the response has no text", () => {
    const result = geminiResponseParser.parse(fixture({ text: undefined }), "gemini")

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error.code).toBe("RESPONSE_FORMAT")
      expect(result.error.retryable).toBe(true)
    }
  })

  it("returns a retryable AIResponseFormatError when the text isn't valid JSON", () => {
    const result = geminiResponseParser.parse(fixture({ text: "not json" }), "gemini")

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error.code).toBe("RESPONSE_FORMAT")
      expect(result.error.cause).toBeInstanceOf(Error)
    }
  })
})
