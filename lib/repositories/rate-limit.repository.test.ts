import { describe, expect, it } from "vitest"

import {
  formatRateLimitRetryMessage,
  resolveRateLimitOutcome,
} from "@/lib/repositories/rate-limit.repository"

describe("resolveRateLimitOutcome", () => {
  it("returns ALLOWED when the RPC reports allowed with no error", () => {
    expect(
      resolveRateLimitOutcome({ data: { allowed: true, retry_after_seconds: null }, error: null })
    ).toEqual({ status: "ALLOWED" })
  })

  it("returns RATE_LIMITED with a retry estimate when the RPC reports not allowed with no error", () => {
    expect(
      resolveRateLimitOutcome({
        data: { allowed: false, retry_after_seconds: 42 },
        error: null,
      })
    ).toEqual({ status: "RATE_LIMITED", retryAfterSeconds: 42 })
  })

  it("returns UNAVAILABLE (fails closed) when the RPC call itself errors, even if data looks allowed", () => {
    expect(
      resolveRateLimitOutcome({
        data: { allowed: true, retry_after_seconds: null },
        error: new Error("connection reset"),
      })
    ).toEqual({ status: "UNAVAILABLE" })
  })

  it("returns UNAVAILABLE when the RPC call errors and data is null", () => {
    expect(resolveRateLimitOutcome({ data: null, error: new Error("timeout") })).toEqual({
      status: "UNAVAILABLE",
    })
  })

  it("returns UNAVAILABLE when there's no error but the RPC returned no data", () => {
    expect(resolveRateLimitOutcome({ data: null, error: null })).toEqual({ status: "UNAVAILABLE" })
  })
})

describe("formatRateLimitRetryMessage", () => {
  it("gives a generic message when there's no retry estimate", () => {
    expect(formatRateLimitRetryMessage(null)).toBe(
      "You've reached the generation limit for now. Please try again later."
    )
  })

  it("gives a generic message when the estimate is zero or negative", () => {
    expect(formatRateLimitRetryMessage(0)).toBe(
      "You've reached the generation limit for now. Please try again later."
    )
    expect(formatRateLimitRetryMessage(-5)).toBe(
      "You've reached the generation limit for now. Please try again later."
    )
  })

  it("reports whole seconds under a minute, with correct pluralization", () => {
    expect(formatRateLimitRetryMessage(1)).toBe(
      "You've reached the generation limit for now. Try again in about 1 second."
    )
    expect(formatRateLimitRetryMessage(42)).toBe(
      "You've reached the generation limit for now. Try again in about 42 seconds."
    )
  })

  it("reports whole minutes (rounded up) at or beyond a minute, with correct pluralization", () => {
    expect(formatRateLimitRetryMessage(60)).toBe(
      "You've reached the generation limit for now. Try again in about 1 minute."
    )
    expect(formatRateLimitRetryMessage(90)).toBe(
      "You've reached the generation limit for now. Try again in about 2 minutes."
    )
    expect(formatRateLimitRetryMessage(3600)).toBe(
      "You've reached the generation limit for now. Try again in about 60 minutes."
    )
  })
})
