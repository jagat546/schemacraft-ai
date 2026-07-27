import { describe, expect, it } from "vitest"

import { AIProviderRegistry, createAIProviderRegistry } from "@/lib/ai/provider-registry"
import type { AIProviderAdapter } from "@/lib/ai/providers/interface"

function fakeProvider(name: string): AIProviderAdapter {
  return {
    name,
    async generateAST() {
      throw new Error("not implemented in this fake")
    },
  }
}

describe("AIProviderRegistry", () => {
  it("resolves a provider registered by name", () => {
    const registry = new AIProviderRegistry()
    const provider = fakeProvider("test-provider")
    registry.register(provider)

    expect(registry.resolve("test-provider")).toBe(provider)
  })

  it("throws when registering two providers with the same name", () => {
    const registry = new AIProviderRegistry()
    registry.register(fakeProvider("dup"))

    expect(() => registry.register(fakeProvider("dup"))).toThrow(
      'An AI provider is already registered with name "dup".'
    )
  })

  it("throws when resolving a name that was never registered", () => {
    const registry = new AIProviderRegistry()
    registry.register(fakeProvider("known"))

    expect(() => registry.resolve("unknown")).toThrow(
      'No AI provider is registered with name "unknown".'
    )
  })

  it("list() returns every registered provider", () => {
    const registry = new AIProviderRegistry()
    const first = fakeProvider("first")
    const second = fakeProvider("second")
    registry.register(first)
    registry.register(second)

    expect(registry.list()).toEqual([first, second])
  })
})

describe("createAIProviderRegistry", () => {
  it("registers Gemini, Anthropic, and OpenAI, all resolvable by name", () => {
    const registry = createAIProviderRegistry()
    expect(registry.resolve("gemini").name).toBe("gemini")
    expect(registry.resolve("anthropic").name).toBe("anthropic")
    expect(registry.resolve("openai").name).toBe("openai")
  })

  it("constructing the registry never touches OpenAI's client -- registering it must not require OPENAI_API_KEY", () => {
    // Regression test: OpenAI's SDK constructor throws immediately when no
    // API key is configured (confirmed directly, unlike Gemini/Anthropic's
    // constructors). createAIProviderRegistry() registers every provider
    // on every call; this must never crash just because OPENAI_API_KEY is
    // unset in this environment (it is, in every environment today).
    expect(() => createAIProviderRegistry()).not.toThrow()
  })

  it("returns a fresh registry on every call, not a shared singleton", () => {
    const first = createAIProviderRegistry()
    const second = createAIProviderRegistry()
    expect(first).not.toBe(second)
  })
})
