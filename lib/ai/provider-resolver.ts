/**
 * Centralized AI-provider selection (S5-004).
 *
 * Routing priority, exactly three tiers, no more:
 * 1. An explicit provider name passed by the caller (`input.providerName`).
 * 2. The `DEFAULT_AI_PROVIDER` environment variable.
 * 3. Gemini — the hardcoded final fallback.
 *
 * Deliberately out of scope, per this task's own boundary: automatic
 * failover, provider chaining, cross-provider retry, load balancing,
 * weighted routing, and cost-based routing. This resolves to exactly one
 * provider per call, once. If that provider then fails, that failure
 * surfaces exactly as it always has (an `AIGenerationResponse` with
 * `ok: false`) — nothing here catches that and tries a different
 * provider. Those are separate, future decisions, not a side effect of
 * this one.
 */
import { createAIProviderRegistry, type AIProviderRegistry } from "@/lib/ai/provider-registry"
import { AIProviderName, type AIProviderAdapter } from "@/lib/ai/providers/interface"

/** Name of the environment variable read for tier 2 of the routing priority. */
export const DEFAULT_AI_PROVIDER_ENV_VAR = "DEFAULT_AI_PROVIDER"

const KNOWN_PROVIDER_NAMES: readonly string[] = Object.values(AIProviderName)

/**
 * Thrown when a requested provider name (from either the caller or
 * `DEFAULT_AI_PROVIDER`) isn't one of the known, registered provider
 * identifiers. A configuration error, not an `AIProviderError` — this is
 * "the request never named a real provider," categorically different
 * from "a real provider's call failed," which is what the
 * `AIProviderError` hierarchy (`lib/ai/errors.ts`) models.
 */
export class InvalidAIProviderConfigurationError extends Error {
  readonly requestedProviderName: string

  constructor(requestedProviderName: string) {
    super(
      `Unknown AI provider "${requestedProviderName}". Supported providers: ${KNOWN_PROVIDER_NAMES.join(", ")}.`
    )
    this.name = "InvalidAIProviderConfigurationError"
    this.requestedProviderName = requestedProviderName
  }
}

export interface ResolveAIProviderInput {
  /** Explicit provider name requested by the caller — the highest-priority routing rule. */
  providerName?: string
}

/** Dependencies for {@link resolveAIProvider}, both optional and defaulted — reusable and independently testable. */
export interface AIProviderResolverDependencies {
  /** Defaults to a fresh `createAIProviderRegistry()`. */
  registry?: AIProviderRegistry
  /** Defaults to `process.env`. Injectable so env-var routing is testable without mutating real process env. */
  env?: Partial<Record<string, string | undefined>>
}

/**
 * Selects and resolves exactly one {@link AIProviderAdapter}, per the
 * three-tier routing priority described in this file's own top comment.
 * Throws {@link InvalidAIProviderConfigurationError} if the resolved name
 * (from either tier 1 or tier 2) isn't one of `gemini`/`anthropic`/`openai`
 * — never silently falls back past an explicitly-wrong configuration.
 */
export function resolveAIProvider(
  input: ResolveAIProviderInput = {},
  deps: AIProviderResolverDependencies = {}
): AIProviderAdapter {
  const registry = deps.registry ?? createAIProviderRegistry()
  const env = deps.env ?? process.env

  const requestedName = input.providerName ?? env[DEFAULT_AI_PROVIDER_ENV_VAR] ?? AIProviderName.Gemini

  if (!KNOWN_PROVIDER_NAMES.includes(requestedName)) {
    throw new InvalidAIProviderConfigurationError(requestedName)
  }

  return registry.resolve(requestedName)
}
