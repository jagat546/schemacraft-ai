/**
 * Typed error hierarchy for AI provider failures.
 *
 * Every provider implementation (`lib/ai/providers/*`) must translate its
 * own SDK's error shape into one of these classes before returning it as
 * part of an {@link AIGenerationResponse} — never a bare string, and never
 * the raw SDK error. This is what lets provider-agnostic code (the retry
 * strategy, the provider registry, `lib/services/generation.service.ts`)
 * reason about a failure's category and retryability without knowing
 * anything about which provider produced it.
 *
 * `retryable` is a property of the error *category*, not a judgment call
 * made per call site — see each subclass for the reasoning behind its
 * fixed value. A {@link RetryStrategy} (`lib/ai/retry-strategy.ts`) reads
 * this flag; it never re-derives retryability itself.
 */

/** Stable machine-readable category for an {@link AIProviderError}. */
export type AIErrorCode =
  | "AUTHENTICATION"
  | "RATE_LIMITED"
  | "TIMEOUT"
  | "CONTENT_BLOCKED"
  | "RESPONSE_FORMAT"
  | "UNKNOWN"

/** Constructor input for {@link AIProviderError} and its subclasses. */
export interface AIProviderErrorInit {
  /** Human-readable, user-safe message (never leaks provider internals or secrets). */
  message: string
  /** Name of the provider that raised this error (e.g. `"gemini"`), for logging/diagnostics. */
  provider: string
  /** The original SDK error/exception, if any, kept only for logging — never serialized to the client. */
  cause?: unknown
}

/**
 * Base class for every AI provider failure. Never thrown directly —
 * always one of the named subclasses below, so a `catch`/`instanceof`
 * check (or a `switch` on `.code`) can distinguish categories without
 * string-matching a message.
 */
export abstract class AIProviderError extends Error {
  abstract readonly code: AIErrorCode
  /**
   * Whether a {@link RetryStrategy} should consider retrying this failure.
   * Fixed per subclass — see each one's own doc comment for the reasoning.
   */
  abstract readonly retryable: boolean
  readonly provider: string

  constructor(init: AIProviderErrorInit) {
    super(init.message, init.cause !== undefined ? { cause: init.cause } : undefined)
    this.name = new.target.name
    this.provider = init.provider
  }
}

/**
 * Credentials rejected or missing (e.g. an invalid/expired API key).
 * Never retryable: retrying with the same credentials fails identically,
 * and this is very likely a server misconfiguration, not something a
 * user prompt retry could ever fix.
 */
export class AIAuthenticationError extends AIProviderError {
  readonly code = "AUTHENTICATION" as const
  readonly retryable = false
}

/**
 * The provider's rate limit was hit. Retryable — this is exactly the
 * transient condition retry-with-backoff exists for.
 */
export class AIRateLimitError extends AIProviderError {
  readonly code = "RATE_LIMITED" as const
  readonly retryable = true
}

/**
 * The request timed out or the network failed before a response arrived.
 * Retryable — most timeouts are transient network/load conditions, not a
 * property of the specific prompt.
 */
export class AITimeoutError extends AIProviderError {
  readonly code = "TIMEOUT" as const
  readonly retryable = true
}

/**
 * The provider declined to answer (safety filters, policy rejection).
 * Never retryable: the same prompt will be declined again — the fix is
 * the user rephrasing their input, not an automatic retry.
 */
export class AIContentBlockedError extends AIProviderError {
  readonly code = "CONTENT_BLOCKED" as const
  readonly retryable = false
}

/**
 * The provider responded, but the response couldn't be interpreted as
 * the expected shape (truncated output, unparseable JSON, an unexpected
 * envelope). Retryable — AI responses are non-deterministic, so a fresh
 * call has a genuine chance of producing a well-formed response even
 * with an unchanged prompt, unlike a deterministic parsing bug would.
 */
export class AIResponseFormatError extends AIProviderError {
  readonly code = "RESPONSE_FORMAT" as const
  readonly retryable = true
}

/**
 * Anything that doesn't fit a more specific category above. Not
 * retryable by default — an unrecognized failure mode shouldn't be
 * assumed transient; a provider that wants a specific unknown condition
 * retried should map it to a more specific category instead.
 */
export class AIUnknownError extends AIProviderError {
  readonly code = "UNKNOWN" as const
  readonly retryable = false
}
