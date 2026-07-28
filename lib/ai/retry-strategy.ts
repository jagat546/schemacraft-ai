/**
 * Retry policy abstraction for AI provider calls.
 *
 * A provider implementation (`lib/ai/providers/*`) owns *when* it calls
 * into this — the strategy itself is pure decision logic with no
 * knowledge of HTTP, SDKs, or timers, so it can be unit-tested directly
 * and swapped independently of any provider.
 */
import type { AIProviderError } from "@/lib/ai/errors"

/** A policy deciding whether, and how long to wait, to retry a failed AI call. */
export interface RetryStrategy {
  /** Maximum number of attempts (including the first), never fewer than 1. */
  readonly maxAttempts: number
  /**
   * Whether attempt number `attempt` (1-indexed, the attempt that just
   * failed with `error`) should be followed by another attempt.
   */
  shouldRetry(error: AIProviderError, attempt: number): boolean
  /** Delay in milliseconds to wait before the next attempt after `attempt`. */
  getDelayMs(attempt: number): number
}

/** Constructor options for {@link ExponentialBackoffRetryStrategy}. */
export interface ExponentialBackoffOptions {
  /** Maximum number of attempts, including the first. Defaults to 3. */
  maxAttempts?: number
  /** Delay before the second attempt, in milliseconds. Defaults to 500. */
  baseDelayMs?: number
  /** Upper bound on any single delay, in milliseconds. Defaults to 8000. */
  maxDelayMs?: number
}

/**
 * Doubles the delay after each attempt, capped at `maxDelayMs`, and only
 * ever retries an error whose {@link AIProviderError.retryable} flag is
 * `true` — this strategy makes no independent judgment about which
 * failure categories deserve a retry; that decision lives once, on the
 * error class itself (`lib/ai/errors.ts`), not duplicated here.
 */
export class ExponentialBackoffRetryStrategy implements RetryStrategy {
  readonly maxAttempts: number
  private readonly baseDelayMs: number
  private readonly maxDelayMs: number

  constructor(options: ExponentialBackoffOptions = {}) {
    this.maxAttempts = options.maxAttempts ?? 3
    this.baseDelayMs = options.baseDelayMs ?? 500
    this.maxDelayMs = options.maxDelayMs ?? 8000
  }

  shouldRetry(error: AIProviderError, attempt: number): boolean {
    return error.retryable && attempt < this.maxAttempts
  }

  getDelayMs(attempt: number): number {
    return Math.min(this.baseDelayMs * 2 ** (attempt - 1), this.maxDelayMs)
  }
}

/**
 * Never retries. The explicit "opt out" strategy — useful for tests and
 * for any future caller that wants exactly one attempt regardless of a
 * provider's default.
 */
export class NoRetryStrategy implements RetryStrategy {
  readonly maxAttempts = 1

  shouldRetry(): boolean {
    return false
  }

  getDelayMs(): number {
    return 0
  }
}
