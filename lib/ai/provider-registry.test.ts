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

  it("the first registered provider becomes the default, resolved when no name is given", () => {
    const registry = new AIProviderRegistry()
    const first = fakeProvider("first")
    registry.register(first)
    registry.register(fakeProvider("second"))

    expect(registry.resolve()).toBe(first)
  })

  it("a later registration can override the default via isDefault", () => {
    const registry = new AIProviderRegistry()
    registry.register(fakeProvider("first"))
    const second = fakeProvider("second")
    registry.register(second, { isDefault: true })

    expect(registry.resolve()).toBe(second)
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

  it("throws when resolving the default on an empty registry", () => {
    const registry = new AIProviderRegistry()
    expect(() => registry.resolve()).toThrow("No AI provider is registered.")
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
  it("registers Gemini as the default provider", () => {
    const registry = createAIProviderRegistry()
    expect(registry.resolve().name).toBe("gemini")
    expect(registry.resolve("gemini").name).toBe("gemini")
  })

  it("registers Anthropic (S5-002) without making it the default", () => {
    const registry = createAIProviderRegistry()
    expect(registry.resolve("anthropic").name).toBe("anthropic")
    expect(registry.resolve().name).toBe("gemini")
  })

  it("returns a fresh registry on every call, not a shared singleton", () => {
    const first = createAIProviderRegistry()
    const second = createAIProviderRegistry()
    expect(first).not.toBe(second)
  })
})
