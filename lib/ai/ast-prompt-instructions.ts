import "server-only"

import { CURRENT_AST_VERSION } from "@/lib/ast/schema"

/**
 * The database-design instructions every provider's prompt needs —
 * genuinely provider-agnostic content (what a `CanonicalSchemaAST` must
 * look like), not implementation detail. Extracted here (S5-002) so
 * `gemini-prompts.ts` and `anthropic-prompts.ts` share this text instead
 * of each maintaining their own copy — "no duplicated logic" applies to
 * prompt-engineering content, not just code. Each provider's own
 * `PromptBuilder` still decides its own *output-forcing* framing on top
 * of this (Gemini asks for raw JSON text; Anthropic forces a tool call —
 * see each provider's own prompt-builder module), since that part
 * genuinely does differ per provider's actual mechanism.
 */
export function buildSharedAstInstructions(): string {
  return [
    "You are a database design assistant for SchemaCraft AI. Given a short natural-language description of some data, design a schema for it and return it as a single JSON object matching the CanonicalSchemaAST structure defined by the response schema.",
    [
      "Database design rules:",
      "- Use snake_case for every table name and column name.",
      "- Every table needs a primary key: either a table-level primaryKey.columns entry, or exactly one column with primaryKey: true.",
      "- Model every foreign key as an entry in the top-level relationships array (sourceTable/sourceColumns/targetTable/targetColumns) — never leave a column implying a relationship without a matching entry.",
      '- Prefer a timestamp column (e.g. created_at) with a { kind: "now" } default on tables that represent real-world records.',
      "- If a numeric column clearly represents a price, an amount, a quantity, or an age (by its name or description), add a table-level constraint entry with kind \"check\" whose expression asserts that column is non-negative (e.g. { kind: \"check\", expression: \"price >= 0\" }). Only do this when the business meaning is unambiguous from the name/description — do not invent constraints for columns whose intent is unclear.",
      '- For a "string" column, set maxLength to a realistic width for what the column actually holds instead of leaving it unset: short identifier-like values (e.g. a slug, code, or abbreviation) should get a small maxLength around 50; short display values (e.g. a name or title) should get something around 150; only leave maxLength unset (it then defaults to 255) when you are unsure. Never use "string" with a large maxLength for genuinely long free text — use "text" instead, which has no length limit.',
      "- A column's `default` is optional. If present, `kind` must be exactly one of these five values — never any other word: " +
        '`"literal"` (a fixed value, with a `value` field holding that string/number/boolean/null — use this for any constant default, e.g. { kind: "literal", value: 0 }), ' +
        '`"now"` (current timestamp, no other fields), ' +
        '`"uuid"` (a generated UUID, no other fields — typical for a uuid-type primary key), ' +
        '`"autoincrement"` (a database-generated increasing integer, no other fields — typical for an integer-type primary key), or ' +
        '`"expression"` (a raw dialect-specific SQL expression string in an `expression` field, for cases the other four kinds don\'t cover).',
      `- Set astVersion to exactly "${CURRENT_AST_VERSION}".`,
    ].join("\n"),
  ].join("\n\n")
}
