import { describe, expect, it } from "vitest"

import { AIProviderRegistry } from "@/lib/ai/provider-registry"
import {
  DEFAULT_AI_PROVIDER_ENV_VAR,
  InvalidAIProviderConfigurationError,
  resolveAIProvider,
} from "@/lib/ai/provider-resolver"
import type { AIProviderAdapter } from "@/lib/ai/providers/interface"

function fakeProvider(name: string): AIProviderAdapter {
  return {
    name,
    async generateAST() {
      throw new Error("not implemented in this fake")
    },
  }
}

function testRegistry(): AIProviderRegistry {
  const registry = new AIProviderRegistry()
  registry.register(fakeProvider("gemini"))
  registry.register(fakeProvider("anthropic"))
  registry.register(fakeProvider("openai"))
  return registry
}

describe("resolveAIProvider", () => {
  it("falls back to Gemini when neither an explicit name nor the env var is set", () => {
    const registry = testRegistry()

    const provider = resolveAIProvider({}, { registry, env: {} })

    expect(provider.name).toBe("gemini")
  })

  it("selects the provider named by DEFAULT_AI_PROVIDER when no explicit name is given", () => {
    const registry = testRegistry()

    const provider = resolveAIProvider(
      {},
      { registry, env: { [DEFAULT_AI_PROVIDER_ENV_VAR]: "anthropic" } }
    )

    expect(provider.name).toBe("anthropic")
  })

  it("an explicit provider name takes priority over DEFAULT_AI_PROVIDER", () => {
    const registry = testRegistry()

    const provider = resolveAIProvider(
      { providerName: "openai" },
      { registry, env: { [DEFAULT_AI_PROVIDER_ENV_VAR]: "anthropic" } }
    )

    expect(provider.name).toBe("openai")
  })

  it("an explicit provider name is used even when DEFAULT_AI_PROVIDER is unset", () => {
    const registry = testRegistry()

    const provider = resolveAIProvider({ providerName: "anthropic" }, { registry, env: {} })

    expect(provider.name).toBe("anthropic")
  })

  it("throws InvalidAIProviderConfigurationError for an unknown explicit provider name", () => {
    const registry = testRegistry()

    expect(() => resolveAIProvider({ providerName: "not-a-real-provider" }, { registry, env: {} })).toThrow(
      InvalidAIProviderConfigurationError
    )
  })

  it("throws InvalidAIProviderConfigurationError for an unknown DEFAULT_AI_PROVIDER value", () => {
    const registry = testRegistry()

    expect(() =>
      resolveAIProvider({}, { registry, env: { [DEFAULT_AI_PROVIDER_ENV_VAR]: "bogus" } })
    ).toThrow(InvalidAIProviderConfigurationError)
  })

  it("the configuration error message lists the supported provider names", () => {
    const registry = testRegistry()

    try {
      resolveAIProvider({ providerName: "bogus" }, { registry, env: {} })
      expect.unreachable("resolveAIProvider should have thrown")
    } catch (error) {
      expect(error).toBeInstanceOf(InvalidAIProviderConfigurationError)
      expect((error as InvalidAIProviderConfigurationError).requestedProviderName).toBe("bogus")
      expect((error as Error).message).toContain("gemini")
      expect((error as Error).message).toContain("anthropic")
      expect((error as Error).message).toContain("openai")
    }
  })

  it("delegates the actual lookup to the registry -- resolving a valid but unregistered name still fails", () => {
    const emptyRegistry = new AIProviderRegistry()
    emptyRegistry.register(fakeProvider("gemini"))
    // "anthropic" is a known provider identifier but was never registered
    // on this particular registry instance -- the resolver's own name
    // validation passes, and the failure comes from the registry's own
    // lookup, not duplicated validation logic here.
    expect(() =>
      resolveAIProvider({ providerName: "anthropic" }, { registry: emptyRegistry, env: {} })
    ).toThrow('No AI provider is registered with name "anthropic".')
  })

  it("defaults to a fresh createAIProviderRegistry() when no registry is injected", () => {
    // Real providers, real registry -- but no real network call happens
    // (resolveAIProvider only looks the provider up, it never calls
    // generateAST), so this is safe without any API key configured.
    const provider = resolveAIProvider({}, { env: {} })
    expect(provider.name).toBe("gemini")
  })
})
