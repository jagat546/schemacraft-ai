import { describe, expect, it } from "vitest"

import { resolveRateLimitOutcome } from "@/lib/repositories/rate-limit.repository"

describe("resolveRateLimitOutcome", () => {
  it("returns ALLOWED when the RPC reports allowed with no error", () => {
    expect(resolveRateLimitOutcome({ allowed: true, error: null })).toBe("ALLOWED")
  })

  it("returns RATE_LIMITED when the RPC reports not allowed with no error", () => {
    expect(resolveRateLimitOutcome({ allowed: false, error: null })).toBe("RATE_LIMITED")
  })

  it("returns UNAVAILABLE (fails closed) when the RPC call itself errors, even if allowed looks truthy", () => {
    expect(resolveRateLimitOutcome({ allowed: true, error: new Error("connection reset") })).toBe(
      "UNAVAILABLE"
    )
  })

  it("returns UNAVAILABLE when the RPC call errors and allowed is null", () => {
    expect(resolveRateLimitOutcome({ allowed: null, error: new Error("timeout") })).toBe(
      "UNAVAILABLE"
    )
  })
})
