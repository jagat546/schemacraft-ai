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
 */
import { createGeminiProvider } from "@/lib/ai/providers/gemini"
import type { AIProviderAdapter } from "@/lib/ai/providers/interface"

export class AIProviderRegistry {
  private readonly providers = new Map<string, AIProviderAdapter>()
  private defaultProviderName: string | undefined

  /**
   * Register a provider instance. The first provider registered becomes
   * the default automatically; pass `isDefault: true` to override that
   * for a later registration.
   */
  register(provider: AIProviderAdapter, options?: { isDefault?: boolean }): void {
    if (this.providers.has(provider.name)) {
      throw new Error(`An AI provider is already registered with name "${provider.name}".`)
    }
    this.providers.set(provider.name, provider)
    if (options?.isDefault || this.providers.size === 1) {
      this.defaultProviderName = provider.name
    }
  }

  /** Resolve a provider by name, or the registry's default when `name` is omitted. */
  resolve(name?: string): AIProviderAdapter {
    const key = name ?? this.defaultProviderName
    if (!key) {
      throw new Error("No AI provider is registered.")
    }
    const provider = this.providers.get(key)
    if (!provider) {
      throw new Error(`No AI provider is registered with name "${key}".`)
    }
    return provider
  }

  list(): AIProviderAdapter[] {
    return [...this.providers.values()]
  }
}

/**
 * Builds a fresh registry with every implemented provider registered —
 * today, just Gemini. S5-002/S5-003 register Anthropic/OpenAI here once
 * they exist; nothing else in the app needs to change to pick them up,
 * since `generation.service.ts` resolves its provider from this registry
 * rather than importing `geminiProvider` directly.
 */
export function createAIProviderRegistry(): AIProviderRegistry {
  const registry = new AIProviderRegistry()
  registry.register(createGeminiProvider(), { isDefault: true })
  return registry
}
