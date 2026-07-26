import "server-only"

import { GoogleGenAI } from "@google/genai"
import Anthropic from "@anthropic-ai/sdk"

export const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY })

// S5-002: Anthropic's own raw SDK client, colocated with genAI above --
// this file is "the one small server-only module holding every raw AI
// SDK client instance," not Gemini-specific despite its original name.
export const anthropicClient = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
