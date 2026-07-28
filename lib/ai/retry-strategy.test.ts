import { describe, expect, it } from "vitest"

import { AIAuthenticationError, AIRateLimitError } from "@/lib/ai/errors"
import { ExponentialBackoffRetryStrategy, NoRetryStrategy, type RetryStrategy } from "@/lib/ai/retry-strategy"

describe("ExponentialBackoffRetryStrategy", () => {
  it("defaults to 3 max attempts", () => {
    expect(new ExponentialBackoffRetryStrategy().maxAttempts).toBe(3)
  })

  it("retries a retryable error while under maxAttempts", () => {
    const strategy = new ExponentialBackoffRetryStrategy({ maxAttempts: 3 })
    const error = new AIRateLimitError({ message: "slow down", provider: "gemini" })

    expect(strategy.shouldRetry(error, 1)).toBe(true)
    expect(strategy.shouldRetry(error, 2)).toBe(true)
    expect(strategy.shouldRetry(error, 3)).toBe(false)
  })

  it("never retries a non-retryable error, regardless of attempt count", () => {
    const strategy = new ExponentialBackoffRetryStrategy({ maxAttempts: 5 })
    const error = new AIAuthenticationError({ message: "bad key", provider: "gemini" })

    expect(strategy.shouldRetry(error, 1)).toBe(false)
  })

  it("doubles the delay each attempt, capped at maxDelayMs", () => {
    const strategy = new ExponentialBackoffRetryStrategy({
      baseDelayMs: 100,
      maxDelayMs: 350,
    })

    expect(strategy.getDelayMs(1)).toBe(100)
    expect(strategy.getDelayMs(2)).toBe(200)
    expect(strategy.getDelayMs(3)).toBe(350) // would be 400, capped
    expect(strategy.getDelayMs(4)).toBe(350)
  })
})

describe("NoRetryStrategy", () => {
  it("never retries, even a retryable error on the first attempt", () => {
    const strategy: RetryStrategy = new NoRetryStrategy()
    const error = new AIRateLimitError({ message: "slow down", provider: "gemini" })

    expect(strategy.maxAttempts).toBe(1)
    expect(strategy.shouldRetry(error, 1)).toBe(false)
    expect(strategy.getDelayMs(1)).toBe(0)
  })
})
