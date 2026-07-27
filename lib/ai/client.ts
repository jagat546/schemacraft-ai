import "server-only"

import { GoogleGenAI } from "@google/genai"
import Anthropic from "@anthropic-ai/sdk"
import OpenAI from "openai"

// Every client below is constructed lazily (on first call, then cached),
// not as an eager module-level singleton. Found necessary, not
// theoretical: OpenAI's SDK constructor validates that an API key is
// present and throws immediately if one isn't (confirmed directly --
// `new OpenAI({ apiKey: undefined })` throws "Missing credentials..." at
// construction time, unlike GoogleGenAI/Anthropic's constructors, which
// both let a missing key through and only fail once a real request is
// made). Since `AIProviderRegistry` registers every implemented provider
// on every call (`createAIProviderRegistry()`, called fresh per
// generation by `generation.service.ts`), an eager `openaiClient` would
// crash every single generation -- including ones that only ever use
// Gemini -- in any environment without OPENAI_API_KEY set, which is
// every environment today (no OpenAI key has been provisioned). Each
// `createXProvider()` factory correspondingly defers calling its getter
// until `generateAST()` actually runs, not at factory-construction time
// -- registering a provider must never have this kind of side effect.

let cachedGenAI: GoogleGenAI | undefined
export function getGenAIClient(): GoogleGenAI {
  cachedGenAI ??= new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY })
  return cachedGenAI
}

let cachedAnthropicClient: Anthropic | undefined
export function getAnthropicClient(): Anthropic {
  cachedAnthropicClient ??= new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  return cachedAnthropicClient
}

let cachedOpenAIClient: OpenAI | undefined
export function getOpenAIClient(): OpenAI {
  cachedOpenAIClient ??= new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  return cachedOpenAIClient
}
