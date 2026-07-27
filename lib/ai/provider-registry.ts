/**
 * Registration and lookup for {@link AIProviderAdapter} instances —
 * the dependency-injection seam that lets `lib/services/generation.service.ts`
 * resolve a provider by name instead of importing a concrete
 * implementation module directly.
 *
 * Mirrors `lib/compiler/registry.ts`'s `CompilerRegistry` convention
 * deliberately: a small class doing register/resolve/list, wrapped in a
 * factory function that returns one pre-populated with every known
 * implementation. Like `createCompilerRegistry`, `createAIProviderRegistry`
 * is a factory, not a module-level singleton — importing this file has no
 * side effects; a registry only exists once something calls it.
 *
 * S5-004: this registry is deliberately a pure name -> instance lookup
 * table now, nothing more — it used to also track its own "default"
 * provider (first-registered, or an `isDefault` flag), but that made
 * "which provider is the fallback" a decision split across two places
 * (this file's registration order, and whatever selection logic a caller
 * layered on top). `lib/ai/provider-resolver.ts`'s `resolveAIProvider()`
 * is now the one place that owns the actual routing policy (explicit
 * choice -> `DEFAULT_AI_PROVIDER` env var -> Gemini); this registry just
 * answers "given a name, which provider is that."
 */
import { createAnthropicProvider } from "@/lib/ai/providers/anthropic"
import { createGeminiProvider } from "@/lib/ai/providers/gemini"
import type { AIProviderAdapter } from "@/lib/ai/providers/interface"
import { createOpenAIProvider } from "@/lib/ai/providers/openai"

export class AIProviderRegistry {
  private readonly providers = new Map<string, AIProviderAdapter>()

  /** Register a provider instance under its own `.name`. */
  register(provider: AIProviderAdapter): void {
    if (this.providers.has(provider.name)) {
      throw new Error(`An AI provider is already registered with name "${provider.name}".`)
    }
    this.providers.set(provider.name, provider)
  }

  /**
   * Resolve a provider by its exact registered name. Always requires a
   * name — see `resolveAIProvider()` (`lib/ai/provider-resolver.ts`) for
   * the routing/fallback policy layered on top of this lookup.
   */
  resolve(name: string): AIProviderAdapter {
    const provider = this.providers.get(name)
    if (!provider) {
      throw new Error(`No AI provider is registered with name "${name}".`)
    }
    return provider
  }

  list(): AIProviderAdapter[] {
    return [...this.providers.values()]
  }
}

/**
 * Builds a fresh registry with every implemented provider registered
 * (Gemini, Anthropic, OpenAI) — no provider is privileged as "the
 * default" here anymore; see this file's own top comment.
 */
export function createAIProviderRegistry(): AIProviderRegistry {
  const registry = new AIProviderRegistry()
  registry.register(createGeminiProvider())
  registry.register(createAnthropicProvider())
  registry.register(createOpenAIProvider())
  return registry
}
