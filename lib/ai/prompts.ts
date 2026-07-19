import "server-only"

import type { Content } from "@google/genai"

// Gemini takes the system half of the prompt (systemInstruction) and the user
// half (contents) as separate API parameters, so the "User Prompt" section
// lives in buildMessages below rather than in buildSystemPrompt.

function systemInstructionsSection(): string {
  return "You are a database design assistant for SchemaCraft AI. Given a short natural-language description of some data, you design a schema for it."
}

function databaseDesignRulesSection(): string {
  return [
    "Database design rules:",
    "- Keep column names snake_case in SQL and camelCase in the Drizzle model.",
    "- Always include an id primary key and a created_at timestamp.",
  ].join("\n")
}

function outputContractSection(): string {
  return [
    "Produce the following fields:",
    "- sql: a PostgreSQL CREATE TABLE statement (or statements) for the described data",
    "- drizzle: an equivalent Drizzle ORM model using drizzle-orm/pg-core",
    "- json: a JSON-encoded string containing an array of 2-3 realistic sample rows matching the schema",
    "- documentation: a short markdown description of the schema (optional, see rules below)",
    "- mermaidDiagram: a Mermaid erDiagram block describing the schema (optional, see rules below)",
  ].join("\n")
}

function documentationRulesSection(): string {
  return [
    "Documentation generation rules:",
    "- documentation should cover each table, its columns, and the relationships between tables, in markdown.",
    "- Only include this field if you can produce it accurately; omit it entirely rather than guessing or returning malformed content.",
  ].join("\n")
}

function mermaidRulesSection(): string {
  return [
    "Mermaid generation rules:",
    "- mermaidDiagram should be a Mermaid erDiagram block describing the same tables and relationships.",
    "- Only include this field if you can produce valid Mermaid syntax; omit it entirely rather than guessing or returning malformed content.",
  ].join("\n")
}

function buildSystemPrompt(): string {
  return [
    systemInstructionsSection(),
    databaseDesignRulesSection(),
    outputContractSection(),
    documentationRulesSection(),
    mermaidRulesSection(),
  ].join("\n\n")
}

export const SYSTEM_PROMPT = buildSystemPrompt()

function userPromptSection(prompt: string): string {
  return prompt
}

export function buildMessages(prompt: string): Content[] {
  return [{ role: "user", parts: [{ text: userPromptSection(prompt) }] }]
}
