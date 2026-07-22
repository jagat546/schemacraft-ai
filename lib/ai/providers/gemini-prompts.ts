import "server-only"

import type { Content } from "@google/genai"

import { CURRENT_AST_VERSION } from "@/lib/ast/schema"

// Gemini-specific prompt construction for AST generation. This replaces
// the old lib/ai/prompts.ts, which asked the model to produce SQL,
// Drizzle, JSON, docs, and a Mermaid diagram directly in one response —
// that contract no longer exists. The model's only job now is to
// produce a single CanonicalSchemaAST; every other artifact is compiled
// from it deterministically (see lib/compiler).
//
// Lives under lib/ai/providers/ rather than lib/ai/ because prompt
// construction is a provider implementation detail, not a shared
// concern — a future non-Gemini provider would build its own prompt in
// its own shape (e.g. a Chat Completions message array), not reuse this.

function systemInstructionsSection(): string {
  return "You are a database design assistant for SchemaCraft AI. Given a short natural-language description of some data, design a schema for it and return it as a single JSON object matching the CanonicalSchemaAST structure defined by the response schema."
}

function databaseDesignRulesSection(): string {
  return [
    "Database design rules:",
    "- Use snake_case for every table name and column name.",
    "- Every table needs a primary key: either a table-level primaryKey.columns entry, or exactly one column with primaryKey: true.",
    "- Model every foreign key as an entry in the top-level relationships array (sourceTable/sourceColumns/targetTable/targetColumns) — never leave a column implying a relationship without a matching entry.",
    '- Prefer a timestamp column (e.g. created_at) with a { kind: "now" } default on tables that represent real-world records.',
    "- A column's `default` is optional. If present, `kind` must be exactly one of these five values — never any other word: " +
      '`"literal"` (a fixed value, with a `value` field holding that string/number/boolean/null — use this for any constant default, e.g. { kind: "literal", value: 0 }), ' +
      '`"now"` (current timestamp, no other fields), ' +
      '`"uuid"` (a generated UUID, no other fields — typical for a uuid-type primary key), ' +
      '`"autoincrement"` (a database-generated increasing integer, no other fields — typical for an integer-type primary key), or ' +
      '`"expression"` (a raw dialect-specific SQL expression string in an `expression` field, for cases the other four kinds don\'t cover).',
    `- Set astVersion to exactly "${CURRENT_AST_VERSION}".`,
  ].join("\n")
}

function outputContractSection(): string {
  return "Return only the CanonicalSchemaAST JSON object — no explanation, no markdown formatting, no text outside the JSON."
}

function buildSystemPrompt(): string {
  return [systemInstructionsSection(), databaseDesignRulesSection(), outputContractSection()].join(
    "\n\n"
  )
}

export const AST_SYSTEM_PROMPT = buildSystemPrompt()

export function buildAstMessages(prompt: string): Content[] {
  return [{ role: "user", parts: [{ text: prompt }] }]
}
