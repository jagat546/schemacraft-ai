import { describe, expect, it } from "vitest"

import {
  AIAuthenticationError,
  AIContentBlockedError,
  AIProviderError,
  AIRateLimitError,
  AIResponseFormatError,
  AITimeoutError,
  AIUnknownError,
} from "@/lib/ai/errors"

describe("AIProviderError subclasses", () => {
  it("AIAuthenticationError is a non-retryable AIProviderError with the AUTHENTICATION code", () => {
    const error = new AIAuthenticationError({ message: "bad key", provider: "gemini" })
    expect(error).toBeInstanceOf(AIProviderError)
    expect(error.code).toBe("AUTHENTICATION")
    expect(error.retryable).toBe(false)
    expect(error.provider).toBe("gemini")
    expect(error.message).toBe("bad key")
    expect(error.name).toBe("AIAuthenticationError")
  })

  it("AIRateLimitError is retryable with the RATE_LIMITED code", () => {
    const error = new AIRateLimitError({ message: "slow down", provider: "gemini" })
    expect(error.code).toBe("RATE_LIMITED")
    expect(error.retryable).toBe(true)
  })

  it("AITimeoutError is retryable with the TIMEOUT code", () => {
    const error = new AITimeoutError({ message: "timed out", provider: "gemini" })
    expect(error.code).toBe("TIMEOUT")
    expect(error.retryable).toBe(true)
  })

  it("AIContentBlockedError is non-retryable with the CONTENT_BLOCKED code", () => {
    const error = new AIContentBlockedError({ message: "declined", provider: "gemini" })
    expect(error.code).toBe("CONTENT_BLOCKED")
    expect(error.retryable).toBe(false)
  })

  it("AIResponseFormatError is retryable with the RESPONSE_FORMAT code", () => {
    const error = new AIResponseFormatError({ message: "bad shape", provider: "gemini" })
    expect(error.code).toBe("RESPONSE_FORMAT")
    expect(error.retryable).toBe(true)
  })

  it("AIUnknownError is non-retryable with the UNKNOWN code", () => {
    const error = new AIUnknownError({ message: "?", provider: "gemini" })
    expect(error.code).toBe("UNKNOWN")
    expect(error.retryable).toBe(false)
  })

  it("preserves the original cause for logging, without exposing it as part of the message", () => {
    const original = new Error("raw SDK failure")
    const error = new AIUnknownError({ message: "safe message", provider: "gemini", cause: original })
    expect(error.cause).toBe(original)
    expect(error.message).toBe("safe message")
  })
})
